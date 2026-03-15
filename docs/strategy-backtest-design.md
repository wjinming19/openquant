# OpenQuant 策略回测模块详细设计

## 1. 模块概述

### 1.1 功能目标
- 支持多种经典量化策略的回测
- 提供可视化回测结果展示
- 支持参数优化和策略对比
- 生成详细的回测报告

### 1.2 核心特性
- 双均线策略
- MACD策略
- RSI策略
- 多因子组合策略
- 自定义策略（预留接口）

---

## 2. 策略定义

### 2.1 双均线策略 (Dual MA)

```typescript
interface DualMAStrategy {
  name: '双均线策略';
  description: '短期均线上穿长期均线买入，下穿卖出';
  
  parameters: {
    shortPeriod: number;      // 短期均线周期，默认5
    longPeriod: number;       // 长期均线周期，默认20
    initialCapital: number;   // 初始资金，默认100000
    positionSize: number;     // 仓位比例，默认1.0（满仓）
  };
  
  signals: {
    buy: '短期均线上穿长期均线（金叉）';
    sell: '短期均线下穿长期均线（死叉）';
  };
}
```

**回测逻辑**:
```python
def backtest_dual_ma(data, short_period=5, long_period=20):
    # 计算均线
    data['ma_short'] = data['close'].rolling(short_period).mean()
    data['ma_long'] = data['close'].rolling(long_period).mean()
    
    # 生成信号
    data['signal'] = 0
    data['signal'][short_period:] = np.where(
        data['ma_short'][short_period:] > data['ma_long'][short_period:], 1, 0
    )
    data['position'] = data['signal'].diff()
    
    # 执行交易
    trades = []
    position = 0
    capital = initial_capital
    
    for i, row in data.iterrows():
        if row['position'] == 1 and position == 0:  # 买入信号
            position = capital / row['close']
            capital = 0
            trades.append({
                'date': row['date'],
                'type': 'buy',
                'price': row['close'],
                'shares': position
            })
        elif row['position'] == -1 and position > 0:  # 卖出信号
            capital = position * row['close']
            trades.append({
                'date': row['date'],
                'type': 'sell',
                'price': row['close'],
                'shares': position,
                'pnl': capital - initial_capital
            })
            position = 0
    
    return calculate_metrics(trades, data)
```

### 2.2 MACD策略

```typescript
interface MACDStrategy {
  name: 'MACD策略';
  description: 'MACD金叉买入，死叉卖出';
  
  parameters: {
    fastPeriod: number;       // 快线周期，默认12
    slowPeriod: number;       // 慢线周期，默认26
    signalPeriod: number;     // 信号线周期，默认9
    initialCapital: number;
    positionSize: number;
  };
}
```

### 2.3 RSI策略

```typescript
interface RSIStrategy {
  name: 'RSI策略';
  description: 'RSI超卖买入，超买卖出';
  
  parameters: {
    period: number;           // RSI周期，默认14
    oversold: number;         // 超卖阈值，默认30
    overbought: number;       // 超买阈值，默认70
    initialCapital: number;
    positionSize: number;
  };
}
```

### 2.4 多因子组合策略

```typescript
interface MultiFactorStrategy {
  name: '多因子策略';
  description: '综合MACD、RSI、均线等多个因子评分决策';
  
  parameters: {
    macdWeight: number;       // MACD权重
    rsiWeight: number;        // RSI权重
    maWeight: number;         // 均线权重
    scoreThreshold: number;   // 买入阈值
    sellThreshold: number;    // 卖出阈值
    initialCapital: number;
    positionSize: number;
  };
}
```

---

## 3. 回测引擎设计

### 3.1 回测流程

```
用户选择策略
    ↓
设置回测参数（时间范围、初始资金等）
    ↓
加载历史数据
    ↓
执行回测计算
    ↓
生成回测结果
    ↓
可视化展示
```

### 3.2 核心算法

