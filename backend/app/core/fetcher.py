"""
OpenQuant - 数据获取模块
从东方财富获取历史K线数据
"""

import requests
import pandas as pd
from typing import List, Dict, Optional
from datetime import datetime


class Fetcher:
    """数据获取器 - 东方财富数据源"""
    
    # 东方财富API端点
    EASTMONEY_KLINE_API = "https://push2his.eastmoney.com/api/qt/stock/kline/get"
    
    # 市场代码映射
    MARKET_MAP = {
        'sh': '1',  # 上海
        'sz': '0',  # 深圳
        'bj': '0',  # 北京（使用深圳代码）
    }
    
    @staticmethod
    def get_market_code(symbol: str) -> str:
        """获取市场代码"""
        # 判断市场
        if symbol.startswith('6') or symbol.startswith('5') or symbol.startswith('11'):
            return '1'  # 上海
        else:
            return '0'  # 深圳
    
    @staticmethod
    def normalize_symbol(symbol: str) -> str:
        """标准化股票代码"""
        # 移除可能的前缀
        symbol = symbol.lower().replace('sh', '').replace('sz', '').replace('bj', '')
        return symbol
    
    @classmethod
    def get_kline_data(
        cls,
        symbol: str,
        start_date: str,
        end_date: str,
        period: str = '101',  # 101=日, 102=周, 103=月
        adjust: str = '1'     # 1=前复权, 2=后复权, 0=不复权
    ) -> List[Dict]:
        """
        获取K线数据
        
        Args:
            symbol: 股票代码 (如: 600519)
            start_date: 开始日期 (YYYY-MM-DD)
            end_date: 结束日期 (YYYY-MM-DD)
            period: K线周期 (101=日, 102=周, 103=月)
            adjust: 复权方式 (1=前复权, 2=后复权, 0=不复权)
        
        Returns:
            List[Dict]: K线数据列表，每项包含 date, open, high, low, close, volume
        """
        symbol = cls.normalize_symbol(symbol)
        market_code = cls.get_market_code(symbol)
        secid = f"{market_code}.{symbol}"
        
        params = {
            'secid': secid,
            'ut': 'fa5fd1943c7b386f172d6893dbfba10b',
            'fields1': 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13',
            'fields2': 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
            'klt': period,
            'fqt': adjust,
            'beg': start_date.replace('-', ''),
            'end': end_date.replace('-', ''),
            'lmt': 1000,  # 最多获取1000条
        }
        
        try:
            response = requests.get(cls.EASTMONEY_KLINE_API, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            if data.get('data') is None or data['data'].get('klines') is None:
                return []
            
            klines = data['data']['klines']
            result = []
            
            for line in klines:
                # 数据格式: "日期,开盘价,收盘价,最低价,最高价,成交量,成交额,振幅,涨跌幅,涨跌额,换手率"
                parts = line.split(',')
                if len(parts) >= 6:
                    result.append({
                        'date': parts[0],
                        'open': float(parts[1]),
                        'close': float(parts[2]),
                        'low': float(parts[3]),
                        'high': float(parts[4]),
                        'volume': float(parts[5]),
                        'amount': float(parts[6]) if len(parts) > 6 else 0,
                        'amplitude': float(parts[7]) if len(parts) > 7 else 0,
                        'change_pct': float(parts[8]) if len(parts) > 8 else 0,
                        'change': float(parts[9]) if len(parts) > 9 else 0,
                        'turnover': float(parts[10]) if len(parts) > 10 else 0,
                        'symbol': symbol
                    })
            
            return result
            
        except Exception as e:
            print(f"Error fetching data for {symbol}: {e}")
            return []
    
    @classmethod
    def get_stock_name(cls, symbol: str) -> str:
        """获取股票名称"""
        symbol = cls.normalize_symbol(symbol)
        market_code = cls.get_market_code(symbol)
        secid = f"{market_code}.{symbol}"
        
        try:
            url = "https://push2.eastmoney.com/api/qt/stock/get"
            params = {
                'secid': secid,
                'ut': 'fa5fd1943c7b386f172d6893dbfba10b',
                'fields': 'f43,f44,f45,f46,f47,f48,f57,f58,f60',
            }
            
            response = requests.get(url, params=params, timeout=10)
            data = response.json()
            
            if data.get('data'):
                return data['data'].get('f58', symbol)
            return symbol
        except:
            return symbol


# 全局fetcher实例
fetcher = Fetcher()
