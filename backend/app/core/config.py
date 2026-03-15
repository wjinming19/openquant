"""
OpenQuant - 配置模块
"""

from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # 应用配置
    APP_NAME: str = "OpenQuant"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8089
    
    # 数据库配置
    DATABASE_URL: str = "sqlite:///./data/openquant.db"
    
    # 数据源配置
    DATA_SOURCE_PRIORITY: List[str] = ["eastmoney_cookie", "akshare", "tencent"]
    
    # Cookie文件路径
    EASTMONEY_COOKIE_FILE: str = "/root/.openclaw/workspace/scripts/dongfangcaifu-cookie.txt"
    
    # 定时任务配置
    MARKET_SCAN_INTERVAL: int = 30  # 分钟
    DAILY_REPORT_TIME: str = "08:30"
    
    # 告警配置
    ALERT_ENABLED: bool = True
    ALERT_THRESHOLD_BULL: float = 3.0
    ALERT_THRESHOLD_BEAR: float = -2.0
    
    # 标的池配置
    DEFAULT_STOCKS: dict = {
        "hk": ["0700.HK", "9988.HK", "3690.HK", "1810.HK", "9618.HK", "2318.HK", "1299.HK", "0005.HK"],
        "a_share": ["600519", "601318", "000001", "000858", "300750", "002594", "603288", "300760"],
        "etf": ["ASHR", "MCHI", "KWEB"]
    }
    
    class Config:
        env_file = ".env"

settings = Settings()
