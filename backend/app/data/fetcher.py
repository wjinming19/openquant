#!/usr/bin/env python3
"""
OpenQuant - 修复版数据获取模块
使用多数据源策略，确保数据可用性
"""

import requests
import json
import os
import akshare as ak
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from app.core.config import settings
from app.data.local_stock_data import local_stock_data

class DataFetcher:
    """数据获取器 - 多数据源容错"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        })
        self._stock_names_cache = None
        self.TUSHARE_TOKEN = "207a3e3e4106e0afe2acc6c15cb26bea6092045c135e6c703614d8e9"
    
    def _load_stock_names(self):
        """加载股票名称映射"""
        if self._stock_names_cache is not None:
            return self._stock_names_cache
        
        try:
            payload = {
                "api_name": "stock_basic",
                "token": self.TUSHARE_TOKEN,
                "params": {"exchange": "", "list_status": "L"},
                "fields": "ts_code,name"
            }
            resp = self.session.post("https://api.tushare.pro", json=payload, timeout=30)
            data = resp.json()
            
            if data.get("data") and data["data"].get("items"):
                self._stock_names_cache = {item[0]: item[1] for item in data["data"]["items"]}
                print(f"✅ 加载 {len(self._stock_names_cache)} 只股票名称")
                return self._stock_names_cache
        except Exception as e:
            print(f"加载股票名称失败: {e}")
        
        return {}
    
    def _get_stock_name(self, ts_code: str) -> str:
        """获取股票名称"""
        names = self._load_stock_names()
        return names.get(ts_code, ts_code.split('.')[0])
    
    def get_a_share_kline(self, symbol: str, days: int = 60) -> Optional[List[Dict]]:
        """获取A股K线数据 - 优先使用AKShare"""
        # 尝试AKShare获取
        try:
            start_date = (datetime.now() - timedelta(days=days*2)).strftime("%Y%m%d")
            df = ak.stock_zh_a_hist(symbol=symbol, period="daily", 
                                    start_date=start_date, adjust="qfq")
            
            if df is not None and len(df) > 0:
                df = df.tail(days)
                result = []
                for _, row in df.iterrows():
                    result.append({
                        'date': row['日期'] if '日期' in row else str(row.name)[:10],
                        'open': float(row['开盘']),
                        'close': float(row['收盘']),
                        'low': float(row['最低']),
                        'high': float(row['最高']),
                        'volume': float(row['成交量']),
                        'amount': float(row['成交额']) if '成交额' in row else 0,
                        'change_pct': float(row['涨跌幅']) if '涨跌幅' in row else 0
                    })
                print(f"✅ AKShare获取成功: {symbol}, {len(result)}条数据")
                return result
        except Exception as e:
            print(f"AKShare获取失败: {e}")
        
        # 回退到本地数据
        try:
            return local_stock_data.get_kline(symbol, days)
        except Exception as e:
            print(f"本地数据获取失败: {e}")
        
        return None
    
    def get_hk_stock_data(self, symbol: str, days: int = 60) -> Optional[List[Dict]]:
        """获取港股数据"""
        try:
            import yfinance as yf
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period=f'{days}d')
            
            if hist is not None and len(hist) > 0:
                result = []
                for index, row in hist.iterrows():
                    result.append({
                        'date': index.strftime('%Y-%m-%d'),
                        'open': float(row['Open']),
                        'high': float(row['High']),
                        'low': float(row['Low']),
                        'close': float(row['Close']),
                        'volume': float(row['Volume']),
                        'amount': 0
                    })
                return result
        except Exception as e:
            print(f"港股获取失败: {e}")
        return None
    
    def get_market_sentiment(self) -> Optional[Dict]:
        """获取大盘情绪数据 - 使用腾讯API"""
        try:
            # 使用腾讯API获取指数
            url = "https://qt.gtimg.cn/q=sh000001,sz399001,sz399006,sh000300"
            resp = self.session.get(url, timeout=10)
            resp.encoding = 'gb2312'
            
            lines = resp.text.strip().split(';')
            total_amount = 0
            index_change = 0
            index_price = 0
            
            for line in lines:
                if not line or '=""' in line:
                    continue
                try:
                    parts = line.split('="')[1].strip('"').split('~')
                    if len(parts) >= 35:
                        # 成交额在字段37
                        if len(parts) > 37 and parts[37]:
                            vp = parts[37].split('/')
                            if len(vp) >= 2:
                                total_amount += float(vp[1])
                        # 涨跌幅在字段5
                        if line.startswith('v_sh000001'):
                            index_change = float(parts[5])
                            index_price = float(parts[3])
                except:
                    continue
            
            return {
                'temperature': 50 + int(index_change),  # 简化计算
                'total_amount': total_amount,
                'limit_up': 0,
                'limit_down': 0,
                'advance': 0,
                'decline': 0,
                'advance_ratio': 0.5,
                'status': '震荡行情' if abs(index_change) < 1 else ('上涨' if index_change > 0 else '下跌'),
                'index_change': index_change,
                'index_price': index_price,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            print(f"获取市场情绪失败: {e}")
        
        # 返回默认数据
        return {
            'temperature': 50,
            'total_amount': 0,
            'limit_up': 0,
            'limit_down': 0,
            'advance': 0,
            'decline': 0,
            'advance_ratio': 0.5,
            'status': '数据获取中',
            'index_change': 0,
            'index_price': 0,
            'timestamp': datetime.now().isoformat()
        }
    
    def get_stock_rankings(self, rank_type: str = "rise", limit: int = 50) -> List[Dict]:
        """获取股票排行榜 - 使用Tushare获取全市场数据"""
        TUSHARE_TOKEN = "207a3e3e4106e0afe2acc6c15cb26bea6092045c135e6c703614d8e9"
        
        try:
            # 尝试获取最近有数据的交易日（今天或昨天）
            for day_offset in [0, -1, -2, -3]:
                trade_date = (datetime.now() + timedelta(days=day_offset)).strftime("%Y%m%d")
                payload = {
                    "api_name": "daily",
                    "token": TUSHARE_TOKEN,
                    "params": {"trade_date": trade_date},
                    "fields": "ts_code,open,high,low,close,pre_close,change,pct_chg,vol,amount"
                }
                
                resp = self.session.post("https://api.tushare.pro", json=payload, timeout=60)
                data = resp.json()
                
                if data.get("data") and data["data"].get("items"):
                    print(f"✅ Tushare数据日期: {trade_date}, 共 {len(data['data']['items'])} 只股票")
                    break
            else:
                print("Tushare: 最近4天都无数据")
                raise Exception("无数据")
            
            if data.get("data") and data["data"].get("items"):
                items = data["data"]["items"]
                all_data = []
                
                for item in items:
                    try:
                        ts_code = item[0]  # 如: 600519.SH
                        symbol = ts_code.split('.')[0]  # 提取: 600519
                        price = float(item[4]) if item[4] else 0  # close
                        change_pct = float(item[7]) if item[7] else 0  # pct_chg (索引7，不是8)
                        volume = float(item[8]) if item[8] else 0  # vol (索引8，不是9)
                        amount = float(item[9]) if item[9] else 0  # amount (索引9，不是10)
                        
                        # 过滤异常数据（涨跌幅超过20%可能是新股或异常）
                        if abs(change_pct) > 20:
                            continue
                        
                        # 获取股票名称（从ts_code映射）
                        name = self._get_stock_name(ts_code)
                        
                        all_data.append({
                            'symbol': symbol,
                            'name': name,  # 获取实际股票名称
                            'price': round(price, 2),
                            'change_pct': round(change_pct, 2),
                            'volume': int(volume * 100),  # 手转股
                            'amount': round(amount / 10000, 2),  # 万元
                            'turnover': 0,  # Tushare日线不提供换手率
                            'industry': '-'
                        })
                    except Exception as e:
                        # 打印错误以便调试
                        print(f"处理股票数据出错: {e}, item: {item}")
                        continue
                
                # 排序
                if rank_type == "rise":
                    all_data.sort(key=lambda x: x['change_pct'], reverse=True)
                elif rank_type == "fall":
                    all_data.sort(key=lambda x: x['change_pct'])
                elif rank_type == "volume":
                    all_data.sort(key=lambda x: x['volume'], reverse=True)
                elif rank_type == "turnover":
                    all_data.sort(key=lambda x: x['amount'], reverse=True)
                
                # 添加排名并限制数量
                result = all_data[:limit]
                for i, item in enumerate(result):
                    item['rank'] = i + 1
                
                print(f"✅ Tushare获取成功: {len(result)} 只股票")
                return result
            else:
                print(f"Tushare返回无数据: {data.get('msg', 'Unknown')}")
        except Exception as e:
            print(f"Tushare获取失败: {e}")
        
        # 降级到本地模拟数据
        print("使用本地数据作为备用")
        return local_stock_data.get_rankings(rank_type, limit)
    
    def get_market_indices(self) -> List[Dict]:
        """获取市场指数 - 使用腾讯API"""
        try:
            url = "https://qt.gtimg.cn/q=sh000001,sz399001,sz399006,sh000300,sz399905"
            resp = self.session.get(url, timeout=10)
            resp.encoding = 'gb2312'
            
            indices = []
            index_names = {
                '000001': '上证指数',
                '399001': '深证成指',
                '399006': '创业板指',
                '000300': '沪深300',
                '399905': '中证500'
            }
            
            for line in resp.text.strip().split(';'):
                if not line or '=""' in line:
                    continue
                try:
                    parts = line.split('="')[1].strip('"').split('~')
                    if len(parts) < 35:
                        continue
                    
                    symbol = parts[2]
                    name = index_names.get(symbol, parts[1])
                    price = float(parts[3])
                    prev = float(parts[4])
                    change_pct = round((price - prev) / prev * 100, 2) if prev else 0
                    change_amount = round(price - prev, 2)
                    
                    indices.append({
                        'symbol': symbol,
                        'name': name,
                        'price': price,
                        'change_pct': change_pct,
                        'change_amount': change_amount,
                        'volume': 0,
                        'amount': 0
                    })
                except:
                    continue
            
            return indices
        except Exception as e:
            print(f"获取指数失败: {e}")
            return []
    
    def get_stock_info(self, symbol: str) -> Optional[Dict]:
        """获取股票详细信息"""
        try:
            # 使用AKShare获取基本信息
            stock_info = ak.stock_individual_info_em(symbol=symbol)
            if stock_info is not None and len(stock_info) > 0:
                info_dict = dict(zip(stock_info['item'], stock_info['value']))
                return {
                    'symbol': symbol,
                    'name': info_dict.get('股票简称', '-'),
                    'industry': info_dict.get('行业', '-'),
                    'market_cap': float(info_dict.get('总市值', 0)) if info_dict.get('总市值') else 0,
                    'pe': float(info_dict.get('市盈率', 0)) if info_dict.get('市盈率') else None,
                    'pb': float(info_dict.get('市净率', 0)) if info_dict.get('市净率') else None,
                    'roe': None,  # AKShare不直接提供
                    'eps': None,
                    'bps': None,
                    'total_shares': float(info_dict.get('总股本', 0)) if info_dict.get('总股本') else 0,
                    'float_shares': float(info_dict.get('流通股', 0)) if info_dict.get('流通股') else 0
                }
        except Exception as e:
            print(f"获取股票信息失败: {e}")
        
        # 返回基础信息
        return {
            'symbol': symbol,
            'name': '-',
            'industry': '-',
            'market_cap': 0,
            'pe': None,
            'pb': None,
            'roe': None,
            'eps': None,
            'bps': None
        }
    
    def get_stock_news(self, symbol: str, limit: int = 10) -> List[Dict]:
        """获取股票相关新闻"""
        try:
            news = ak.stock_news_em(symbol=symbol)
            if news is not None and len(news) > 0:
                result = []
                for _, row in news.head(limit).iterrows():
                    result.append({
                        'title': row.get('标题', ''),
                        'content': row.get('内容', '')[:200] + '...' if len(row.get('内容', '')) > 200 else row.get('内容', ''),
                        'source': row.get('来源', ''),
                        'time': row.get('发布时间', ''),
                        'url': row.get('链接', '')
                    })
                return result
        except Exception as e:
            print(f"获取新闻失败: {e}")
        return []

# 全局实例
data_fetcher = DataFetcher()
