"""
OpenQuant - 回测引擎
支持双均线策略和MACD策略
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import numpy as np


class SignalType(Enum):
    """信号类型"""
    BUY = "buy"
    SELL = "sell"
    HOLD = "hold"


class Action(Enum):
    """交易动作"""
    BUY = "buy"
    SELL = "sell"


@dataclass
class Trade:
    """交易记录"""
    date: str
    action: str  # buy/sell
    price: float
    shares: float
    amount: float
    signal: str
    reason: str = ""


@dataclass
class BacktestResult:
    """回测结果"""
    # 基本参数
    strategy_id: str
    symbol: str
    start_date: str
    end_date: str
    
    # 资金情况
    initial_capital: float
    final_capital: float
    
    # 收益率指标
    total_return: float  # 总收益率
    annualized_return: float  # 年化收益率
    
    # 风险指标
    max_drawdown: float  # 最大回撤
    sharpe_ratio: float  # 夏普比率
    
    # 交易统计
    total_trades: int  # 总交易次数
    winning_trades: int  # 盈利交易次数
    losing_trades: int  # 亏损交易次数
    win_rate: float  # 胜率
    avg_profit: float  # 平均盈利
    avg_loss: float  # 平均亏损
    profit_factor: float  # 盈亏比
    
    # 详细数据
    trades: List[Trade]  # 交易记录
    equity_curve: List[Dict[str, Any]]  # 权益曲线
    
    # 可选字段（必须放在最后）
    max_drawdown_period: Dict[str, str] = field(default_factory=dict)  # 最大回撤区间
    
    def to_dict(self) -> Dict:
        """转换为字典格式"""
        return {
            'summary': {
                'strategy_id': self.strategy_id,
                'symbol': self.symbol,
                'start_date': self.start_date,
                'end_date': self.end_date,
                'initial_capital': round(self.initial_capital, 2),
                'final_capital': round(self.final_capital, 2),
                'total_return': round(self.total_return, 4),
                'annualized_return': round(self.annualized_return, 4),
                'max_drawdown': round(self.max_drawdown, 4),
                'max_drawdown_period': self.max_drawdown_period,
                'sharpe_ratio': round(self.sharpe_ratio, 4),
                'win_rate': round(self.win_rate, 4),
                'total_trades': self.total_trades,
                'winning_trades': self.winning_trades,
                'losing_trades': self.losing_trades,
                'avg_profit': round(self.avg_profit, 2) if self.avg_profit else 0,
                'avg_loss': round(self.avg_loss, 2) if self.avg_loss else 0,
                'profit_factor': round(self.profit_factor, 4) if self.profit_factor else 0,
            },
            'trades': [
                {
                    'date': t.date,
                    'action': t.action,
                    'price': round(t.price, 2),
                    'shares': round(t.shares, 2),
                    'amount': round(t.amount, 2),
                    'signal': t.signal,
                    'reason': t.reason
                }
                for t in self.trades
            ],
            'equity_curve': self.equity_curve
        }


class StrategyBase:
    """策略基类"""
    
    def __init__(self, parameters: Dict[str, Any]):
        self.parameters = parameters
        self.signals: List[Dict] = []
    
    def generate_signals(self, data: List[Dict]) -> List[Dict]:
        """生成交易信号"""
        raise NotImplementedError
    
    def get_signal_at(self, index: int) -> Dict:
        """获取指定位置信号"""
        if 0 <= index < len(self.signals):
            return self.signals[index]
        return {'signal': SignalType.HOLD, 'reason': ''}


class DualMAStrategy(StrategyBase):
    """
    双均线策略 (Dual Moving Average)
    
    参数:
    - short_period: 短期均线周期 (默认5)
    - long_period: 长期均线周期 (默认20)
    
    买入信号: 短期均线上穿长期均线 (金叉)
    卖出信号: 短期均线下穿长期均线 (死叉)
    """
    
    def __init__(self, parameters: Dict[str, Any]):
        super().__init__(parameters)
        self.short_period = parameters.get('short_period', 5)
        self.long_period = parameters.get('long_period', 20)
    
    def calculate_ma(self, prices: List[float], period: int) -> List[float]:
        """计算简单移动平均线"""
        ma = []
        for i in range(len(prices)):
            if i < period - 1:
                ma.append(None)
            else:
                ma.append(sum(prices[i-period+1:i+1]) / period)
        return ma
    
    def generate_signals(self, data: List[Dict]) -> List[Dict]:
        """生成交易信号"""
        if len(data) < self.long_period + 1:
            return [{'signal': SignalType.HOLD, 'reason': '数据不足'}] * len(data)
        
        closes = [d['close'] for d in data]
        short_ma = self.calculate_ma(closes, self.short_period)
        long_ma = self.calculate_ma(closes, self.long_period)
        
        signals = []
        
        for i in range(len(data)):
            if i < self.long_period:
                signals.append({'signal': SignalType.HOLD, 'reason': '均线计算中'})
                continue
            
            # 检查金叉/死叉
            if short_ma[i-1] is not None and long_ma[i-1] is not None:
                prev_short = short_ma[i-1]
                prev_long = long_ma[i-1]
                curr_short = short_ma[i]
                curr_long = long_ma[i]
                
                # 金叉: 短期均线上穿长期均线
                if prev_short <= prev_long and curr_short > curr_long:
                    signals.append({
                        'signal': SignalType.BUY,
                        'reason': f'MA{self.short_period}上穿MA{self.long_period} (金叉)',
                        'short_ma': round(curr_short, 2),
                        'long_ma': round(curr_long, 2)
                    })
                # 死叉: 短期均线下穿长期均线
                elif prev_short >= prev_long and curr_short < curr_long:
                    signals.append({
                        'signal': SignalType.SELL,
                        'reason': f'MA{self.short_period}下穿MA{self.long_period} (死叉)',
                        'short_ma': round(curr_short, 2),
                        'long_ma': round(curr_long, 2)
                    })
                else:
                    position = "多头排列" if curr_short > curr_long else "空头排列"
                    signals.append({
                        'signal': SignalType.HOLD,
                        'reason': position,
                        'short_ma': round(curr_short, 2),
                        'long_ma': round(curr_long, 2)
                    })
            else:
                signals.append({'signal': SignalType.HOLD, 'reason': '计算中'})
        
        self.signals = signals
        return signals


class MACDStrategy(StrategyBase):
    """
    MACD策略
    
    参数:
    - fast_period: 快线周期 (默认12)
    - slow_period: 慢线周期 (默认26)
    - signal_period: 信号线周期 (默认9)
    
    买入信号: DIF上穿DEA (金叉)
    卖出信号: DIF下穿DEA (死叉)
    """
    
    def __init__(self, parameters: Dict[str, Any]):
        super().__init__(parameters)
        self.fast_period = parameters.get('fast_period', 12)
        self.slow_period = parameters.get('slow_period', 26)
        self.signal_period = parameters.get('signal_period', 9)
    
    def calculate_ema(self, prices: List[float], period: int) -> List[float]:
        """计算指数移动平均线"""
        if len(prices) < period:
            return [prices[0]] * len(prices)
        
        ema = []
        multiplier = 2 / (period + 1)
        
        # 初始值为SMA
        sma = sum(prices[:period]) / period
        ema.append(sma)
        
        for price in prices[period:]:
            ema.append((price - ema[-1]) * multiplier + ema[-1])
        
        # 补齐长度
        ema = [prices[0]] * (period - 1) + ema
        return ema
    
    def generate_signals(self, data: List[Dict]) -> List[Dict]:
        """生成交易信号"""
        min_period = self.slow_period + self.signal_period
        
        if len(data) < min_period:
            return [{'signal': SignalType.HOLD, 'reason': '数据不足'}] * len(data)
        
        closes = [d['close'] for d in data]
        
        # 计算EMA
        ema_fast = self.calculate_ema(closes, self.fast_period)
        ema_slow = self.calculate_ema(closes, self.slow_period)
        
        # 计算DIF (快线-慢线)
        dif = [ema_fast[i] - ema_slow[i] for i in range(len(closes))]
        
        # 计算DEA (DIF的EMA)
        dea = self.calculate_ema(dif, self.signal_period)
        
        # 计算MACD柱
        macd_hist = [(dif[i] - dea[i]) * 2 for i in range(len(closes))]
        
        signals = []
        
        for i in range(len(data)):
            if i < self.slow_period:
                signals.append({'signal': SignalType.HOLD, 'reason': 'MACD计算中'})
                continue
            
            # 检查金叉/死叉
            if i > self.slow_period:
                prev_dif = dif[i-1]
                prev_dea = dea[i-1]
                curr_dif = dif[i]
                curr_dea = dea[i]
                
                # 金叉: DIF上穿DEA
                if prev_dif <= prev_dea and curr_dif > curr_dea:
                    signals.append({
                        'signal': SignalType.BUY,
                        'reason': 'DIF上穿DEA (金叉)',
                        'dif': round(curr_dif, 4),
                        'dea': round(curr_dea, 4),
                        'hist': round(macd_hist[i], 4)
                    })
                # 死叉: DIF下穿DEA
                elif prev_dif >= prev_dea and curr_dif < curr_dea:
                    signals.append({
                        'signal': SignalType.SELL,
                        'reason': 'DIF下穿DEA (死叉)',
                        'dif': round(curr_dif, 4),
                        'dea': round(curr_dea, 4),
                        'hist': round(macd_hist[i], 4)
                    })
                else:
                    position = "DIF在DEA上方" if curr_dif > curr_dea else "DIF在DEA下方"
                    signals.append({
                        'signal': SignalType.HOLD,
                        'reason': position,
                        'dif': round(curr_dif, 4),
                        'dea': round(curr_dea, 4),
                        'hist': round(macd_hist[i], 4)
                    })
            else:
                signals.append({'signal': SignalType.HOLD, 'reason': '计算中'})
        
        self.signals = signals
        return signals


class BacktestEngine:
    """回测引擎"""
    
    def __init__(self, initial_capital: float = 100000):
        self.initial_capital = initial_capital
        self.commission_rate = 0.0003  # 手续费率 0.03%
        self.min_commission = 5  # 最低手续费5元
    
    def calculate_sharpe_ratio(self, returns: List[float], risk_free_rate: float = 0.03) -> float:
        """计算夏普比率"""
        if len(returns) < 2:
            return 0
        
        avg_return = np.mean(returns)
        std_return = np.std(returns)
        
        if std_return == 0:
            return 0
        
        # 年化夏普比率 (假设252个交易日)
        sharpe = (avg_return * 252 - risk_free_rate) / (std_return * np.sqrt(252))
        return sharpe
    
    def calculate_max_drawdown(self, equity_curve: List[float]) -> tuple:
        """计算最大回撤及其区间"""
        if not equity_curve or len(equity_curve) < 2:
            return 0, 0, 0
        
        peak = equity_curve[0]
        peak_index = 0
        max_drawdown = 0
        drawdown_start = 0
        drawdown_end = 0
        
        for i, value in enumerate(equity_curve):
            if value > peak:
                peak = value
                peak_index = i
            
            drawdown = (peak - value) / peak
            if drawdown > max_drawdown:
                max_drawdown = drawdown
                drawdown_start = peak_index
                drawdown_end = i
        
        return max_drawdown, drawdown_start, drawdown_end
    
    def run(
        self,
        strategy: StrategyBase,
        data: List[Dict],
        initial_capital: Optional[float] = None
    ) -> BacktestResult:
        """
        执行回测
        
        Args:
            strategy: 策略实例
            data: K线数据
            initial_capital: 初始资金
        
        Returns:
            BacktestResult: 回测结果
        """
        if initial_capital is None:
            initial_capital = self.initial_capital
        
        if not data or len(data) < 30:
            raise ValueError("数据不足，至少需要30条K线数据")
        
        # 生成交易信号
        signals = strategy.generate_signals(data)
        
        # 初始化状态
        cash = initial_capital
        position = 0  # 持仓股数
        trades: List[Trade] = []
        equity_curve: List[Dict] = []
        daily_returns: List[float] = []
        
        # 遍历数据执行回测
        for i, (bar, signal) in enumerate(zip(data, signals)):
            date = bar['date']
            price = bar['close']
            
            # 处理信号
            if signal['signal'] == SignalType.BUY and position == 0:
                # 买入信号
                # 全仓买入
                available_cash = cash * 0.999  # 预留手续费
                shares = int(available_cash / price / 100) * 100  # 整手买入
                
                if shares >= 100:
                    amount = shares * price
                    commission = max(amount * self.commission_rate, self.min_commission)
                    total_cost = amount + commission
                    
                    if total_cost <= cash:
                        position = shares
                        cash -= total_cost
                        
                        trades.append(Trade(
                            date=date,
                            action='buy',
                            price=price,
                            shares=shares,
                            amount=amount,
                            signal=signal['reason'],
                            reason=f"买入{shares}股 @ {price:.2f}"
                        ))
            
            elif signal['signal'] == SignalType.SELL and position > 0:
                # 卖出信号
                # 全仓卖出
                amount = position * price
                commission = max(amount * self.commission_rate, self.min_commission)
                total_income = amount - commission
                
                cash += total_income
                
                trades.append(Trade(
                    date=date,
                    action='sell',
                    price=price,
                    shares=position,
                    amount=amount,
                    signal=signal['reason'],
                    reason=f"卖出{position}股 @ {price:.2f}"
                ))
                
                position = 0
            
            # 计算当日总资产
            market_value = position * price
            total_equity = cash + market_value
            
            # 记录权益曲线
            equity_curve.append({
                'date': date,
                'equity': round(total_equity, 2),
                'cash': round(cash, 2),
                'position': position,
                'market_value': round(market_value, 2),
                'price': price,
                'signal': signal.get('reason', ''),
                'hold_return': round((total_equity - initial_capital) / initial_capital, 4)
            })
            
            # 计算日收益率
            if i > 0:
                prev_equity = equity_curve[i-1]['equity']
                daily_return = (total_equity - prev_equity) / prev_equity
                daily_returns.append(daily_return)
        
        # 回测结束，如果还有持仓，按最后价格计算
        final_price = data[-1]['close']
        final_equity = cash + position * final_price
        
        # 计算收益率
        total_return = (final_equity - initial_capital) / initial_capital
        
        # 计算年化收益率
        days = len(data)
        years = days / 252  # 假设每年252个交易日
        annualized_return = (1 + total_return) ** (1 / years) - 1 if years > 0 and total_return > -1 else 0
        
        # 计算最大回撤
        equity_values = [e['equity'] for e in equity_curve]
        max_dd, dd_start, dd_end = self.calculate_max_drawdown(equity_values)
        
        max_drawdown_period = {
            'start': equity_curve[dd_start]['date'] if dd_start < len(equity_curve) else '',
            'end': equity_curve[dd_end]['date'] if dd_end < len(equity_curve) else ''
        }
        
        # 计算夏普比率
        sharpe_ratio = self.calculate_sharpe_ratio(daily_returns)
        
        # 统计交易
        total_trades = len(trades) // 2  # 买卖算一次完整交易
        
        # 分析盈亏
        profits = []
        losses = []
        
        buy_trades = [t for t in trades if t.action == 'buy']
        sell_trades = [t for t in trades if t.action == 'sell']
        
        for i, sell in enumerate(sell_trades):
            if i < len(buy_trades):
                buy = buy_trades[i]
                profit = (sell.price - buy.price) * sell.shares
                profit_pct = (sell.price - buy.price) / buy.price
                
                if profit > 0:
                    profits.append(profit_pct)
                else:
                    losses.append(abs(profit_pct))
        
        winning_trades = len(profits)
        losing_trades = len(losses)
        win_rate = winning_trades / (winning_trades + losing_trades) if (winning_trades + losing_trades) > 0 else 0
        
        avg_profit = np.mean(profits) if profits else 0
        avg_loss = np.mean(losses) if losses else 0
        
        profit_factor = (sum(profits) / sum(losses)) if losses and sum(losses) > 0 else (sum(profits) if profits else 0)
        
        return BacktestResult(
            strategy_id=strategy.__class__.__name__.replace('Strategy', '').lower(),
            symbol=data[0].get('symbol', ''),
            start_date=data[0]['date'],
            end_date=data[-1]['date'],
            initial_capital=initial_capital,
            final_capital=final_equity,
            total_return=total_return,
            annualized_return=annualized_return,
            max_drawdown=max_dd,
            sharpe_ratio=sharpe_ratio,
            total_trades=total_trades,
            winning_trades=winning_trades,
            losing_trades=losing_trades,
            win_rate=win_rate,
            avg_profit=avg_profit,
            avg_loss=avg_loss,
            profit_factor=profit_factor,
            trades=trades,
            equity_curve=equity_curve,
            max_drawdown_period=max_drawdown_period
        )


# 策略注册表
STRATEGIES = {
    'dual_ma': {
        'name': '双均线策略',
        'description': '基于短期和长期均线交叉产生交易信号',
        'class': DualMAStrategy,
        'default_params': {
            'short_period': 5,
            'long_period': 20,
            'initial_capital': 100000
        }
    },
    'macd': {
        'name': 'MACD策略',
        'description': '基于MACD指标金叉死叉产生交易信号',
        'class': MACDStrategy,
        'default_params': {
            'fast_period': 12,
            'slow_period': 26,
            'signal_period': 9,
            'initial_capital': 100000
        }
    }
}


def get_strategy_list() -> List[Dict]:
    """获取策略列表"""
    return [
        {
            'id': strategy_id,
            'name': info['name'],
            'description': info['description'],
            'parameters': info['default_params']
        }
        for strategy_id, info in STRATEGIES.items()
    ]


def create_strategy(strategy_id: str, parameters: Dict[str, Any]) -> StrategyBase:
    """创建策略实例"""
    if strategy_id not in STRATEGIES:
        raise ValueError(f"未知策略: {strategy_id}")
    
    strategy_class = STRATEGIES[strategy_id]['class']
    return strategy_class(parameters)
