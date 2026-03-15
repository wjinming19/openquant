"""
OpenQuant - 自选股API
提供自选股的增删改查功能
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.schemas import WatchlistItem
from app.data.fetcher import data_fetcher
from app.core.indicators import TechnicalAnalyzer

router = APIRouter()


class WatchlistAddRequest(BaseModel):
    """添加自选股请求"""
    symbol: str
    name: Optional[str] = None
    group: Optional[str] = "默认分组"
    notes: Optional[str] = None
    alert_high: Optional[float] = None
    alert_low: Optional[float] = None


class WatchlistRemoveRequest(BaseModel):
    """删除自选股请求"""
    symbol: str


class WatchlistItemResponse(BaseModel):
    """自选股响应"""
    id: int
    symbol: str
    name: str
    group: str
    price: float
    change_pct: float
    score: float
    rating: str
    stars: str
    notes: Optional[str]
    alert_high: Optional[float]
    alert_low: Optional[float]
    added_at: str
    updated_at: str


class WatchlistGroupRequest(BaseModel):
    """创建分组请求"""
    name: str


@router.post("/add")
async def add_watchlist(
    request: WatchlistAddRequest,
    db: Session = Depends(get_db)
):
    """
    添加自选股
    
    示例请求:
    ```json
    {
        "symbol": "600519",
        "name": "贵州茅台",
        "group": "核心资产",
        "notes": "长期持有",
        "alert_high": 1800.0,
        "alert_low": 1500.0
    }
    ```
    """
    from app.core.database import WatchlistModel
    
    # 检查是否已存在
    existing = db.query(WatchlistModel).filter(
        WatchlistModel.symbol == request.symbol
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"{request.symbol} 已在自选股列表中"
        )
    
    # 获取股票名称（如果未提供）
    name = request.name
    if not name:
        # 尝试获取股票名称
        names = {
            "0700.HK": "腾讯控股", "9988.HK": "阿里巴巴",
            "3690.HK": "美团", "1810.HK": "小米集团",
            "9618.HK": "京东集团", "2318.HK": "中国平安",
            "1299.HK": "友邦保险", "0005.HK": "汇丰控股",
            "600519": "贵州茅台", "601318": "中国平安",
            "000001": "平安银行", "000858": "五粮液",
            "300750": "宁德时代", "002594": "比亚迪",
            "603288": "海天味业", "300760": "迈瑞医疗",
            "ASHR": "沪深300ETF", "MCHI": "中概股ETF",
            "KWEB": "中国互联网ETF"
        }
        name = names.get(request.symbol, request.symbol)
    
    # 获取当前价格和指标
    try:
        if request.symbol.endswith('.HK'):
            data = data_fetcher.get_hk_stock_data(request.symbol, 30)
        else:
            data = data_fetcher.get_a_share_kline(request.symbol, 30)
        
        for item in data:
            item['symbol'] = request.symbol
        
        indicators = TechnicalAnalyzer.analyze_stock(data)
        price = indicators.price if indicators else 0.0
        score = indicators.score if indicators else 0.0
        rating = indicators.rating if indicators else "-"
        stars = indicators.stars if indicators else "⭐"
    except Exception as e:
        price = 0.0
        score = 0.0
        rating = "-"
        stars = "⭐"
    
    # 创建记录
    watchlist_item = WatchlistModel(
        symbol=request.symbol,
        name=name,
        group=request.group or "默认分组",
        price=price,
        change_pct=0.0,
        score=score,
        rating=rating,
        stars=stars,
        notes=request.notes,
        alert_high=request.alert_high,
        alert_low=request.alert_low
    )
    
    db.add(watchlist_item)
    db.commit()
    db.refresh(watchlist_item)
    
    return {
        "success": True,
        "message": f"已添加 {request.symbol} 到自选股",
        "data": {
            "id": watchlist_item.id,
            "symbol": watchlist_item.symbol,
            "name": watchlist_item.name,
            "group": watchlist_item.group,
            "price": watchlist_item.price,
            "score": watchlist_item.score,
            "added_at": watchlist_item.added_at.isoformat() if watchlist_item.added_at else None
        }
    }


@router.delete("/remove/{symbol}")
async def remove_watchlist(
    symbol: str,
    db: Session = Depends(get_db)
):
    """删除自选股"""
    from app.core.database import WatchlistModel
    
    item = db.query(WatchlistModel).filter(
        WatchlistModel.symbol == symbol
    ).first()
    
    if not item:
        raise HTTPException(
            status_code=404,
            detail=f"{symbol} 不在自选股列表中"
        )
    
    db.delete(item)
    db.commit()
    
    return {
        "success": True,
        "message": f"已从自选股中删除 {symbol}"
    }


@router.get("/list")
async def get_watchlist(
    group: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    获取自选股列表
    
    参数:
    - group: 分组名称 (可选)
    """
    from app.core.database import WatchlistModel
    
    query = db.query(WatchlistModel)
    
    if group:
        query = query.filter(WatchlistModel.group == group)
    
    items = query.all()
    
    # 更新实时数据
    result = []
    for item in items:
        try:
            # 获取最新数据
            if item.symbol.endswith('.HK'):
                data = data_fetcher.get_hk_stock_data(item.symbol, 5)
            else:
                data = data_fetcher.get_a_share_kline(item.symbol, 5)
            
            if data and len(data) >= 2:
                latest = data[-1]
                prev = data[-2]
                
                item.price = float(latest.get('close', 0))
                prev_price = float(prev.get('close', 0))
                
                if prev_price > 0:
                    item.change_pct = round((item.price - prev_price) / prev_price * 100, 2)
                
                # 更新指标
                for d in data:
                    d['symbol'] = item.symbol
                indicators = TechnicalAnalyzer.analyze_stock(data)
                if indicators:
                    item.score = indicators.score
                    item.rating = indicators.rating
                    item.stars = indicators.stars
                
                db.commit()
        except Exception as e:
            print(f"更新 {item.symbol} 数据失败: {e}")
        
        result.append({
            "id": item.id,
            "symbol": item.symbol,
            "name": item.name,
            "group": item.group,
            "price": item.price,
            "change_pct": item.change_pct,
            "score": item.score,
            "rating": item.rating,
            "stars": item.stars,
            "notes": item.notes,
            "alert_high": item.alert_high,
            "alert_low": item.alert_low,
            "added_at": item.added_at.isoformat() if item.added_at else None,
            "updated_at": item.updated_at.isoformat() if item.updated_at else None
        })
    
    return {
        "count": len(result),
        "group": group,
        "timestamp": datetime.now().isoformat(),
        "data": result
    }


