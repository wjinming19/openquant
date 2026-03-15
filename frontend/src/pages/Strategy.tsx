import React, { useState, useEffect } from 'react';
import { Layout, Menu, Card, Row, Col, Button, Select, InputNumber, DatePicker, Typography, Space, Tag, Statistic, Tabs, Table, Spin, Alert } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import axios from 'axios';
import './Dashboard.css';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const API_BASE = 'http://170.106.119.80:8089/api';

interface PageProps {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

// 策略列表
const strategies = [
  {
    id: 'dual_ma',
    name: '双均线策略',
    description: '短期均线上穿长期均线买入，下穿卖出',
    parameters: {
      shortPeriod: { label: '短期均线', default: 5, min: 2, max: 20 },
      longPeriod: { label: '长期均线', default: 20, min: 10, max: 60 },
      initialCapital: { label: '初始资金', default: 100000, min: 10000, step: 10000 },
    }
  },
  {
    id: 'macd',
    name: 'MACD策略',
    description: 'MACD金叉买入，死叉卖出',
    parameters: {
      fastPeriod: { label: '快线周期', default: 12, min: 5, max: 20 },
      slowPeriod: { label: '慢线周期', default: 26, min: 15, max: 40 },
      signalPeriod: { label: '信号线周期', default: 9, min: 5, max: 15 },
      initialCapital: { label: '初始资金', default: 100000, min: 10000, step: 10000 },
    }
  },
  {
    id: 'rsi',
    name: 'RSI策略',
    description: 'RSI超卖买入，超买卖出',
    parameters: {
      period: { label: 'RSI周期', default: 14, min: 5, max: 30 },
      oversold: { label: '超卖阈值', default: 30, min: 10, max: 40 },
      overbought: { label: '超买阈值', default: 70, min: 60, max: 90 },
      initialCapital: { label: '初始资金', default: 100000, min: 10000, step: 10000 },
    }
  }
];

const Strategy: React.FC<PageProps> = ({ darkMode, setDarkMode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedStrategy, setSelectedStrategy] = useState('dual_ma');
  const [symbol, setSymbol] = useState('600519');
  const [dateRange, setDateRange] = useState(['2024-01-01', '2024-12-31']);
  const [params, setParams] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const menuItems = [
    { key: '/dashboard', icon: '📊', label: '大盘情绪' },
    { key: '/strategy', icon: '📈', label: '策略回测' },
    { key: '/stock-select', icon: '🔍', label: '量化选股' },
    { key: '/industry', icon: '🏭', label: '行业分析' },
    { key: '/market', icon: '💹', label: '实时行情' },
    { key: '/watchlist', icon: '⭐', label: '自选股' },
    { key: '/ai-analysis', icon: '🤖', label: 'AI分析' },
  ];

  const currentStrategy = strategies.find(s => s.id === selectedStrategy);

  // 初始化参数
  useEffect(() => {
    if (currentStrategy) {
      const defaultParams: any = {};
      Object.entries(currentStrategy.parameters).forEach(([key, config]: [string, any]) => {
        defaultParams[key] = config.default;
      });
      setParams(defaultParams);
    }
  }, [selectedStrategy]);

  const handleMenuClick = (key: string) => {
    navigate(key);
  };

  // 执行回测
  const runBacktest = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API_BASE}/strategy/backtest`, {
        strategy_id: selectedStrategy,
        symbol,
        start_date: dateRange[0],
        end_date: dateRange[1],
        parameters: params
      });
      setResult(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || '回测执行失败');
    } finally {
      setLoading(false);
    }
  };

  // 收益曲线图表配置
  const getEquityChartOption = () => {
    if (!result?.equity_curve) return {};
    
    const dates = result.equity_curve.map((item: any) => item.date);
    const values = result.equity_curve.map((item: any) => item.value);
    const benchmark = result.equity_curve.map((item: any) => item.benchmark);

    return {
      backgroundColor: 'transparent',
      title: {
        text: '收益曲线',
        left: 'center',
        textStyle: { color: darkMode ? '#fff' : '#333', fontSize: 14 }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          return `${params[0].name}<br/>` +
            `策略: ¥${params[0].value.toFixed(0)}<br/>` +
            (params[1] ? `基准: ¥${params[1].value.toFixed(0)}` : '');
        }
      },
      legend: {
        data: ['策略收益', '买入持有'],
        top: 25,
        textStyle: { color: darkMode ? '#999' : '#666' }
      },
      grid: { left: '10%', right: '8%', top: '20%', bottom: '15%' },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: darkMode ? '#444' : '#ddd' } },
        axisLabel: { color: darkMode ? '#888' : '#999', fontSize: 10 }
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: darkMode ? '#444' : '#ddd' } },
        axisLabel: { 
          color: darkMode ? '#888' : '#999', 
          fontSize: 10,
          formatter: (val: number) => `¥${(val/10000).toFixed(0)}万`
        },
        splitLine: { lineStyle: { color: darkMode ? '#333' : '#f0f0f0' } }
      },
      series: [
        {
          name: '策略收益',
          type: 'line',
          data: values,
          smooth: true,
          lineStyle: { color: '#1890ff', width: 2 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(24,144,255,0.3)' },
                { offset: 1, color: 'rgba(24,144,255,0.05)' }
              ]
            }
          }
        },
        {
          name: '买入持有',
          type: 'line',
          data: benchmark,
          smooth: true,
          lineStyle: { color: '#999', width: 1, type: 'dashed' }
        }
      ]
    };
  };

  // 交易表格列
  const tradeColumns = [
    { title: '序号', render: (_: any, __: any, idx: number) => idx + 1, width: 60 },
    { title: '买入日期', dataIndex: 'entry_date', width: 100 },
    { title: '卖出日期', dataIndex: 'exit_date', width: 100 },
    { title: '买入价', dataIndex: 'entry_price', render: (v: number) => `¥${v?.toFixed(2)}`, width: 80 },
    { title: '卖出价', dataIndex: 'exit_price', render: (v: number) => `¥${v?.toFixed(2)}`, width: 80 },
    { title: '持仓天数', dataIndex: 'holding_days', width: 80 },
    { 
      title: '盈亏', 
      dataIndex: 'pnl', 
      render: (v: number) => (
        <span style={{ color: v >= 0 ? '#f5222d' : '#52c41a' }}>
          {v >= 0 ? '+' : ''}{v?.toFixed(2)}
        </span>
      ),
      width: 100
    },
    { 
      title: '盈亏率', 
      dataIndex: 'pnl_percent', 
      render: (v: number) => (
        <Tag color={v >= 0 ? 'red' : 'green'}>
          {v >= 0 ? '+' : ''}{v?.toFixed(2)}%
        </Tag>
      ),
      width: 100
    }
  ];

  return (
    <Layout className={`dashboard ${darkMode ? 'dark' : 'light'}`}>
      <Header className="header">
        <div className="logo">📊 OpenQuant</div>
      </Header>
      
      <Layout>
        <Sider width={180} className="sider">
          <Menu 
            mode="inline" 
            selectedKeys={[location.pathname]}
            theme={darkMode ? 'dark' : 'light'}
            onClick={({ key }) => handleMenuClick(key)}
            items={menuItems.map(item => ({
              key: item.key,
              label: `${item.icon} ${item.label}`,
            }))}
          />
        </Sider>
        
        <Content className="content">
          <Title level={4} style={{ marginBottom: 16 }}>📈 策略回测</Title>
          
          <Row gutter={[16, 16]}>
            {/* 左侧策略选择 */}
            <Col xs={24} lg={6}>
              <Card title="选择策略" size="small">
                <Select
                  value={selectedStrategy}
                  onChange={setSelectedStrategy}
                  style={{ width: '100%', marginBottom: 12 }}
                  options={strategies.map(s => ({ label: s.name, value: s.id }))}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {currentStrategy?.description}
                </Text>
              </Card>

              <Card title="回测参数" size="small" style={{ marginTop: 12 }}>
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                  <div>
                    <Text strong style={{ fontSize: 12 }}>股票代码</Text>
                    <Select
                      value={symbol}
                      onChange={setSymbol}
                      style={{ width: '100%' }}
                      options={[
                        { label: '贵州茅台 (600519)', value: '600519' },
                        { label: '中国平安 (601318)', value: '601318' },
                        { label: '宁德时代 (300750)', value: '300750' },
                        { label: '比亚迪 (002594)', value: '002594' },
                      ]}
                    />
                  </div>

                  <div>
                    <Text strong style={{ fontSize: 12 }}>回测区间</Text>
                    <RangePicker
                      onChange={(dates: any) => {
                        if (dates) {
                          setDateRange([dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')]);
                        }
                      }}
                      style={{ width: '100%' }}
                      size="small"
                    />
                  </div>

                  {currentStrategy && Object.entries(currentStrategy.parameters).map(([key, config]: [string, any]) => (
                    <div key={key}>
                      <Text strong style={{ fontSize: 12 }}>{config.label}</Text>
                      <InputNumber
                        value={params[key]}
                        onChange={(val) => setParams({...params, [key]: val})}
                        min={config.min}
                        max={config.max}
                        step={config.step || 1}
                        style={{ width: '100%' }}
                        size="small"
                      />
                    </div>
                  ))}

                  <Button 
                    type="primary" 
                    onClick={runBacktest} 
                    loading={loading}
                    style={{ width: '100%' }}
                  >
                    开始回测
                  </Button>
                </Space>
              </Card>
            </Col>

            {/* 右侧结果展示 */}
            <Col xs={24} lg={18}>
              {error && <Alert message={error} type="error" style={{ marginBottom: 12 }} />}

              {result ? (
                <>
                  {/* 指标卡片 */}
                  <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                    <Col xs={12} sm={6}>
                      <Card size="small">
                        <Statistic 
                          title="总收益率" 
                          value={result.summary?.total_return || 0}
                          precision={2}
                          suffix="%"
                          valueStyle={{ 
                            color: (result.summary?.total_return || 0) >= 0 ? '#f5222d' : '#52c41a',
                            fontSize: 20
                          }}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Card size="small">
                        <Statistic 
                          title="年化收益率" 
                          value={result.summary?.annualized_return || 0}
                          precision={2}
                          suffix="%"
                          valueStyle={{ fontSize: 18 }}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Card size="small">
                        <Statistic 
                          title="最大回撤" 
                          value={result.summary?.max_drawdown || 0}
                          precision={2}
                          suffix="%"
                          valueStyle={{ color: '#52c41a', fontSize: 18 }}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Card size="small">
                        <Statistic 
                          title="夏普比率" 
                          value={result.summary?.sharpe_ratio || 0}
                          precision={2}
                          valueStyle={{ fontSize: 18 }}
                        />
                      </Card>
                    </Col>
                  </Row>

                  <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                    <Col xs={12} sm={6}>
                      <Card size="small">
                        <Statistic 
                          title="胜率" 
                          value={result.summary?.win_rate || 0}
                          precision={1}
                          suffix="%"
                          valueStyle={{ fontSize: 18 }}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Card size="small">
                        <Statistic 
                          title="交易次数" 
                          value={result.summary?.total_trades || 0}
                          valueStyle={{ fontSize: 18 }}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Card size="small">
                        <Statistic 
                          title="盈亏比" 
                          value={result.summary?.profit_factor || 0}
                          precision={2}
                          valueStyle={{ fontSize: 18 }}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Card size="small">
                        <Statistic 
                          title="平均持仓" 
                          value={result.summary?.avg_holding_days || 0}
                          suffix="天"
                          precision={1}
                          valueStyle={{ fontSize: 18 }}
                        />
                      </Card>
                    </Col>
                  </Row>

                  <Card title="收益曲线" size="small" style={{ marginBottom: 16 }}>
                    <ReactECharts
                      option={getEquityChartOption()}
                      style={{ height: 300 }}
                      theme={darkMode ? 'dark' : undefined}
                    />
                  </Card>

                  <Card title="交易明细" size="small">
                    <Table
                      dataSource={result.trades || []}
                      columns={tradeColumns}
                      rowKey={(record: any) => record.entry_date + '-' + record.exit_date}
                      pagination={{ pageSize: 10 }}
                      size="small"
                      scroll={{ x: 600 }}
                    />
                  </Card>
                </>
              ) : (
                <Card style={{ textAlign: 'center', padding: '60px 0' }}>
                  <Spin spinning={loading}>
                    <Text type="secondary">
                      选择策略和参数，点击"开始回测"查看结果
                    </Text>
                  </Spin>
                </Card>
              )}
            </Col>
          </Row>
        </Content>
      </Layout>
    </Layout>
  );
};

export default Strategy;