```python
class BacktestEngine:
    def __init__(self, strategy, data, **params):
        self.strategy = strategy
        self.data = data
        self.params = params
        self.trades = []
        self.equity_curve = []
        
    def run(self):
        """执行回测"""
        # 1. 数据预处理
        self._prepare_data()
        
        # 2. 生成交易信号
        signals = self.strategy.generate_signals(self.data)
        
        # 3. 模拟交易执行
        self._execute_trades(signals)
        
        # 4. 计算收益曲线
        self._calculate_equity_curve()
        
        # 5. 计算风险指标
        self._calculate_metrics()
        
        return self._get_results()
    
    def _prepare_data(self):
        """数据预处理"""
        # 复权处理
        # 数据清洗
        # 计算技术指标
        pass
    
    def _execute_trades(self, signals):
        """执行交易"""
        capital = self.params['initial_capital']
        position = 0
        
        for i, signal in enumerate(signals):
            price = self.data.iloc[i]['close']
            date = self.data.iloc[i]['date']
            
            if signal == 1 and position == 0:  # 买入
                shares = (capital * self.params['position_size']) / price
                position = shares
                capital -= shares * price
                self.trades.append({
                    'date': date,
                    'type': 'buy',
                    'price': price,
                    'shares': shares
                })
                
            elif signal == -1 and position > 0:  # 卖出
                capital += position * price
                pnl = capital - self.params['initial_capital']
                self.trades.append({
                    'date': date,
                    'type': 'sell',
                    'price': price,
                    'shares': position,
                    'pnl': pnl
                })
                position = 0
            
            # 记录每日净值
            total_value = capital + position * price
            self.equity_curve.append({
                'date': date,
                'value': total_value,
                'return': (total_value - self.params['initial_capital']) / self.params['initial_capital']
            })
    
    def _calculate_metrics(self):
        """计算风险指标"""
        returns = [e['return'] for e in self.equity_curve]
        
        self.metrics = {
            'total_return': returns[-1] if returns else 0,
            'annualized_return': self._calc_annualized_return(returns),
            'max_drawdown': self._calc_max_drawdown(),
            'sharpe_ratio': self._calc_sharpe_ratio(returns),
            'win_rate': self._calc_win_rate(),
            'profit_factor': self._calc_profit_factor(),
            'total_trades': len(self.trades) // 2,  # 买入卖出算一次完整交易
        }
    
    def _calc_max_drawdown(self):
        """计算最大回撤"""
        peak = 0
        max_dd = 0
        for point in self.equity_curve:
            if point['value'] > peak:
                peak = point['value']
            dd = (peak - point['value']) / peak
            if dd > max_dd:
                max_dd = dd
        return max_dd
    
    def _calc_sharpe_ratio(self, returns):
        """计算夏普比率"""
        if len(returns) < 2:
            return 0
        excess_returns = np.diff(returns)
        if np.std(excess_returns) == 0:
            return 0
        return np.mean(excess_returns) / np.std(excess_returns) * np.sqrt(252)
```

---

## 4. API接口设计

### 4.1 策略列表

```typescript
// GET /api/strategy/list
interface GetStrategyListResponse {
  code: number;
  message: string;
  data: {
    strategies: [
      {
        id: 'dual_ma';
        name: '双均线策略';
        description: '短期均线上穿长期均线买入，下穿卖出';
        parameters: {
          shortPeriod: { type: 'number'; default: 5; min: 2; max: 20 };
          longPeriod: { type: 'number'; default: 20; min: 10; max: 60 };
          initialCapital: { type: 'number'; default: 100000; min: 10000 };
          positionSize: { type: 'number'; default: 1.0; min: 0.1; max: 1.0 };
        };
      },
      {
        id: 'macd';
        name: 'MACD策略';
        description: 'MACD金叉买入，死叉卖出';
        parameters: {
          fastPeriod: { type: 'number'; default: 12 };
          slowPeriod: { type: 'number'; default: 26 };
          signalPeriod: { type: 'number'; default: 9 };
          initialCapital: { type: 'number'; default: 100000 };
          positionSize: { type: 'number'; default: 1.0 };
        };
      },
      // ... 更多策略
    ];
  };
}
```

### 4.2 执行回测

```typescript
// POST /api/strategy/backtest
interface BacktestRequest {
  strategyId: string;           // 策略ID
  symbol: string;               // 股票代码
  startDate: string;            // 开始日期
  endDate: string;              // 结束日期
  parameters: {                 // 策略参数
    [key: string]: number;
  };
}

interface BacktestResponse {
  code: number;
  message: string;
  data: {
    summary: {
      totalReturn: number;          // 总收益率
      annualizedReturn: number;     // 年化收益率
      maxDrawdown: number;          // 最大回撤
      sharpeRatio: number;          // 夏普比率
      winRate: number;              // 胜率
      profitFactor: number;         // 盈亏比
      totalTrades: number;          // 总交易次数
      avgHoldingDays: number;       // 平均持仓天数
    };
    trades: [
      {
        id: number;
        entryDate: string;
        exitDate: string;
        entryPrice: number;
        exitPrice: number;
        shares: number;
        pnl: number;
        pnlPercent: number;
        holdingDays: number;
      }
    ];
    equityCurve: [
      {
        date: string;
        value: number;
        return: number;
        benchmark: number;  // 基准收益率（如买入持有）
      }
    ];
    monthlyReturns: [  // 月度收益统计
      {
        month: string;
        return: number;
        benchmark: number;
      }
    ];
  };
}
```

### 4.3 参数优化

