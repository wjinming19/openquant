"""
OpenQuant - 数据库模型
"""

from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, JSON, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

Base = declarative_base()

class Stock(Base):
    """股票基础信息表"""
    __tablename__ = "stocks"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(100))
    market = Column(String(10))  # 'a_share', 'hk', 'us'
    sector = Column(String(50))
    created_at = Column(DateTime, default=datetime.now)

class StockData(Base):
    """股票历史数据表"""
    __tablename__ = "stock_data"
    
    id = Column(Integer, primary_key=True)
    symbol = Column(String(20), index=True, nullable=False)
    date = Column(DateTime, index=True, nullable=False)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    volume = Column(Float)
    amount = Column(Float)
    change_pct = Column(Float)
    
    class Config:
        # 联合唯一约束
        __table_args__ = (
            {'sqlite_autoincrement': True},
        )

class MarketSentiment(Base):
    """市场情绪表"""
    __tablename__ = "market_sentiment"
    
    id = Column(Integer, primary_key=True)
    date = Column(DateTime, default=datetime.now)
    temperature = Column(Float)  # 情绪温度 0-100%
    total_amount = Column(Float)  # 总成交额
    limit_up_count = Column(Integer)  # 涨停数
    limit_down_count = Column(Integer)  # 跌停数
    advance_count = Column(Integer)  # 上涨家数
    decline_count = Column(Integer)  # 下跌家数
    data = Column(JSON)  # 详细数据

class Signal(Base):
    """交易信号表"""
    __tablename__ = "signals"
    
    id = Column(Integer, primary_key=True)
    symbol = Column(String(20), index=True, nullable=False)
    date = Column(DateTime, default=datetime.now)
    signal_type = Column(String(20))  # 'buy', 'sell', 'hold'
    strength = Column(Float)  # 信号强度
    score = Column(Float)  # 综合评分
    indicators = Column(JSON)  # 技术指标数据
    alerts = Column(JSON)  # 告警信息
    is_sent = Column(Boolean, default=False)  # 是否已发送告警

class BacktestResult(Base):
    """回测结果表"""
    __tablename__ = "backtest_results"
    
    id = Column(Integer, primary_key=True)
    symbol = Column(String(20))
    strategy_name = Column(String(50))
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    total_return = Column(Float)
    sharpe_ratio = Column(Float)
    max_drawdown = Column(Float)
    win_rate = Column(Float)
    trade_count = Column(Integer)
    params = Column(JSON)  # 策略参数
    results = Column(JSON)  # 详细结果
    created_at = Column(DateTime, default=datetime.now)

class WatchlistModel(Base):
    """自选股表"""
    __tablename__ = "watchlist"
    
    id = Column(Integer, primary_key=True)
    symbol = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(100))
    group = Column(String(50), default="默认分组")
    price = Column(Float, default=0.0)
    change_pct = Column(Float, default=0.0)
    score = Column(Float, default=0.0)
    rating = Column(String(20), default="-")
    stars = Column(String(20), default="⭐")
    notes = Column(String(500))
    alert_high = Column(Float)
    alert_low = Column(Float)
    added_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

# 数据库连接
from app.core.config import settings
engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
