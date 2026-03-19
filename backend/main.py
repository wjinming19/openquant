"""
OpenQuant - FastAPI Backend
量化分析系统后端API
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn
from app.api import market, strategy, stock, analysis, watchlist
from app.core.config import settings
from app.core.database import engine, Base
from app.services.scheduler import start_scheduler, stop_scheduler
from app.data.tushare_data import init_tushare
from app.data.realtime_service import start_realtime_service

# 初始化 Tushare
init_tushare("207a3e3e4106e0afe2acc6c15cb26bea6092045c135e6c703614d8e9")

# 创建数据库表
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时
    print("🚀 OpenQuant Backend Starting...")
    start_scheduler()
    # 启动实时数据服务（2000+积分权限）
    print("📊 启动实时行情数据服务...")
    start_realtime_service()
    yield
    # 关闭时
    print("👋 OpenQuant Backend Stopping...")
    stop_scheduler()

app = FastAPI(
    title="OpenQuant API",
    description="A股+港股量化分析系统API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应该限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(market.router, prefix="/api/market", tags=["market"])
app.include_router(strategy.router, prefix="/api/strategy", tags=["strategy"])
app.include_router(stock.router, prefix="/api/stock", tags=["stock"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["analysis"])
app.include_router(watchlist.router, prefix="/api/watchlist", tags=["watchlist"])

@app.get("/")
async def root():
    return {
        "message": "OpenQuant API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "timestamp": __import__('datetime').datetime.now().isoformat()}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8089,
        reload=settings.DEBUG
    )
