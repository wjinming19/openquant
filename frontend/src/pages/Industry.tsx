import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Layout, Menu, Card, Row, Col, Table, Typography, Space, Tabs, Badge, Drawer, Spin, Alert, Statistic, Select, Tag, Progress, Radio } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import './Dashboard.css';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

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
  volume?: number;
  amount?: number;
  up_count?: number;
  down_count?: number;
  flat_count?: number;
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

interface IndustryKLine {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type SortField = 'change_pct' | 'fund_flow' | 'volume' | 'amount';
type SortOrder = 'ascend' | 'descend';

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
  
  // 排行排序状态
  const [sortField, setSortField] = useState<SortField>('change_pct');
  const [sortOrder, setSortOrder] = useState<SortOrder>('descend');
  
  // 抽屉状态
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryItem | null>(null);
  const [industryStocks, setIndustryStocks] = useState<IndustryStock[]>([]);
  const [stocksLoading, setStocksLoading] = useState(false);
  const [industryKLine, setIndustryKLine] = useState<IndustryKLine[]>([]);
  const [klineLoading, setKlineLoading] = useState(false);

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

  // 获取行业K线数据（模拟数据，实际应由后端提供）
  const fetchIndustryKLine = async (industryCode: string) => {
    try {
      setKlineLoading(true);
      // 模拟K线数据 - 实际应从后端获取
      const mockData: IndustryKLine[] = [];
      const basePrice = selectedIndustry?.change_pct ? 1000 : 1000;
      let currentPrice = basePrice;
      
      for (let i = 60; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const volatility = 0.02;
        const change = (Math.random() - 0.48) * volatility;
        const open = currentPrice;
        const close = currentPrice * (1 + change);
        const high = Math.max(open, close) * (1 + Math.random() * 0.01);
        const low = Math.min(open, close) * (1 - Math.random() * 0.01);
        const volume = Math.floor(Math.random() * 1000000) + 500000;
        
        mockData.push({
          date: date.toISOString().split('T')[0],
          open: parseFloat(open.toFixed(2)),
          high: parseFloat(high.toFixed(2)),
          low: parseFloat(low.toFixed(2)),
          close: parseFloat(close.toFixed(2)),
          volume
        });
        currentPrice = close;
      }
      
      setIndustryKLine(mockData);
    } catch (err) {
      console.error('获取K线数据失败:', err);
      setIndustryKLine([]);
    } finally {
      setKlineLoading(false);
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
    fetchIndustryKLine(industry.code);
  };

  // 关闭抽屉
  const handleCloseDrawer = () => {
    setDrawerVisible(false);
    setSelectedIndustry(null);
    setIndustryStocks([]);
    setIndustryKLine([]);
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

  // 获取排序后的数据
  const getSortedData = useMemo(() => {
    const data = activeTab === 'industry' ? industries : concepts;
    return [...data].sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      return sortOrder === 'ascend' ? aVal - bVal : bVal - aVal;
    });
  }, [industries, concepts, activeTab, sortField, sortOrder]);

  // 获取涨幅榜/跌幅榜
  const getTopGainers = useMemo(() => {
    return [...industries].sort((a, b) => b.change_pct - a.change_pct).slice(0, 10);
  }, [industries]);

  const getTopLosers = useMemo(() => {
    return [...industries].sort((a, b) => a.change_pct - b.change_pct).slice(0, 10);
  }, [industries]);

  const getTopInflow = useMemo(() => {
    return [...industries].sort((a, b) => b.fund_flow - a.fund_flow).slice(0, 10);
  }, [industries]);

  const getTopOutflow = useMemo(() => {
    return [...industries].sort((a, b) => a.fund_flow - b.fund_flow).slice(0, 10);
  }, [industries]);

