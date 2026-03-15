import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Menu, Card, Row, Col, Table, Typography, Space, Tabs, Badge, Drawer, Spin, Alert, Statistic } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import './Dashboard.css';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface PageProps {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

interface IndustryItem {
  code: string;
  name: string;
  change_pct: number;
  lead_stock: string;
  lead_change: number;
  fund_flow: number;
  pe?: number;
  pb?: number;
  market_cap?: number;
}

interface IndustryStock {
  symbol: string;
  name: string;
  price: number;
  change_pct: number;
  volume: number;
  amount: number;
  fund_flow: number;
  pe?: number;
  pb?: number;
  market_cap?: number;
}

const API_BASE_URL = '/api';

const Industry: React.FC<PageProps> = ({ darkMode, setDarkMode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('industry');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 数据状态
  const [industries, setIndustries] = useState<IndustryItem[]>([]);
  const [concepts, setConcepts] = useState<IndustryItem[]>([]);
  
  // 抽屉状态
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryItem | null>(null);
  const [industryStocks, setIndustryStocks] = useState<IndustryStock[]>([]);
  const [stocksLoading, setStocksLoading] = useState(false);

  const menuItems = [
    { key: '/dashboard', icon: '📊', label: '大盘情绪' },
    { key: '/strategy', icon: '📈', label: '策略回测' },
    { key: '/stock-select', icon: '🔍', label: '量化选股' },
    { key: '/industry', icon: '🏭', label: '行业分析' },
    { key: '/market', icon: '💹', label: '实时行情' },
    { key: '/watchlist', icon: '⭐', label: '自选股' },
    { key: '/ai-analysis', icon: '🤖', label: 'AI分析' },
  ];

  const handleMenuClick = (key: string) => {
    navigate(key);
  };

  // 获取行业列表数据
  const fetchIndustries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/market/industries`);
      if (!response.ok) throw new Error('获取行业数据失败');
      
      const result = await response.json();
      if (result.data) {
        setIndustries(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败');
      console.error('获取行业数据失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取概念板块数据
  const fetchConcepts = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/market/concepts`);
      if (!response.ok) throw new Error('获取概念板块数据失败');
      
      const result = await response.json();
      if (result.data) {
        setConcepts(result.data);
      }
    } catch (err) {
      console.error('获取概念板块数据失败:', err);
    }
  }, []);

  // 获取行业成分股
  const fetchIndustryStocks = async (industryCode: string) => {
    try {
      setStocksLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/market/industries/${industryCode}/stocks`);
      if (!response.ok) throw new Error('获取成分股失败');
      
      const result = await response.json();
      if (result.data) {
        setIndustryStocks(result.data);
      }
    } catch (err) {
      console.error('获取成分股失败:', err);
      setIndustryStocks([]);
    } finally {
      setStocksLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchIndustries();
    fetchConcepts();
    
    // 每30秒刷新一次
    const interval = setInterval(() => {
      fetchIndustries();
      fetchConcepts();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchIndustries, fetchConcepts]);

  // 处理行业点击 - 显示成分股抽屉
  const handleIndustryClick = (industry: IndustryItem) => {
    setSelectedIndustry(industry);
    setDrawerVisible(true);
    fetchIndustryStocks(industry.code);
  };

  // 关闭抽屉
  const handleCloseDrawer = () => {
    setDrawerVisible(false);
    setSelectedIndustry(null);
    setIndustryStocks([]);
  };

  // 获取涨跌幅颜色 (A股: 涨红跌绿)
  const getChangeColor = (value: number) => {
    if (value > 0) return '#f5222d';
    if (value < 0) return '#52c41a';
    return '#999';
  };

  // 格式化涨跌幅
  const formatChange = (value: number) => {
    const prefix = value > 0 ? '+' : '';
    return `${prefix}${value.toFixed(2)}%`;
  };

  // 格式化资金流向
  const formatFundFlow = (value: number) => {
    const prefix = value > 0 ? '+' : '';
    return `${prefix}${value.toFixed(2)}亿`;
  };

  // 热力图配置
  const getHeatmapOption = () => {
    const data = activeTab === 'industry' ? industries : concepts;
    const sortedData = [...data].sort((a, b) => b.change_pct - a.change_pct);
    const top20 = sortedData.slice(0, 20);
    
    return {
      backgroundColor: 'transparent',
      title: {
        text: activeTab === 'industry' ? '行业涨跌幅热力图 (Top 20)' : '概念板块热力图 (Top 20)',
        left: 'center',
        textStyle: { color: darkMode ? '#fff' : '#333', fontSize: 14 }
      },
      tooltip: {
        position: 'top',
        formatter: (params: any) => {
          const item = top20[params.data[1]];
          if (!item) return '';
          return `${item.name}<br/>涨跌幅: ${formatChange(item.change_pct)}<br/>资金流向: ${formatFundFlow(item.fund_flow)}`;
        }
      },
      grid: { top: '15%', bottom: '10%', left: '25%', right: '10%' },
      xAxis: {
        type: 'category',
        data: ['涨跌幅'],
        splitArea: { show: true }
      },
      yAxis: {
        type: 'category',
        data: top20.map(d => d.name),
        splitArea: { show: true },
        axisLabel: { 
          color: darkMode ? '#999' : '#666',
          fontSize: 11
        }
      },
      visualMap: {
        min: -5,
        max: 5,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '0%',
        inRange: {
          color: ['#52c41a', '#e8e8e8', '#f5222d']  // 跌绿涨红
        }
      },
      series: [{
        name: '涨跌幅',
        type: 'heatmap',
        data: top20.map((item, index) => [0, index, item.change_pct]),
        label: {
          show: true,
          formatter: (params: any) => params.data[2].toFixed(1) + '%'
        }
      }]
    };
  };

  // 资金流向图配置
  const getFlowOption = () => {
    const data = activeTab === 'industry' ? industries : concepts;
    const sorted = [...data].sort((a, b) => Math.abs(b.fund_flow) - Math.abs(a.fund_flow)).slice(0, 15);
    
    return {
      backgroundColor: 'transparent',
      title: {
        text: '资金流向排行 (Top 15)',
        left: 'center',
        textStyle: { color: darkMode ? '#fff' : '#333', fontSize: 14 }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      grid: { left: '20%', right: '10%', top: '15%', bottom: '10%' },
      xAxis: {
        type: 'value',
        axisLabel: { formatter: '{value}亿', color: darkMode ? '#999' : '#666' }
      },
      yAxis: {
        type: 'category',
        data: sorted.map(d => d.name).reverse(),
        axisLabel: { 
          color: darkMode ? '#999' : '#666', 
          fontSize: 10 
        }
      },
      series: [{
        type: 'bar',
        data: sorted.map(d => d.fund_flow).reverse(),
        itemStyle: {
          color: (params: any) => params.value >= 0 ? '#f5222d' : '#52c41a'  // 涨红跌绿
        },
        label: {
          show: true,
          position: 'right',
          formatter: '{c}亿'
        }
      }]
    };
  };

  // 行业表格列配置
  const columns = [
    {
      title: '排名',
      width: 60,
      render: (_: any, __: any, index: number) => <Text>{index + 1}</Text>
    },
    {
      title: '板块名称',
      dataIndex: 'name',
      render: (name: string, record: IndustryItem) => (
        <a 
          onClick={() => handleIndustryClick(record)}
          style={{ fontWeight: 'bold', cursor: 'pointer' }}
        >
          {name}
        </a>
      )
    },
    {
      title: '涨跌幅',
      dataIndex: 'change_pct',
      align: 'right' as const,
      sorter: (a: IndustryItem, b: IndustryItem) => a.change_pct - b.change_pct,
      defaultSortOrder: 'descend' as const,
      render: (change: number) => (
        <span style={{ 
          color: getChangeColor(change),
          fontWeight: 'bold'
        }}>
          {formatChange(change)}
        </span>
      )
    },
    {
      title: '龙头股',
      dataIndex: 'lead_stock',
      render: (lead: string, record: IndustryItem) => (
        <Space>
          <Text>{lead}</Text>
          <Badge 
            count={formatChange(record.lead_change)}
            style={{ 
              backgroundColor: record.lead_change >= 0 ? '#f5222d' : '#52c41a',
              fontSize: 10
            }} 
          />
        </Space>
      )
    },
    {
      title: '资金流向',
      dataIndex: 'fund_flow',
      align: 'right' as const,
      sorter: (a: IndustryItem, b: IndustryItem) => a.fund_flow - b.fund_flow,
      render: (flow: number) => (
        <span style={{ color: getChangeColor(flow) }}>
          {formatFundFlow(flow)}
        </span>
      )
    },
    {
      title: 'PE',
      dataIndex: 'pe',
      align: 'right' as const,
      render: (pe?: number) => pe ? pe.toFixed(2) : '-'
    },
    {
      title: 'PB',
      dataIndex: 'pb',
      align: 'right' as const,
      render: (pb?: number) => pb ? pb.toFixed(2) : '-'
    }
  ];

  // 成分股表格列配置
  const stockColumns = [
    {
      title: '排名',
      width: 50,
      render: (_: any, __: any, index: number) => <Text>{index + 1}</Text>
    },
    {
      title: '股票代码',
      dataIndex: 'symbol',
      render: (symbol: string) => <Text type="secondary">{symbol}</Text>
    },
    {
      title: '股票名称',
      dataIndex: 'name',
      render: (name: string) => <Text strong>{name}</Text>
    },
    {
      title: '最新价',
      dataIndex: 'price',
      align: 'right' as const,
      render: (price: number) => <Text>¥{price.toFixed(2)}</Text>
    },
    {
      title: '涨跌幅',
      dataIndex: 'change_pct',
      align: 'right' as const,
      sorter: (a: IndustryStock, b: IndustryStock) => a.change_pct - b.change_pct,
      render: (change: number) => (
        <span style={{ 
          color: getChangeColor(change),
          fontWeight: 'bold'
        }}>
          {formatChange(change)}
        </span>
      )
    },
    {
      title: '资金流向',
      dataIndex: 'fund_flow',
      align: 'right' as const,
      render: (flow: number) => (
        <span style={{ color: getChangeColor(flow) }}>
          {flow > 0 ? '+' : ''}{flow.toFixed(0)}万
        </span>
      )
    },
    {
      title: '成交额',
      dataIndex: 'amount',
      align: 'right' as const,
      render: (amount: number) => <Text>{(amount / 10000).toFixed(2)}亿</Text>
    },
    {
      title: 'PE',
      dataIndex: 'pe',
      align: 'right' as const,
      render: (pe?: number) => pe ? pe.toFixed(2) : '-'
    },
    {
      title: 'PB',
      dataIndex: 'pb',
      align: 'right' as const,
      render: (pb?: number) => pb ? pb.toFixed(2) : '-'
    }
  ];

  const dataSource = activeTab === 'industry' ? industries : concepts;

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
          <Title level={4} style={{ marginBottom: 16 }}>🏭 行业及板块分析</Title>
          
          {error && (
            <Alert 
              message={error} 
              type="error" 
              showIcon 
              style={{ marginBottom: 16 }}
              closable
              onClose={() => setError(null)}
            />
          )}
          
          {/* 统计卡片 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={12} sm={6}>
              <Card size="small">
                <Statistic 
                  title="上涨板块"
                  value={industries.filter(i => i.change_pct > 0).length}
                  valueStyle={{ color: '#f5222d' }}
                  suffix={`/ ${industries.length}`}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small">
                <Statistic 
                  title="下跌板块"
                  value={industries.filter(i => i.change_pct < 0).length}
                  valueStyle={{ color: '#52c41a' }}
                  suffix={`/ ${industries.length}`}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small">
                <Statistic 
                  title="净流入板块"
                  value={industries.filter(i => i.fund_flow > 0).length}
                  valueStyle={{ color: '#f5222d' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small">
                <Statistic 
                  title="净流出板块"
                  value={industries.filter(i => i.fund_flow < 0).length}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
          </Row>
          
          {/* 图表区域 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} lg={12}>
              <Card size="small" bodyStyle={{ padding: 10 }}>
                <Spin spinning={loading}>
                  <ReactECharts
                    option={getHeatmapOption()}
                    style={{ height: 400 }}
                    theme={darkMode ? 'dark' : undefined}
                  />
                </Spin>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card size="small" bodyStyle={{ padding: 10 }}>
                <Spin spinning={loading}>
                  <ReactECharts
                    option={getFlowOption()}
                    style={{ height: 400 }}
                    theme={darkMode ? 'dark' : undefined}
                  />
                </Spin>
              </Card>
            </Col>
          </Row>

          {/* 数据表格 */}
          <Card size="small">
            <Tabs activeKey={activeTab} onChange={setActiveTab} type="card">
              <TabPane tab={`行业板块 (${industries.length})`} key="industry">
                <Table
                  dataSource={industries}
                  columns={columns}
                  rowKey="code"
                  pagination={{ pageSize: 20 }}
                  size="small"
                  loading={loading}
                  scroll={{ x: 700 }}
                />
              </TabPane>
              <TabPane tab={`概念板块 (${concepts.length})`} key="concept">
                <Table
                  dataSource={concepts}
                  columns={columns}
                  rowKey="code"
                  pagination={{ pageSize: 20 }}
                  size="small"
                  scroll={{ x: 700 }}
                />
              </TabPane>
            </Tabs>
          </Card>
        </Content>
      </Layout>

      {/* 成分股抽屉 */}
      <Drawer
        title={
          selectedIndustry ? (
            <Space>
              <span>{selectedIndustry.name}</span>
              <span style={{ 
                color: getChangeColor(selectedIndustry.change_pct),
                fontSize: 14
              }}>
                {formatChange(selectedIndustry.change_pct)}
              </span>
            </Space>
          ) : '行业成分股'
        }
        placement="right"
        width={900}
        onClose={handleCloseDrawer}
        open={drawerVisible}
      >
        {selectedIndustry && (
          <div style={{ marginBottom: 16 }}>
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Statistic 
                  title="涨跌幅" 
                  value={selectedIndustry.change_pct}
                  valueStyle={{ color: getChangeColor(selectedIndustry.change_pct) }}
                  suffix="%"
                  precision={2}
                />
              </Col>
              <Col span={8}>
                <Statistic 
                  title="资金流向" 
                  value={selectedIndustry.fund_flow}
                  valueStyle={{ color: getChangeColor(selectedIndustry.fund_flow) }}
                  suffix="亿"
                  precision={2}
                />
              </Col>
              <Col span={8}>
                <Statistic 
                  title="龙头股" 
                  value={selectedIndustry.lead_stock}
                  suffix={formatChange(selectedIndustry.lead_change)}
                  valueStyle={{ fontSize: 16 }}
                />
              </Col>
            </Row>
          </div>
        )}
        
        <Table
          dataSource={industryStocks}
          columns={stockColumns}
          rowKey="symbol"
          pagination={{ pageSize: 20 }}
          size="small"
          loading={stocksLoading}
          scroll={{ x: 800 }}
        />
      </Drawer>
    </Layout>
  );
};

export default Industry;