```typescript
// POST /api/strategy/optimize
interface OptimizeRequest {
  strategyId: string;
  symbol: string;
  startDate: string;
  endDate: string;
  parameterRanges: {
    [key: string]: {
      min: number;
      max: number;
      step: number;
    };
  };
  optimizeTarget: 'totalReturn' | 'sharpeRatio' | 'winRate' | 'maxDrawdown';
}

interface OptimizeResponse {
  code: number;
  message: string;
  data: {
    bestParameters: { [key: string]: number };
    bestMetrics: BacktestSummary;
    optimizationCurve: [
      {
        parameters: { [key: string]: number };
        metrics: BacktestSummary;
      }
    ];
    heatmapData?: any;  // 两参数优化的热力图数据
  };
}
```

---

## 5. 前端界面设计

### 5.1 页面布局

```
┌─────────────────────────────────────────────────────────────┐
│  策略回测                                                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────────────────────────────┐   │
│  │ 策略选择     │  │          参数设置区                  │   │
│  │             │  │                                     │   │
│  │ ○ 双均线    │  │  短期均线: [5  ▼] 长期均线: [20 ▼]  │   │
│  │ ○ MACD     │  │                                     │   │
│  │ ○ RSI      │  │  初始资金: [100000    ]            │   │
│  │ ○ 多因子    │  │                                     │   │
│  │             │  │  仓位比例: [100%  ▼]               │   │
│  │             │  │                                     │   │
│  │             │  │  回测区间:                           │   │
│  │             │  │  [2023-01-01 ▼] 至 [2024-01-01 ▼]  │   │
│  │             │  │                                     │   │
│  │             │  │  [开始回测] [参数优化]               │   │
│  └─────────────┘  └─────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    回测结果区                            │ │
│  │                                                          │ │
│  │  总收益: +35.2%  年化: 35.2%  最大回撤: -12.5%          │ │
│  │  夏普比率: 1.85   胜率: 58%   交易次数: 23              │ │
│  │                                                          │ │
│  │  ┌─────────────────────────────────────────────────┐    │ │
│  │  │           收益曲线图 (ECharts)                   │    │ │
│  │  │                                                 │    │ │
│  │  └─────────────────────────────────────────────────┘    │ │
│  │                                                          │ │
│  │  ┌───────────────────┐  ┌───────────────────────────┐   │ │
│  │  │   交易明细表格     │  │   月度收益统计            │   │ │
│  │  │                   │  │                           │   │ │
│  │  └───────────────────┘  └───────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 组件清单

```typescript
// 策略选择器
interface StrategySelectorProps {
  strategies: Strategy[];
  selectedId: string;
  onSelect: (id: string) => void;
}

// 参数面板
interface ParameterPanelProps {
  strategy: Strategy;
  values: { [key: string]: number };
  onChange: (key: string, value: number) => void;
  dateRange: [string, string];
  onDateRangeChange: (dates: [string, string]) => void;
}

// 回测结果卡片
interface BacktestResultCardProps {
  summary: BacktestSummary;
  loading?: boolean;
}

// 收益曲线图
interface EquityCurveChartProps {
  data: EquityPoint[];
  benchmark?: boolean;
}

// 交易明细表
interface TradeTableProps {
  trades: TradeRecord[];
}
```

---

## 6. 数据库设计

### 6.1 回测结果表

```sql
CREATE TABLE backtest_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    strategy_id VARCHAR(50) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    parameters JSON NOT NULL,  -- 策略参数
    total_return DECIMAL(10,4),
    annualized_return DECIMAL(10,4),
    max_drawdown DECIMAL(10,4),
    sharpe_ratio DECIMAL(10,4),
    win_rate DECIMAL(5,2),
    profit_factor DECIMAL(10,4),
    total_trades INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE backtest_trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backtest_id INTEGER,
    entry_date DATE,
    exit_date DATE,
    entry_price DECIMAL(10,2),
    exit_price DECIMAL(10,2),
    shares DECIMAL(15,2),
    pnl DECIMAL(15,2),
    FOREIGN KEY (backtest_id) REFERENCES backtest_results(id)
);
```

---

## 7. 实现路线图

### Phase 1: 基础回测 (1-2周)
- [ ] 双均线策略实现
- [ ] 回测引擎开发
- [ ] 基础API接口
- [ ] 简单结果展示

### Phase 2: 多策略支持 (1周)
- [ ] MACD策略
- [ ] RSI策略
- [ ] 策略参数配置UI

### Phase 3: 可视化优化 (1周)
- [ ] 收益曲线图
- [ ] 交易明细表
- [ ] 结果指标卡片

### Phase 4: 高级功能 (1-2周)
- [ ] 参数优化
- [ ] 策略对比
- [ ] 回测报告导出

---

*设计文档完成 - 2026-03-15*
