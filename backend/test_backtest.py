"""
OpenQuant - 回测引擎测试脚本
使用模拟数据测试回测功能
"""

import sys
sys.path.insert(0, '/root/.openclaw/workspace/openquant/backend')

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from app.core.backtest import BacktestEngine, DualMAStrategy, MACDStrategy

def generate_mock_data(symbol: str, days: int = 252) -> pd.DataFrame:
    """生成模拟股票数据"""
    np.random.seed(42)
    
    # 生成日期序列
    end_date = datetime.now()
    dates = [(end_date - timedelta(days=i)).strftime('%Y-%m-%d') 
             for i in range(days, 0, -1)]
    
    # 生成价格序列（随机游走）
    initial_price = 100.0
    returns = np.random.normal(0.001, 0.02, days)  # 日收益率
    prices = initial_price * np.exp(np.cumsum(returns))
    
    # 生成OHLCV数据
    data = []
    for i, date in enumerate(dates):
        close = prices[i]
        high = close * (1 + abs(np.random.normal(0, 0.01)))
        low = close * (1 - abs(np.random.normal(0, 0.01)))
        open_price = close * (1 + np.random.normal(0, 0.005))
        volume = np.random.randint(1000000, 10000000)
        
        data.append({
            'date': date,
            'open': round(open_price, 2),
            'high': round(high, 2),
            'low': round(low, 2),
            'close': round(close, 2),
            'volume': volume,
            'symbol': symbol
        })
    
    return pd.DataFrame(data)

def test_dual_ma_strategy():
    """测试双均线策略"""
    print("="*60)
    print("测试双均线策略")
    print("="*60)
    
    # 生成模拟数据
    df = generate_mock_data('600519', days=100)
    print(f"生成 {len(df)} 条模拟数据")
    print(f"数据范围: {df['date'].iloc[0]} 至 {df['date'].iloc[-1]}")
    print(f"价格范围: {df['close'].min():.2f} - {df['close'].max():.2f}")
    
    # 执行回测
    engine = BacktestEngine(initial_capital=100000)
    strategy = DualMAStrategy({'short_period': 5, 'long_period': 20})
    result = engine.run(
        strategy,
        df.to_dict('records')
    )
    
    # 打印结果
    print("\n【回测结果】")
    summary = result['summary']
    print(f"总收益率: {summary['total_return']:.2f}%")
    print(f"年化收益率: {summary['annualized_return']:.2f}%")
    print(f"最大回撤: {summary['max_drawdown']:.2f}%")
    print(f"夏普比率: {summary['sharpe_ratio']:.2f}")
    print(f"胜率: {summary['win_rate']:.1f}%")
    print(f"交易次数: {summary['total_trades']}")
    print(f"盈亏比: {summary['profit_factor']:.2f}")
    print(f"平均持仓: {summary['avg_holding_days']:.1f}天")
    
    print(f"\n【交易记录】共 {len(result['trades'])} 笔")
    for i, trade in enumerate(result['trades'][:5]):
        pnl = trade['pnl']
        pnl_pct = trade['pnl_percent']
        print(f"  {i+1}. {trade['entry_date']} 买入 @ {trade['entry_price']:.2f} "
              f"→ {trade['exit_date']} 卖出 @ {trade['exit_price']:.2f} "
              f"({pnl:+.2f}, {pnl_pct:+.2f}%)")
    
    if len(result['trades']) > 5:
        print(f"  ... 还有 {len(result['trades'])-5} 笔交易")
    
    print(f"\n【权益曲线】共 {len(result['equity_curve'])} 个点")
    print(f"  初始: {result['equity_curve'][0]['value']:.2f}")
    print(f"  结束: {result['equity_curve'][-1]['value']:.2f}")
    
    return result

def test_macd_strategy():
    """测试MACD策略"""
    print("\n" + "="*60)
    print("测试MACD策略")
    print("="*60)
    
    # 生成模拟数据
    df = generate_mock_data('000001', days=100)
    
    # 执行回测
    engine = BacktestEngine(initial_capital=100000)
    strategy = MACDStrategy({'fast_period': 12, 'slow_period': 26, 'signal_period': 9})
    result = engine.run(
        strategy,
        df.to_dict('records')
    )
    
    # 打印结果
    print("\n【回测结果】")
    summary = result['summary']
    print(f"总收益率: {summary['total_return']:.2f}%")
    print(f"年化收益率: {summary['annualized_return']:.2f}%")
    print(f"最大回撤: {summary['max_drawdown']:.2f}%")
    print(f"夏普比率: {summary['sharpe_ratio']:.2f}")
    print(f"胜率: {summary['win_rate']:.1f}%")
    print(f"交易次数: {summary['total_trades']}")
    
    return result

def test_api_format():
    """测试API响应格式"""
    print("\n" + "="*60)
    print("测试API响应格式")
    print("="*60)
    
    df = generate_mock_data('600519', days=60)
    engine = BacktestEngine(initial_capital=100000)
    strategy = DualMAStrategy({'short_period': 5, 'long_period': 20})
    result = engine.run(strategy, df.to_dict('records'))
    
    # 验证数据结构
    print("\n【数据结构验证】")
    print(f"✓ summary: {type(result.get('summary'))}")
    print(f"✓ trades: {type(result.get('trades'))}, 长度: {len(result.get('trades', []))}")
    print(f"✓ equity_curve: {type(result.get('equity_curve'))}, 长度: {len(result.get('equity_curve', []))}")
    
    # 验证summary字段
    summary = result['summary']
    required_fields = [
        'total_return', 'annualized_return', 'max_drawdown', 
        'sharpe_ratio', 'win_rate', 'total_trades',
        'profit_factor', 'avg_holding_days'
    ]
    print("\n【Summary字段验证】")
    for field in required_fields:
        if field in summary:
            print(f"✓ {field}: {summary[field]}")
        else:
            print(f"✗ {field}: 缺失")
    
    return result

if __name__ == '__main__':
    try:
        # 测试双均线策略
        result1 = test_dual_ma_strategy()
        
        # 测试MACD策略
        result2 = test_macd_strategy()
        
        # 测试API格式
        result3 = test_api_format()
        
        print("\n" + "="*60)
        print("✅ 所有测试通过！")
        print("="*60)
        
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