@router.put("/update/{symbol}")
async def update_watchlist(
    symbol: str,
    notes: Optional[str] = None,
    alert_high: Optional[float] = None,
    alert_low: Optional[float] = None,
    group: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """更新自选股信息"""
    from app.core.database import WatchlistModel
    
    item = db.query(WatchlistModel).filter(
        WatchlistModel.symbol == symbol
    ).first()
    
    if not item:
        raise HTTPException(
            status_code=404,
            detail=f"{symbol} 不在自选股列表中"
        )
    
    if notes is not None:
        item.notes = notes
    if alert_high is not None:
        item.alert_high = alert_high
    if alert_low is not None:
        item.alert_low = alert_low
    if group is not None:
        item.group = group
    
    db.commit()
    db.refresh(item)
    
    return {
        "success": True,
        "message": f"已更新 {symbol}",
        "data": {
            "symbol": item.symbol,
            "notes": item.notes,
            "alert_high": item.alert_high,
            "alert_low": item.alert_low,
            "group": item.group
        }
    }


@router.get("/groups")
async def get_watchlist_groups(db: Session = Depends(get_db)):
    """获取所有分组"""
    from app.core.database import WatchlistModel
    from sqlalchemy import func
    
    groups = db.query(
        WatchlistModel.group,
        func.count(WatchlistModel.id).label('count')
    ).group_by(WatchlistModel.group).all()
    
    return {
        "count": len(groups),
        "groups": [
            {"name": g.group, "count": g.count}
            for g in groups
        ]
    }


@router.post("/check-alerts")
async def check_price_alerts(db: Session = Depends(get_db)):
    """
    检查价格预警
    
    返回触发预警的股票列表
    """
    from app.core.database import WatchlistModel
    
    items = db.query(WatchlistModel).filter(
        (WatchlistModel.alert_high.isnot(None)) |
        (WatchlistModel.alert_low.isnot(None))
    ).all()
    
    alerts = []
    for item in items:
        if item.alert_high and item.price >= item.alert_high:
            alerts.append({
                "symbol": item.symbol,
                "name": item.name,
                "type": "high",
                "message": f"{item.name} 价格 {item.price} 已触及预警上限 {item.alert_high}",
                "current_price": item.price,
                "alert_price": item.alert_high
            })
        
        if item.alert_low and item.price <= item.alert_low:
            alerts.append({
                "symbol": item.symbol,
                "name": item.name,
                "type": "low",
                "message": f"{item.name} 价格 {item.price} 已触及预警下限 {item.alert_low}",
                "current_price": item.price,
                "alert_price": item.alert_low
            })
    
    return {
        "count": len(alerts),
        "timestamp": datetime.now().isoformat(),
        "alerts": alerts
    }
