"""
OpenQuant - Pydantic数据模型
"""

from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime

class StockData(BaseModel):
    """股票数据模型"""
    symbol: str
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: float
    amount: Optional[float] = 0
    change_pct: Optional[float] = 0

class MarketSentiment(BaseModel):
    """市场情绪模型"""
    temperature: float  # 0-100
    total_amount: float  # 万亿
    limit_up: int
    limit_down: int
    advance: int
    decline: int
    advance_ratio: float
    status: str
    timestamp: str

class SignalResponse(BaseModel):
    """信号响应模型"""
    symbol: str
    name: str
    price: float
    change_pct: float
    score: float
    rating: str
    stars: str
    signals: List[str]

class StockIndicators(BaseModel):
    """技术指标模型"""
    symbol: str
    price: float
    change_pct: float
    ma5: float
    ma10: float
    ma20: float
    ma60: float
    rsi: float
    macd_dif: float
    macd_dea: float
    macd_hist: float
    bb_upper: float
    bb_middle: float
    bb_lower: float
    bb_position: float
    volume_ratio: float
    score: float
    rating: str
    stars: str
    signals: List[str]

class WatchlistItem(BaseModel):
    """自选股模型"""
    id: int
    symbol: str
    name: str
    group: str
    price: float
    change_pct: float
    score: float
    rating: str
    stars: str
    notes: Optional[str] = None
    alert_high: Optional[float] = None
    alert_low: Optional[float] = None
    added_at: str
    updated_at: str
