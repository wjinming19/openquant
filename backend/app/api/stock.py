"""
OpenQuant - 个股API
"""

from fastapi import APIRouter, HTTPException
from typing import List
from app.data.fetcher import data_fetcher

router = APIRouter()

@router.get("/{symbol}/info")
async def get_stock_info(symbol: str):
    """
    获取股票基本信息
    
    包括：股票名称、行业、市值、市盈率、市净率等
    """
    try:
        info = data_fetcher.get_stock_info(symbol)
        if info:
            return info
        raise HTTPException(status_code=404, detail=f"无法获取股票 {symbol} 的信息")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取股票信息失败: {str(e)}")

@router.get("/{symbol}/news")
async def get_stock_news(symbol: str, limit: int = 10):
    """
    获取股票相关新闻
    
    Args:
        symbol: 股票代码
        limit: 返回新闻数量，默认10条
    """
    try:
        news = data_fetcher.get_stock_news(symbol, limit)
        return {
            "symbol": symbol,
            "count": len(news),
            "data": news
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取新闻失败: {str(e)}")

@router.get("/{symbol}/kline")
async def get_stock_kline(symbol: str, days: int = 60):
    """
    获取股票K线数据
    
    Args:
        symbol: 股票代码
        days: 获取天数，默认60天
    """
    try:
        data = data_fetcher.get_a_share_kline(symbol, days)
        if data:
            return {
                "symbol": symbol,
                "count": len(data),
                "data": data
            }
        raise HTTPException(status_code=404, detail=f"无法获取股票 {symbol} 的K线数据")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取K线数据失败: {str(e)}")