  // 矩形树图配置 - 优化版热力图
  const getTreemapOption = () => {
    const data = activeTab === 'industry' ? industries : concepts;
    const sortedData = [...data].sort((a, b) => Math.abs(b.change_pct) - Math.abs(a.change_pct));
    
    const treemapData = sortedData.map(item => ({
      name: item.name,
      value: Math.abs(item.change_pct) + 1,
      change_pct: item.change_pct,
      fund_flow: item.fund_flow,
      itemStyle: {
        color: item.change_pct > 0 
          ? `rgba(245, 34, 45, ${Math.min(Math.abs(item.change_pct) / 5, 1)})`
          : `rgba(82, 196, 26, ${Math.min(Math.abs(item.change_pct) / 5, 1)})`
      }
    }));

    return {
      backgroundColor: 'transparent',
      title: {
        text: activeTab === 'industry' ? '行业板块热力图' : '概念板块热力图',
        left: 'center',
        textStyle: { color: darkMode ? '#fff' : '#333', fontSize: 16, fontWeight: 'bold' }
      },
      tooltip: {
        formatter: (params: any) => {
          const data = params.data;
          return `<div style="font-weight:bold;margin-bottom:5px">${data.name}</div>
                  <div>涨跌幅: <span style="color:${getChangeColor(data.change_pct)};font-weight:bold">${formatChange(data.change_pct)}</span></div>
                  <div>资金流向: <span style="color:${getChangeColor(data.fund_flow)}">${formatFundFlow(data.fund_flow)}</span></div>`;
        }
      },
      series: [{
        type: 'treemap',
        width: '95%',
        height: '85%',
        top: '10%',
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        label: {
          show: true,
          formatter: (params: any) => {
            const data = params.data;
            return `{name|${data.name}}\n{change|${data.change_pct > 0 ? '+' : ''}${data.change_pct.toFixed(2)}%}`;
          },
          rich: {
            name: {
              fontSize: 12,
              fontWeight: 'bold',
              color: '#fff',
              textShadowColor: 'rgba(0,0,0,0.5)',
              textShadowBlur: 3
            },
            change: {
              fontSize: 11,
              color: '#fff',
              fontWeight: 'bold',
              textShadowColor: 'rgba(0,0,0,0.5)',
              textShadowBlur: 3
            }
          }
        },
        itemStyle: {
          borderColor: darkMode ? '#1f1f1f' : '#fff',
          borderWidth: 2,
          gapWidth: 2
        },
        data: treemapData
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
        textStyle: { color: darkMode ? '#fff' : '#333', fontSize: 14, fontWeight: 'bold' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      grid: { left: '22%', right: '10%', top: '15%', bottom: '10%' },
      xAxis: {
        type: 'value',
        axisLabel: { formatter: '{value}亿', color: darkMode ? '#999' : '#666' },
        splitLine: { lineStyle: { color: darkMode ? '#333' : '#eee' } }
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
        data: sorted.map(d => ({
          value: d.fund_flow,
          itemStyle: {
            color: d.fund_flow >= 0 ? '#f5222d' : '#52c41a'
          }
        })).reverse(),
        label: {
          show: true,
          position: 'right',
          formatter: '{c}亿',
          color: darkMode ? '#ccc' : '#666'
        }
      }]
    };
  };

  // 行业K线图配置
  const getKLineOption = () => {
    if (!industryKLine.length) return {};
    
    const dates = industryKLine.map(d => d.date);
    const data = industryKLine.map(d => [d.open, d.close, d.low, d.high]);
    const volumes = industryKLine.map(d => d.volume);
    
    return {
      backgroundColor: 'transparent',
      title: {
        text: `${selectedIndustry?.name} - 行业走势`,
        left: 'center',
        textStyle: { color: darkMode ? '#fff' : '#333', fontSize: 14 }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      legend: {
        data: ['K线', '成交量'],
        top: 30
      },
      grid: [
        { left: '10%', right: '10%', top: '15%', height: '50%' },
        { left: '10%', right: '10%', top: '70%', height: '20%' }
      ],
      xAxis: [
        {
          type: 'category',
          data: dates,
          scale: true,
          boundaryGap: false,
          axisLine: { onZero: false, lineStyle: { color: darkMode ? '#666' : '#ccc' } },
          splitLine: { show: false },
          min: 'dataMin',
          max: 'dataMax'
        },
        {
          type: 'category',
          gridIndex: 1,
          data: dates,
          scale: true,
          boundaryGap: false,
          axisLine: { onZero: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          min: 'dataMin',
          max: 'dataMax'
        }
      ],
      yAxis: [
        {
          scale: true,
          splitArea: { show: true, areaStyle: { color: darkMode ? ['#2a2a2a', '#1f1f1f'] : ['#fafafa', '#f5f5f5'] } },
          axisLine: { lineStyle: { color: darkMode ? '#666' : '#ccc' } },
          axisLabel: { color: darkMode ? '#999' : '#666' }
        },
        {
          scale: true,
          gridIndex: 1,
          splitNumber: 2,
          axisLabel: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false }
        }
      ],
      dataZoom: [
        { type: 'inside', xAxisIndex: [0, 1], start: 50, end: 100 },
        { show: true, xAxisIndex: [0, 1], type: 'slider', top: '92%', start: 50, end: 100 }
      ],
      series: [
        {
          name: 'K线',
          type: 'candlestick',
          data: data,
          itemStyle: {
            color: '#f5222d',
            color0: '#52c41a',
            borderColor: '#f5222d',
            borderColor0: '#52c41a'
          }
        },
        {
          name: '成交量',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: volumes,
          itemStyle: {
            color: (params: any) => {
              const index = params.dataIndex;
              return data[index][1] >= data[index][0] ? '#f5222d' : '#52c41a';
            }
          }
        }
      ]
    };
  };

  // 行业表格列配置
  const columns = [
    {
      title: '排名',
      width: 60,
      render: (_: any, __: any, index: number) => <Text strong>{index + 1}</Text>
    },
    {
      title: '板块名称',
      dataIndex: 'name',
      render: (name: string, record: IndustryItem) => (
        <a 
          onClick={() => handleIndustryClick(record)}
          style={{ fontWeight: 'bold', cursor: 'pointer', color: '#1890ff' }}
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
          fontWeight: 'bold',
          fontSize: 14
        }}>
          {formatChange(change)}
        </span>
      )
    },
    {
      title: '资金流向',
      dataIndex: 'fund_flow',
      align: 'right' as const,
      sorter: (a: IndustryItem, b: IndustryItem) => a.fund_flow - b.fund_flow,
      render: (flow: number) => (
        <span style={{ 
          color: getChangeColor(flow),
          fontWeight: 'bold'
        }}>
          {formatFundFlow(flow)}
        </span>
      )
    },
    {
      title: '龙头股',
      dataIndex: 'lead_stock',
      render: (lead: string, record: IndustryItem) => (
        <Space>
          <Text>{lead}</Text>
          <Tag 
            color={record.lead_change >= 0 ? '#f5222d' : '#52c41a'}
            style={{ fontSize: 11 }}
          >
            {formatChange(record.lead_change)}
          </Tag>
        </Space>
      )
    },
    {
      title: '涨跌分布',
      dataIndex: 'up_count',
      render: (_: any, record: IndustryItem) => {
        const up = record.up_count || 0;
        const down = record.down_count || 0;
        const total = up + down + (record.flat_count || 0);
        if (total === 0) return '-';
        const upPercent = (up / total) * 100;
        return (
          <div style={{ width: 80 }}>
            <Progress 
              percent={upPercent} 
              size="small" 
              strokeColor="#f5222d"
              trailColor="#52c41a"
              showInfo={false}
            />
            <div style={{ fontSize: 10, color: '#999' }}>
              <span style={{ color: '#f5222d' }}>↑{up}</span>
              <span style={{ margin: '0 4px' }}>/</span>
              <span style={{ color: '#52c41a' }}>↓{down}</span>
            </div>
          </div>
        );
      }
    },
    {
      title: 'PE',
      dataIndex: 'pe',
      align: 'right' as const,
      width: 70,
      render: (pe?: number) => pe ? <Text type="secondary">{pe.toFixed(2)}</Text> : '-'
    },
    {
      title: 'PB',
      dataIndex: 'pb',
      align: 'right' as const,
      width: 70,
      render: (pb?: number) => pb ? <Text type="secondary">{pb.toFixed(2)}</Text> : '-'
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
              <Card size="small" className="stat-card">
                <Statistic 
                  title="上涨板块"
                  value={industries.filter(i => i.change_pct > 0).length}
                  valueStyle={{ color: '#f5222d' }}
                  suffix={`/ ${industries.length}`}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small" className="stat-card">
                <Statistic 
                  title="下跌板块"
                  value={industries.filter(i => i.change_pct < 0).length}
                  valueStyle={{ color: '#52c41a' }}
                  suffix={`/ ${industries.length}`}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small" className="stat-card">
                <Statistic 
                  title="净流入板块"
                  value={industries.filter(i => i.fund_flow > 0).length}
                  valueStyle={{ color: '#f5222d' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small" className="stat-card">
                <Statistic 
                  title="净流出板块"
                  value={industries.filter(i => i.fund_flow < 0).length}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
          </Row>

          {/* 排行快报 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12} lg={6}>
              <Card 
                size="small" 
                title={<span style={{ color: '#f5222d', fontWeight: 'bold' }}>🔥 涨幅榜 Top 5</span>}
                className="rank-card"
              >
                {getTopGainers.slice(0, 5).map((item, idx) => (
                  <div key={item.code} className="rank-item" onClick={() => handleIndustryClick(item)}>
                    <span className="rank-num" style={{ color: idx < 3 ? '#f5222d' : '#999' }}>{idx + 1}</span>
                    <span className="rank-name">{item.name}</span>
                    <span className="rank-value" style={{ color: '#f5222d' }}>+{item.change_pct.toFixed(2)}%</span>
                  </div>
                ))}
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card 
                size="small" 
                title={<span style={{ color: '#52c41a', fontWeight: 'bold' }}>📉 跌幅榜 Top 5</span>}
                className="rank-card"
              >
                {getTopLosers.slice(0, 5).map((item, idx) => (
                  <div key={item.code} className="rank-item" onClick={() => handleIndustryClick(item)}>
                    <span className="rank-num" style={{ color: idx < 3 ? '#52c41a' : '#999' }}>{idx + 1}</span>
                    <span className="rank-name">{item.name}</span>
                    <span className="rank-value" style={{ color: '#52c41a' }}>{item.change_pct.toFixed(2)}%</span>
                  </div>
                ))}
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card 
                size="small" 
                title={<span style={{ color: '#f5222d', fontWeight: 'bold' }}>💰 资金流入 Top 5</span>}
                className="rank-card"
              >
                {getTopInflow.slice(0, 5).map((item, idx) => (
                  <div key={item.code} className="rank-item" onClick={() => handleIndustryClick(item)}>
                    <span className="rank-num" style={{ color: idx < 3 ? '#f5222d' : '#999' }}>{idx + 1}</span>
                    <span className="rank-name">{item.name}</span>
                    <span className="rank-value" style={{ color: '#f5222d' }}>+{item.fund_flow.toFixed(2)}亿</span>
                  </div>
                ))}
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card 
                size="small" 
                title={<span style={{ color: '#52c41a', fontWeight: 'bold' }}>💸 资金流出 Top 5</span>}
                className="rank-card"
              >
                {getTopOutflow.slice(0, 5).map((item, idx) => (
                  <div key={item.code} className="rank-item" onClick={() => handleIndustryClick(item)}>
                    <span className="rank-num" style={{ color: idx < 3 ? '#52c41a' : '#999' }}>{idx + 1}</span>
                    <span className="rank-name">{item.name}</span>
                    <span className="rank-value" style={{ color: '#52c41a' }}>{item.fund_flow.toFixed(2)}亿</span>
                  </div>
                ))}
              </Card>
            </Col>
          </Row>
          
          {/* 图表区域 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} lg={14}>
              <Card size="small" bodyStyle={{ padding: 10 }} className="chart-card">
                <Spin spinning={loading}>
                  <ReactECharts
                    option={getTreemapOption()}
                    style={{ height: 450 }}
                    theme={darkMode ? 'dark' : undefined}
                  />
                </Spin>
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card size="small" bodyStyle={{ padding: 10 }} className="chart-card">
                <Spin spinning={loading}>
                  <ReactECharts
                    option={getFlowOption()}
                    style={{ height: 450 }}
                    theme={darkMode ? 'dark' : undefined}
                  />
                </Spin>
              </Card>
            </Col>
          </Row>

          {/* 数据表格 */}
          <Card size="small" className="table-card">
            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab} 
              type="card"
              tabBarExtraContent={
                <Space>
                  <Text type="secondary">排序:</Text>
                  <Select
                    value={sortField}
                    onChange={(value: SortField) => setSortField(value)}
                    size="small"
                    style={{ width: 100 }}
                  >
                    <Option value="change_pct">涨跌幅</Option>
                    <Option value="fund_flow">资金流向</Option>
                    <Option value="volume">成交量</Option>
                    <Option value="amount">成交额</Option>
                  </Select>
                  <Radio.Group
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    size="small"
                  >
                    <Radio.Button value="descend">降序</Radio.Button>
                    <Radio.Button value="ascend">升序</Radio.Button>
                  </Radio.Group>
                </Space>
              }
            >
              <TabPane tab={`行业板块 (${industries.length})`} key="industry">
                <Table
                  dataSource={getSortedData}
                  columns={columns}
                  rowKey="code"
                  pagination={{ pageSize: 15 }}
                  size="small"
                  loading={loading}
                  scroll={{ x: 800 }}
                  rowClassName={(record) => record.change_pct > 0 ? 'row-up' : record.change_pct < 0 ? 'row-down' : ''}
                />
              </TabPane>
              <TabPane tab={`概念板块 (${concepts.length})`} key="concept">
                <Table
                  dataSource={getSortedData}
                  columns={columns}
                  rowKey="code"
                  pagination={{ pageSize: 15 }}
                  size="small"
                  scroll={{ x: 800 }}
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
            <Space size="large">
              <span style={{ fontSize: 18, fontWeight: 'bold' }}>{selectedIndustry.name}</span>
              <Tag color={selectedIndustry.change_pct >= 0 ? '#f5222d' : '#52c41a'}>
                {formatChange(selectedIndustry.change_pct)}
              </Tag>
              <Tag color={selectedIndustry.fund_flow >= 0 ? '#f5222d' : '#52c41a'}>
                资金流向: {formatFundFlow(selectedIndustry.fund_flow)}
              </Tag>
            </Space>
          ) : '行业成分股'
        }
        placement="right"
        width={1000}
        onClose={handleCloseDrawer}
        open={drawerVisible}
        className="industry-drawer"
      >
        {selectedIndustry && (
          <>
            {/* 行业统计 */}
            <Card size="small" style={{ marginBottom: 16 }} className="drawer-stats">
              <Row gutter={[24, 16]}>
                <Col span={6}>
                  <Statistic 
                    title="涨跌幅" 
                    value={selectedIndustry.change_pct}
                    valueStyle={{ color: getChangeColor(selectedIndustry.change_pct), fontSize: 24 }}
                    suffix="%"
                    precision={2}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="资金流向" 
                    value={selectedIndustry.fund_flow}
                    valueStyle={{ color: getChangeColor(selectedIndustry.fund_flow), fontSize: 24 }}
                    suffix="亿"
                    precision={2}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="龙头股" 
                    value={selectedIndustry.lead_stock}
                    suffix={<Tag color={selectedIndustry.lead_change >= 0 ? '#f5222d' : '#52c41a'}>{formatChange(selectedIndustry.lead_change)}</Tag>}
                    valueStyle={{ fontSize: 18 }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="PE / PB" 
                    value={`${selectedIndustry.pe?.toFixed(2) || '-'}`}
                    suffix={`/ ${selectedIndustry.pb?.toFixed(2) || '-'}`}
                    valueStyle={{ fontSize: 18 }}
                  />
                </Col>
              </Row>
            </Card>

            {/* K线走势图 */}
            <Card 
              size="small" 
              title="📈 行业走势" 
              style={{ marginBottom: 16 }}
              className="kline-card"
            >
              <Spin spinning={klineLoading}>
                <ReactECharts
                  option={getKLineOption()}
                  style={{ height: 350 }}
                  theme={darkMode ? 'dark' : undefined}
                />
              </Spin>
            </Card>

            {/* 成分股列表 */}
            <Card size="small" title="📋 成分股列表" className="stocks-card">
              <Table
                dataSource={industryStocks}
                columns={stockColumns}
                rowKey="symbol"
                pagination={{ pageSize: 10 }}
                size="small"
                loading={stocksLoading}
                scroll={{ x: 800 }}
              />
            </Card>
          </>
        )}
      </Drawer>

      <style>{`
        .stat-card {
          transition: all 0.3s;
        }
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .chart-card {
          border-radius: 8px;
        }
        .table-card {
          border-radius: 8px;
        }
        .rank-card {
          border-radius: 8px;
          height: 200px;
        }
        .rank-card .ant-card-body {
          padding: 8px 12px;
        }
        .rank-item {
          display: flex;
          align-items: center;
          padding: 6px 0;
          border-bottom: 1px solid #f0f0f0;
          cursor: pointer;
          transition: background 0.2s;
        }
        .rank-item:hover {
          background: #f5f5f5;
        }
        .rank-item:last-child {
          border-bottom: none;
        }
        .rank-num {
          width: 24px;
          font-weight: bold;
          font-size: 14px;
        }
        .rank-name {
          flex: 1;
          font-size: 13px;
        }
        .rank-value {
          font-weight: bold;
          font-size: 13px;
        }
        .row-up {
          background: linear-gradient(90deg, rgba(245,34,45,0.05) 0%, transparent 100%);
        }
        .row-down {
          background: linear-gradient(90deg, rgba(82,196,26,0.05) 0%, transparent 100%);
        }
        .industry-drawer .ant-drawer-body {
          background: ${darkMode ? '#141414' : '#f5f5f5'};
          padding: 16px;
        }
        .drawer-stats {
          background: ${darkMode ? '#1f1f1f' : '#fff'};
        }
        .kline-card {
          background: ${darkMode ? '#1f1f1f' : '#fff'};
        }
        .stocks-card {
          background: ${darkMode ? '#1f1f1f' : '#fff'};
        }
      `}</style>
    </Layout>
  );
};

export default Industry;
