"""
OpenQuant - 策略API
提供策略列表和回测功能
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

from app.core.backtest import (
    BacktestEngine,
    get_strategy_list,
    create_strategy,
    STRATEGIES
)
from app.data.fetcher import data_fetcher

router = APIRouter()


class BacktestRequest(BaseModel):
    """回测请求参数"""
    strategy_id: str = Field(..., description="策略ID (dual_ma 或 macd)")
    symbol: str = Field(..., description="股票代码 (如: 600519)")
    start_date: str = Field(..., description="开始日期 (YYYY-MM-DD)")
    end_date: str = Field(..., description="结束日期 (YYYY-MM-DD)")
    parameters: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="策略参数"
    )


class BacktestResponse(BaseModel):
    """回测响应"""
    summary: Dict[str, Any]
    trades: List[Dict[str, Any]]
    equity_curve: List[Dict[str, Any]]


@router.get("/list")
async def get_strategies():
    """获取策略列表"""
    return {
        "strategies": get_strategy_list()
    }


@router.post("/backtest", response_model=BacktestResponse)
async def run_backtest(request: BacktestRequest):
    """
    执行策略回测
    
    示例请求:
    ```json
    {
        "strategy_id": "dual_ma",
        "symbol": "600519",
        "start_date": "2024-01-01",
        "end_date": "2024-12-31",
        "parameters": {
            "short_period": 5,
            "long_period": 20,
            "initial_capital": 100000
        }
    }
    ```
    
    示例响应:
    ```json
    {
        "summary": {
            "strategy_id": "dual_ma",
            "symbol": "600519",
            "start_date": "2024-01-02",
            "end_date": "2024-12-31",
            "initial_capital": 100000.00,
            "final_capital": 115420.50,
            "total_return": 0.1542,
            "annualized_return": 0.1578,
            "max_drawdown": 0.0892,
            "sharpe_ratio": 1.2345,
            "win_rate": 0.625,
            "total_trades": 8
        },
        "trades": [...],
        "equity_curve": [...]
    }
    ```
    """
    try:
        # 验证策略ID
        if request.strategy_id not in STRATEGIES:
            raise HTTPException(
                status_code=400,
                detail=f"未知策略ID: {request.strategy_id}。可用策略: {list(STRATEGIES.keys())}"
            )
        
        # 获取策略默认参数
        default_params = STRATEGIES[request.strategy_id]['default_params'].copy()
        
        # 合并用户参数
        if request.parameters:
            default_params.update(request.parameters)
        
        # 获取初始资金
        initial_capital = default_params.get('initial_capital', 100000)
        
        # 获取历史数据 - 需要足够多的数据计算指标
        # 策略可能需要长期均线(如MA60)，所以获取更多历史数据
        from datetime import datetime
        try:
            start = datetime.strptime(request.start_date, "%Y-%m-%d")
            end = datetime.strptime(request.end_date, "%Y-%m-%d")
            # 需要: (end - start) + 额外100天用于计算指标
            days = (end - start).days + 100
        except:
            days = 365
        
        data = data_fetcher.get_a_share_kline(
            symbol=request.symbol,
            days=days
        )
        
        if not data or len(data) < 50:
            raise HTTPException(
                status_code=400,
                detail=f"无法获取 {request.symbol} 的历史数据，或数据不足50条"
            )
        
        # 找到回测区间在完整数据中的位置
        # 保留完整数据用于指标计算，但标记回测区间
        full_data = data
        
        # 找到回测开始日期在数据中的索引
        start_idx = 0
        for i, d in enumerate(full_data):
            if d['date'] >= request.start_date:
                start_idx = i
                break
        
        # 找到回测结束日期在数据中的索引
        end_idx = len(full_data)
        for i in range(len(full_data) - 1, -1, -1):
            if full_data[i]['date'] <= request.end_date:
                end_idx = i + 1
                break
        
        # 确保有足够的预热数据计算指标
        if start_idx < 30:
            # 如果开始位置太早，保留所有数据，但指标可能在前面不准确
            pass
        
        # 截取回测区间（包含前面用于计算指标的数据）
        data = full_data[:end_idx]
        
        # 记录实际的回测开始索引（用于过滤信号）
        actual_start_idx = start_idx
        
        if len(data) < 30:
            raise HTTPException(
                status_code=400,
                detail=f"数据不足，需要至少30条数据用于指标计算，当前只有{len(data)}条"
            )
        
        # 创建策略实例
        strategy = create_strategy(request.strategy_id, default_params)
        
        # 执行回测
        engine = BacktestEngine(initial_capital=initial_capital)
        result = engine.run(strategy, data, actual_start_idx=actual_start_idx)
        
        # 转换结果为字典，并修正日期范围
        result_dict = result.to_dict()
        result_dict['summary']['start_date'] = request.start_date
        result_dict['summary']['end_date'] = request.end_date
        
        return result_dict
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"回测执行失败: {str(e)}"
        )


@router.get("/backtest/{strategy_id}/params")
async def get_strategy_params(strategy_id: str):
    """获取策略参数说明"""
    if strategy_id not in STRATEGIES:
        raise HTTPException(
            status_code=404,
            detail=f"策略 {strategy_id} 不存在"
        )
    
    strategy_info = STRATEGIES[strategy_id]
    
    # 根据策略类型返回参数说明
    if strategy_id == 'dual_ma':
        params_desc = {
            "short_period": {
                "type": "int",
                "default": 5,
                "description": "短期均线周期",
                "min": 2,
                "max": 60
            },
            "long_period": {
                "type": "int",
                "default": 20,
                "description": "长期均线周期",
                "min": 5,
                "max": 250
            },
            "initial_capital": {
                "type": "float",
                "default": 100000,
                "description": "初始资金",
                "min": 10000
            }
        }
    elif strategy_id == 'macd':
        params_desc = {
            "fast_period": {
                "type": "int",
                "default": 12,
                "description": "快线周期",
                "min": 2,
                "max": 60
            },
            "slow_period": {
                "type": "int",
                "default": 26,
                "description": "慢线周期",
                "min": 5,
                "max": 250
            },
            "signal_period": {
                "type": "int",
                "default": 9,
                "description": "信号线周期",
                "min": 2,
                "max": 60
            },
            "initial_capital": {
                "type": "float",
                "default": 100000,
                "description": "初始资金",
                "min": 10000
            }
        }
    else:
        params_desc = {}
    
    return {
        "strategy_id": strategy_id,
        "name": strategy_info['name'],
        "description": strategy_info['description'],
        "parameters": params_desc,
        "default_values": strategy_info['default_params']
    }
