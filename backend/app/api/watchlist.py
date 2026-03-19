"""
OpenQuant - 自选股API
支持自选股分组管理和持久化存储
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import json
import os

router = APIRouter()

# 数据存储路径
WATCHLIST_FILE = "/root/.openclaw/workspace/openquant/backend/data/watchlists.json"

# 确保数据目录存在
os.makedirs(os.path.dirname(WATCHLIST_FILE), exist_ok=True)


class StockItem(BaseModel):
    """自选股项目"""
    symbol: str
    name: str
    price: Optional[float] = None
    change_pct: Optional[float] = None
    added_at: Optional[str] = None


class WatchlistGroup(BaseModel):
    """自选股分组"""
    id: str
    name: str
    stocks: List[StockItem] = []
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class CreateWatchlistRequest(BaseModel):
    """创建分组请求"""
    name: str


class AddStockRequest(BaseModel):
    """添加股票请求"""
    symbol: str
    name: Optional[str] = None


def _load_watchlists() -> List[dict]:
    """加载自选股数据"""
    if os.path.exists(WATCHLIST_FILE):
        try:
            with open(WATCHLIST_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"加载自选股失败: {e}")
    return []


def _save_watchlists(watchlists: List[dict]):
    """保存自选股数据"""
    try:
        with open(WATCHLIST_FILE, 'w', encoding='utf-8') as f:
            json.dump(watchlists, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"保存自选股失败: {e}")
        raise HTTPException(status_code=500, detail=f"保存失败: {str(e)}")


@router.get("/list")
async def get_watchlists():
    """
    获取所有自选股分组
    """
    watchlists = _load_watchlists()
    return {
        "count": len(watchlists),
        "watchlists": watchlists
    }


@router.post("/create")
async def create_watchlist(request: CreateWatchlistRequest):
    """
    创建新的自选股分组
    
    Args:
        request.name: 分组名称
    """
    watchlists = _load_watchlists()
    
    # 检查是否已存在
    for wl in watchlists:
        if wl['name'] == request.name:
            raise HTTPException(status_code=400, detail=f"分组 '{request.name}' 已存在")
    
    now = datetime.now().isoformat()
    new_group = {
        "id": f"wl_{len(watchlists) + 1}",
        "name": request.name,
        "stocks": [],
        "created_at": now,
        "updated_at": now
    }
    
    watchlists.append(new_group)
    _save_watchlists(watchlists)
    
    return {
        "success": True,
        "message": f"分组 '{request.name}' 创建成功",
        "watchlist": new_group
    }


@router.post("/{watchlist_id}/add")
async def add_stock(watchlist_id: str, request: AddStockRequest):
    """
    向分组添加股票
    
    Args:
        watchlist_id: 分组ID
        request.symbol: 股票代码
        request.name: 股票名称（可选）
    """
    watchlists = _load_watchlists()
    
    # 查找分组
    target_wl = None
    for wl in watchlists:
        if wl['id'] == watchlist_id:
            target_wl = wl
            break
    
    if not target_wl:
        raise HTTPException(status_code=404, detail=f"分组 {watchlist_id} 不存在")
    
    # 检查股票是否已在分组中
    for stock in target_wl['stocks']:
        if stock['symbol'] == request.symbol:
            raise HTTPException(status_code=400, detail=f"股票 {request.symbol} 已在分组中")
    
    # 如果未提供名称，尝试获取
    name = request.name
    if not name:
        try:
            from app.data.fetcher import data_fetcher
            info = data_fetcher.get_stock_info(request.symbol)
            name = info.get('name', request.symbol)
        except:
            name = request.symbol
    
    # 添加股票
    now = datetime.now().isoformat()
    target_wl['stocks'].append({
        "symbol": request.symbol,
        "name": name,
        "added_at": now
    })
    target_wl['updated_at'] = now
    
    _save_watchlists(watchlists)
    
    return {
        "success": True,
        "message": f"股票 {request.symbol} 已添加到分组",
        "watchlist": target_wl
    }


@router.delete("/{watchlist_id}/remove/{symbol}")
async def remove_stock(watchlist_id: str, symbol: str):
    """
    从分组移除股票
    
    Args:
        watchlist_id: 分组ID
        symbol: 股票代码
    """
    watchlists = _load_watchlists()
    
    # 查找分组
    target_wl = None
    for wl in watchlists:
        if wl['id'] == watchlist_id:
            target_wl = wl
            break
    
    if not target_wl:
        raise HTTPException(status_code=404, detail=f"分组 {watchlist_id} 不存在")
    
    # 查找并移除股票
    original_count = len(target_wl['stocks'])
    target_wl['stocks'] = [s for s in target_wl['stocks'] if s['symbol'] != symbol]
    
    if len(target_wl['stocks']) == original_count:
        raise HTTPException(status_code=404, detail=f"股票 {symbol} 不在分组中")
    
    target_wl['updated_at'] = datetime.now().isoformat()
    _save_watchlists(watchlists)
    
    return {
        "success": True,
        "message": f"股票 {symbol} 已从分组移除",
        "watchlist": target_wl
    }


@router.delete("/{watchlist_id}")
async def delete_watchlist(watchlist_id: str):
    """
    删除自选股分组
    
    Args:
        watchlist_id: 分组ID
    """
    watchlists = _load_watchlists()
    
    # 查找并移除分组
    original_count = len(watchlists)
    watchlists = [wl for wl in watchlists if wl['id'] != watchlist_id]
    
    if len(watchlists) == original_count:
        raise HTTPException(status_code=404, detail=f"分组 {watchlist_id} 不存在")
    
    _save_watchlists(watchlists)
    
    return {
        "success": True,
        "message": f"分组 {watchlist_id} 已删除"
    }


@router.get("/{watchlist_id}/detail")
async def get_watchlist_detail(watchlist_id: str):
    """
    获取分组详情（包含实时股价）
    
    Args:
        watchlist_id: 分组ID
    """
    watchlists = _load_watchlists()
    
    # 查找分组
    target_wl = None
    for wl in watchlists:
        if wl['id'] == watchlist_id:
            target_wl = wl
            break
    
    if not target_wl:
        raise HTTPException(status_code=404, detail=f"分组 {watchlist_id} 不存在")
    
    # 获取实时价格
    try:
        from app.data.fetcher import data_fetcher
        for stock in target_wl['stocks']:
            try:
                # 获取K线数据中的最新价格
                kline = data_fetcher.get_a_share_kline(stock['symbol'], days=1)
                if kline and len(kline) > 0:
                    latest = kline[-1]
                    stock['price'] = latest['close']
                    stock['change_pct'] = latest['change_pct']
            except:
                pass
    except:
        pass
    
    return target_wl
