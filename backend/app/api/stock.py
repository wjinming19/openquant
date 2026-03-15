"""
OpenQuant - 个股API
"""

from fastapi import APIRouter

router = APIRouter()

@router.get("/{symbol}/info")
async def get_stock_info(symbol: str):
    """获取股票基本信息"""
    return {"symbol": symbol, "status": "not_implemented"}

@router.get("/{symbol}/news")
async def get_stock_news(symbol: str):
    """获取股票相关新闻"""
    return {"symbol": symbol, "status": "not_implemented"}
