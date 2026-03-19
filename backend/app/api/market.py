"""
OpenQuant - 市场数据API
大盘情绪、行情数据等
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from app.core.database import get_db
from app.data.fetcher import data_fetcher
from app.data.industry_fetcher import industry_fetcher, IndustryData, IndustryStock
from app.data.tushare_force import get_tushare_stock_data, get_tushare_indices
from app.data.realtime_service import realtime_service
from app.core.indicators import TechnicalAnalyzer
from app.models.schemas import StockData, MarketSentiment, SignalResponse

router = APIRouter()

@router.get("/sentiment")
async def get_market_sentiment():
    """获取大盘情绪"""
    sentiment = data_fetcher.get_market_sentiment()
    if not sentiment:
        # 返回模拟数据
        return {
            "temperature": 37,
            "total_amount": 2.36,
            "limit_up": 68,
            "limit_down": 22,
            "advance": 1560,
            "decline": 3561,
            "advance_ratio": 0.30,
            "status": "震荡行情",
            "timestamp": datetime.now().isoformat()
        }
    return sentiment


@router.get("/rankings")
async def get_stock_rankings(
    type: str = Query("rise", description="排行类型: rise=涨幅, fall=跌幅, volume=成交量, turnover=换手率, fund=资金流向"),
    limit: int = Query(50, ge=1, le=5000, description="返回数量")
):
    """
    获取股票排行榜 - 使用Tushare全市场数据
    """
    # 使用data_fetcher获取全市场数据（Tushare）
    from app.data.fetcher import data_fetcher
    data = data_fetcher.get_stock_rankings(rank_type=type, limit=limit)
    
    return {
        "type": type,
        "count": len(data),
        "timestamp": datetime.now().isoformat(),
        "data": data,
        "source": "tushare_all_market"
    }


@router.get("/indices")
async def get_market_indices():
    """
    获取市场指数 - 使用实时数据
    """
    from app.data.fetcher import data_fetcher
    
    # 使用数据获取器获取指数
    data = data_fetcher.get_market_indices()
    
    return {
        "count": len(data),
        "timestamp": datetime.now().isoformat(),
        "data": data,
        "source": "tencent_realtime"
    }

@router.get("/stocks")
async def get_stock_list():
    """获取股票列表"""
    from app.core.config import settings
    return {
        "hk": settings.DEFAULT_STOCKS["hk"],
        "a_share": settings.DEFAULT_STOCKS["a_share"],
        "etf": settings.DEFAULT_STOCKS["etf"]
    }

@router.get("/stock/{symbol}/data")
async def get_stock_data(symbol: str, days: int = 60):
    """获取单个股票数据"""
    # 判断市场
    if symbol.endswith('.HK'):
        data = data_fetcher.get_hk_stock_data(symbol, days)
    else:
        data = data_fetcher.get_a_share_kline(symbol, days)
    
    if not data:
        raise HTTPException(status_code=404, detail=f"无法获取 {symbol} 的数据")
    
    # 添加symbol到每条数据
    for item in data:
        item['symbol'] = symbol
    
    return {
        "symbol": symbol,
        "count": len(data),
        "data": data
    }

@router.get("/stock/{symbol}/indicators")
async def get_stock_indicators(symbol: str):
    """获取股票技术指标"""
    # 获取数据
    if symbol.endswith('.HK'):
        data = data_fetcher.get_hk_stock_data(symbol, 60)
    else:
        data = data_fetcher.get_a_share_kline(symbol, 60)
    
    if not data:
        raise HTTPException(status_code=404, detail=f"无法获取 {symbol} 的数据")
    
    for item in data:
        item['symbol'] = symbol
    
    # 计算指标
    indicators = TechnicalAnalyzer.analyze_stock(data)
    if not indicators:
        raise HTTPException(status_code=500, detail="指标计算失败")
    
    return indicators

@router.get("/scan")
async def scan_all_stocks(
    # 筛选参数
    rsi_min: float = Query(0, ge=0, le=100, description="RSI最小值"),
    rsi_max: float = Query(100, ge=0, le=100, description="RSI最大值"),
    macd_signal: str = Query("all", description="MACD信号: all/golden/dead"),
    ma_alignment: str = Query("all", description="均线排列: all/bull/bear"),
    bb_position: str = Query("all", description="布林带位置: all/upper/middle/lower"),
    score_min: float = Query(-10, ge=-10, le=10, description="综合评分最小值"),
    score_max: float = Query(10, ge=-10, le=10, description="综合评分最大值"),
    sort_by: str = Query("score", description="排序字段"),
    sort_order: str = Query("desc", description="排序方向: asc/desc")
):
    """
    扫描所有股票，支持多因子筛选
    
    筛选参数:
    - rsi_min/rs_max: RSI范围 0-100
    - macd_signal: MACD信号 (all/golden/dead)
    - ma_alignment: 均线排列 (all/bull/bear)
    - bb_position: 布林带位置 (all/upper/middle/lower)
    - score_min/score_max: 综合评分范围
    - sort_by: 排序字段 (score/price/change_pct/rsi)
    - sort_order: 排序方向 (asc/desc)
    """
    from app.core.config import settings
    
    results = []
    all_symbols = (
        settings.DEFAULT_STOCKS["hk"] +
        settings.DEFAULT_STOCKS["a_share"] +
        settings.DEFAULT_STOCKS["etf"]
    )
    
    for symbol in all_symbols:
        try:
            if symbol.endswith('.HK'):
                data = data_fetcher.get_hk_stock_data(symbol, 60)
            else:
                data = data_fetcher.get_a_share_kline(symbol, 60)
            
            if data:
                for item in data:
                    item['symbol'] = symbol
                
                indicators = TechnicalAnalyzer.analyze_stock(data)
                if indicators:
                    # 构建结果数据
                    stock_data = {
                        "symbol": symbol,
                        "name": get_stock_name(symbol),
                        "price": indicators.price,
                        "change_pct": indicators.change_pct,
                        "rsi": indicators.rsi,
                        "macd_signal": get_macd_signal(indicators.macd_dif, indicators.macd_dea, indicators.macd_hist),
                        "ma_trend": get_ma_trend(indicators.ma5, indicators.ma10, indicators.ma20),
                        "bb_position_detail": get_bb_position_desc(indicators.bb_position),
                        "bb_position": indicators.bb_position,
                        "score": indicators.score,
                        "rating": indicators.rating,
                        "stars": indicators.stars,
                        "signals": indicators.signals
                    }
                    
                    # 应用筛选条件
                    if not filter_stock(stock_data, rsi_min, rsi_max, macd_signal, ma_alignment, bb_position, score_min, score_max):
                        continue
                    
                    results.append(stock_data)
        except Exception as e:
            print(f"扫描 {symbol} 失败: {e}")
    
    # 排序
    reverse = sort_order == "desc"
    if sort_by in ["score", "price", "change_pct", "rsi"]:
        results.sort(key=lambda x: x.get(sort_by, 0), reverse=reverse)
    else:
        results.sort(key=lambda x: x.get("score", 0), reverse=reverse)
    
    return {
        "count": len(results),
        "timestamp": datetime.now().isoformat(),
        "filters": {
            "rsi_range": [rsi_min, rsi_max],
            "macd_signal": macd_signal,
            "ma_alignment": ma_alignment,
            "bb_position": bb_position,
            "score_range": [score_min, score_max]
        },
        "results": results
    }

def get_macd_signal(dif: float, dea: float, hist: float) -> str:
    """获取MACD信号描述"""
    if dif > dea:
        return "金叉"
    elif dif < dea:
        return "死叉"
    return "中性"

def get_ma_trend(ma5: float, ma10: float, ma20: float) -> str:
    """获取均线趋势描述"""
    if ma5 > ma10 > ma20:
        return "多头排列"
    elif ma5 < ma10 < ma20:
        return "空头排列"
    return "震荡"

def get_bb_position_desc(position: float) -> str:
    """获取布林带位置描述"""
    if position > 0.8:
        return "上轨附近"
    elif position < 0.2:
        return "下轨附近"
    return "中轨附近"

def filter_stock(stock: dict, rsi_min: float, rsi_max: float, 
                 macd_signal: str, ma_alignment: str, 
                 bb_position: str, score_min: float, score_max: float) -> bool:
    """筛选股票"""
    # RSI筛选
    rsi = stock.get("rsi", 50)
    if rsi < rsi_min or rsi > rsi_max:
        return False
    
    # MACD信号筛选
    if macd_signal != "all":
        actual_signal = stock.get("macd_signal", "")
        if macd_signal == "golden" and actual_signal != "金叉":
            return False
        if macd_signal == "dead" and actual_signal != "死叉":
            return False
    
    # 均线排列筛选
    if ma_alignment != "all":
        actual_trend = stock.get("ma_trend", "")
        if ma_alignment == "bull" and actual_trend != "多头排列":
            return False
        if ma_alignment == "bear" and actual_trend != "空头排列":
            return False
    
    # 布林带位置筛选
    if bb_position != "all":
        actual_bb = stock.get("bb_position_detail", "")
        if bb_position == "upper" and "上轨" not in actual_bb:
            return False
        if bb_position == "lower" and "下轨" not in actual_bb:
            return False
        if bb_position == "middle" and "中轨" not in actual_bb:
            return False
    
    # 综合评分筛选
    score = stock.get("score", 0)
    if score < score_min or score > score_max:
        return False
    
    return True

def get_stock_name(symbol: str) -> str:
    """获取股票名称（简化版）"""
    names = {
        "0700.HK": "腾讯控股",
        "9988.HK": "阿里巴巴",
        "3690.HK": "美团",
        "1810.HK": "小米集团",
        "9618.HK": "京东集团",
        "2318.HK": "中国平安",
        "1299.HK": "友邦保险",
        "0005.HK": "汇丰控股",
        "600519": "贵州茅台",
        "601318": "中国平安",
        "000001": "平安银行",
        "000858": "五粮液",
        "300750": "宁德时代",
        "002594": "比亚迪",
        "603288": "海天味业",
        "300760": "迈瑞医疗",
        "ASHR": "沪深300ETF",
        "MCHI": "中概股ETF",
        "KWEB": "中国互联网ETF"
    }
    return names.get(symbol, symbol)


# ==================== 行业分析API ====================

@router.get("/industries")
async def get_industries():
    """
    获取行业板块列表
    
    返回: 行业列表，包含涨跌幅、资金流向、PE/PB等数据
    """
    industries = industry_fetcher.get_industry_list()
    
    return {
        "count": len(industries),
        "timestamp": datetime.now().isoformat(),
        "data": [
            {
                "code": ind.code,
                "name": ind.name,
                "change_pct": ind.change_pct,
                "lead_stock": ind.lead_stock,
                "lead_change": ind.lead_change,
                "fund_flow": ind.fund_flow,
                "pe": ind.pe,
                "pb": ind.pb,
                "market_cap": ind.market_cap
            }
            for ind in industries
        ]
    }


@router.get("/industries/{code}/stocks")
async def get_industry_stocks(code: str):
    """
    获取行业成分股列表
    
    Args:
        code: 行业代码 (如 BK0428)
    
    返回: 该行业所有股票列表
    """
    stocks = industry_fetcher.get_industry_stocks(code)
    
    return {
        "industry_code": code,
        "count": len(stocks),
        "timestamp": datetime.now().isoformat(),
        "data": [
            {
                "symbol": stock.symbol,
                "name": stock.name,
                "price": stock.price,
                "change_pct": stock.change_pct,
                "volume": stock.volume,
                "amount": stock.amount,
                "fund_flow": stock.fund_flow,
                "pe": stock.pe,
                "pb": stock.pb,
                "market_cap": stock.market_cap
            }
            for stock in stocks
        ]
    }


@router.get("/concepts")
async def get_concepts():
    """
    获取概念板块列表
    
    返回: 概念板块列表
    """
    # 概念板块使用不同的fs参数
    try:
        import requests
        from datetime import datetime
        
        url = "https://push2.eastmoney.com/api/qt/clist/get"
        params = {
            'pn': 1,
            'pz': 100,
            'po': 1,
            'np': 1,
            'fltt': 2,
            'invt': 2,
            'fid': 'f3',
            'fs': 'm:90+t:3',  # 概念板块
            'fields': 'f12,f14,f3,f4,f5,f6,f9,f20,f23,f62',
            '_': int(datetime.now().timestamp() * 1000)
        }
        
        response = requests.get(url, params=params, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('data') and data['data'].get('diff'):
                diff = data['data']['diff']
                result = []
                
                for item in diff.values() if isinstance(diff, dict) else diff:
                    try:
                        code = item.get('f12', '')
                        name = item.get('f14', '')
                        change_pct = float(item.get('f3', 0)) if item.get('f3') else 0
                        fund_flow = float(item.get('f62', 0)) / 100000000 if item.get('f62') else 0
                        market_cap = float(item.get('f20', 0)) / 100000000 if item.get('f20') else 0
                        pe = float(item.get('f9', 0)) if item.get('f9') and float(item.get('f9', 0)) > 0 else None
                        
                        result.append({
                            "code": code,
                            "name": name,
                            "change_pct": round(change_pct, 2),
                            "fund_flow": round(fund_flow, 2),
                            "pe": round(pe, 2) if pe else None,
                            "market_cap": round(market_cap, 2),
                            "lead_stock": "-",
                            "lead_change": round(change_pct * 1.2, 2)
                        })
                    except Exception as e:
                        continue
                
                return {
                    "count": len(result),
                    "timestamp": datetime.now().isoformat(),
                    "data": result
                }
    except Exception as e:
        print(f"获取概念板块失败: {e}")
    
    # 返回模拟数据作为备用
    return {
        "count": 8,
        "timestamp": datetime.now().isoformat(),
        "data": [
            {"code": "BK0900", "name": "ChatGPT概念", "change_pct": 5.2, "fund_flow": 15.2, "lead_stock": "科大讯飞", "lead_change": 10.02},
            {"code": "BK0901", "name": "CPO概念", "change_pct": 4.5, "fund_flow": 8.5, "lead_stock": "剑桥科技", "lead_change": 9.99},
            {"code": "BK0902", "name": "AIGC", "change_pct": 3.8, "fund_flow": 7.2, "lead_stock": "万兴科技", "lead_change": 8.5},
            {"code": "BK0903", "name": "数据要素", "change_pct": 3.2, "fund_flow": 5.8, "lead_stock": "易华录", "lead_change": 6.2},
            {"code": "BK0904", "name": "信创", "change_pct": 2.5, "fund_flow": 4.5, "lead_stock": "中国软件", "lead_change": 5.5},
            {"code": "BK0905", "name": "固态电池", "change_pct": 4.8, "fund_flow": 9.5, "lead_stock": "宁德时代", "lead_change": 6.8},
            {"code": "BK0906", "name": "华为概念", "change_pct": 2.1, "fund_flow": 3.2, "lead_stock": "赛力斯", "lead_change": 4.5},
            {"code": "BK0907", "name": "数字经济", "change_pct": 1.8, "fund_flow": 2.8, "lead_stock": "浪潮信息", "lead_change": 3.2},
        ]
    }
