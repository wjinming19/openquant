import React, { useState, useEffect } from 'react';
import { Layout, Menu, Card, Row, Col, Button, Select, Slider, Table, Tag, Badge, Typography, Space, Divider, Radio, Drawer, Tooltip, Popconfirm, message } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import axios from 'axios';
import { DownloadOutlined, PlusOutlined, EyeOutlined, CloseOutlined } from '@ant-design/icons';
import './Dashboard.css';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

const API_BASE = 'http://170.106.119.80:8089/api';

interface PageProps {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

interface FactorParams {
  rsiMin: number;
  rsiMax: number;
  macdSignal: string;
  maAlignment: string;
  bbPosition: string;
  scoreMin: number;
  scoreMax: number;
}

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change_pct: number;
  rsi: number;
  macd_signal: string;
  ma_trend: string;
  bb_position_detail: string;
  bb_position: number;
  score: number;
  rating: string;
  stars: string;
  signals: string[];
}

const StockSelect: React.FC<PageProps> = ({ darkMode, setDarkMode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [scanResults, setScanResults] = useState<StockData[]>([]);
  const [filteredResults, setFilteredResults] = useState<StockData[]>([]);
  const [sortField, setSortField] = useState<string>('score');
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend'>('descend');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  
  // 因子参数
  const [params, setParams] = useState<FactorParams>({
    rsiMin: 0,
    rsiMax: 100,
    macdSignal: 'all',
    maAlignment: 'all',
    bbPosition: 'all',
    scoreMin: -5,
    scoreMax: 5
  });

  const menuItems = [
    { key: '/dashboard', icon: '📊', label: '大盘情绪' },
    { key: '/strategy', icon: '📈', label: '策略回测' },
    { key: '/stock-select', icon: '🔍', label: '量化选股' },
    { key: '/industry', icon: '🏭', label: '行业分析' },
    { key: '/market', icon: '💹', label: '实时行情' },
    { key: '/watchlist', icon: '⭐', label: '自选股' },
    { key: '/ai-analysis', icon: '🤖', label: 'AI分析' },
  ];

  // 获取扫描数据
  useEffect(() => {
    fetchScanResults();
    loadWatchlist();
  }, []);

  // 加载自选股列表
  const loadWatchlist = () => {
    const saved = localStorage.getItem('openquant_watchlist');
    if (saved) {
      try {
        setWatchlist(JSON.parse(saved));
      } catch (e) {
        console.error('加载自选股失败', e);
      }
    }
  };

  // 保存自选股
  const saveWatchlist = (list: string[]) => {
    localStorage.setItem('openquant_watchlist', JSON.stringify(list));
    setWatchlist(list);
  };

  // 添加自选股
  const addToWatchlist = (stock: StockData) => {
    if (!watchlist.includes(stock.symbol)) {
      const newList = [...watchlist, stock.symbol];
      saveWatchlist(newList);
      message.success(`已将 ${stock.name} (${stock.symbol}) 加入自选`);
    } else {
      message.info(`${stock.name} 已在自选列表中`);
    }
  };

  // 移除自选股
  const removeFromWatchlist = (symbol: string) => {
    const newList = watchlist.filter(s => s !== symbol);
    saveWatchlist(newList);
    message.success('已从自选移除');
  };

  const fetchScanResults = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/market/scan`, {
        params: {
          rsi_min: params.rsiMin,
          rsi_max: params.rsiMax,
          macd_signal: params.macdSignal,
          ma_alignment: params.maAlignment,
          bb_position: params.bbPosition,
          score_min: params.scoreMin,
          score_max: params.scoreMax,
          sort_by: sortField,
          sort_order: sortOrder === 'descend' ? 'desc' : 'asc'
        }
      });
      setScanResults(res.data.results || []);
      setFilteredResults(res.data.results || []);
    } catch (err) {
      console.error('获取数据失败', err);
      message.error('获取数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 应用筛选
  const applyFilter = () => {
    fetchScanResults();
  };

  // 重置筛选
  const resetFilter = () => {
    setParams({
      rsiMin: 0,
      rsiMax: 100,
      macdSignal: 'all',
      maAlignment: 'all',
      bbPosition: 'all',
      scoreMin: -5,
      scoreMax: 5
    });
    setSortField('score');
    setSortOrder('descend');
    // 重置后自动刷新
    setTimeout(() => fetchScanResults(), 0);
  };

  // 处理排序
  const handleSort = (field: string) => {
    let newOrder: 'ascend' | 'descend' = 'descend';
    if (sortField === field) {
      newOrder = sortOrder === 'descend' ? 'ascend' : 'descend';
    }
    setSortField(field);
    setSortOrder(newOrder);
    // 重新获取数据
    setTimeout(() => fetchScanResults(), 0);
  };

  // 导出CSV
  const exportCSV = () => {
    if (filteredResults.length === 0) {
      message.warning('没有数据可导出');
      return;
    }

    const headers = ['代码', '名称', '最新价', '涨跌幅(%)', 'RSI', 'MACD信号', '均线趋势', '布林带位置', '综合评分', '评级'];
    const rows = filteredResults.map(stock => [
      stock.symbol,
      stock.name,
      stock.price,
      stock.change_pct,
      stock.rsi,
      stock.macd_signal,
      stock.ma_trend,
      stock.bb_position_detail,
      stock.score,
      stock.rating
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `量化选股_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    message.success(`已导出 ${filteredResults.length} 条数据`);
  };

  // 打开详情抽屉
  const openDetailDrawer = (stock: StockData) => {
    setSelectedStock(stock);
    setDrawerVisible(true);
  };

  const handleMenuClick = (key: string) => {
    navigate(key);
  };

  // 获取排序图标
  const getSortIcon = (field: string) => {
    if (sortField !== field) return '⇅';
    return sortOrder === 'descend' ? '↓' : '↑';
  };

  // 表格列定义
  const columns = [
    {
      title: '排名',
      dataIndex: 'rank',
      width: 60,
      fixed: 'left' as const,
      render: (_: any, __: any, index: number) => (
        <span style={{ 
          color: index < 3 ? '#f5222d' : index < 10 ? '#fa8c16' : '#999',
          fontWeight: index < 3 ? 'bold' : 'normal'
        }}>
          {index + 1}
        </span>
      )
    },
    {
      title: '代码/名称',
      dataIndex: 'symbol',
      width: 120,
      fixed: 'left' as const,
      render: (symbol: string, record: StockData) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ cursor: 'pointer', color: '#1890ff' }} onClick={() => openDetailDrawer(record)}>
            {record.name}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{symbol}</Text>
        </Space>
      )
    },
    {
      title: (
        <span style={{ cursor: 'pointer' }} onClick={() => handleSort('price')}>
          最新价 {getSortIcon('price')}
        </span>
      ),
      dataIndex: 'price',
      width: 90,
      align: 'right' as const,
      render: (price: number) => <Text>¥{price?.toFixed(2)}</Text>
    },
    {
      title: (
        <span style={{ cursor: 'pointer' }} onClick={() => handleSort('change_pct')}>
          涨跌幅 {getSortIcon('change_pct')}
        </span>
      ),
      dataIndex: 'change_pct',
      width: 90,
      align: 'right' as const,
      render: (change: number) => (
        <span className={change >= 0 ? 'value up' : 'value down'}>
          {change >= 0 ? '+' : ''}{change?.toFixed(2)}%
        </span>
      )
    },
    {
      title: (
        <span style={{ cursor: 'pointer' }} onClick={() => handleSort('rsi')}>
          RSI {getSortIcon('rsi')}
        </span>
      ),
      dataIndex: 'rsi',
      width: 70,
      align: 'center' as const,
      render: (rsi: number) => {
        let color = '#52c41a';
        if (rsi > 70) color = '#f5222d';
        else if (rsi > 50) color = '#fa8c16';
        else if (rsi < 30) color = '#1890ff';
        return <span style={{ color, fontWeight: 'bold' }}>{rsi?.toFixed(1)}</span>;
      }
    },
    {
      title: 'MACD信号',
      dataIndex: 'macd_signal',
      width: 90,
      align: 'center' as const,
      render: (signal: string) => {
        const color = signal === '金叉' ? '#f5222d' : signal === '死叉' ? '#52c41a' : '#999';
        return <Tag color={color === '#f5222d' ? 'red' : color === '#52c41a' ? 'green' : 'default'}>{signal}</Tag>;
      }
    },
    {
      title: '均线趋势',
      dataIndex: 'ma_trend',
      width: 90,
      align: 'center' as const,
      render: (trend: string) => {
        const color = trend === '多头排列' ? '#f5222d' : trend === '空头排列' ? '#52c41a' : '#999';
        return <Tag color={color === '#f5222d' ? 'red' : color === '#52c41a' ? 'green' : 'default'}>{trend}</Tag>;
      }
    },
    {
      title: '布林带',
      dataIndex: 'bb_position_detail',
      width: 90,
      align: 'center' as const,
      render: (pos: string) => {
        let color = 'default';
        if (pos.includes('上轨')) color = 'red';
        else if (pos.includes('下轨')) color = 'green';
        else color = 'blue';
        return <Tag color={color}>{pos}</Tag>;
      }
    },
    {
      title: (
        <span style={{ cursor: 'pointer' }} onClick={() => handleSort('score')}>
          评分 {getSortIcon('score')}
        </span>
      ),
      dataIndex: 'score',
      width: 80,
      align: 'center' as const,
      render: (score: number) => {
        let color = '#999';
        if (score >= 3) color = '#52c41a';
        else if (score >= 1) color = '#95de64';
        else if (score >= 0) color = '#faad14';
        else if (score >= -1) color = '#ff7875';
        else color = '#f5222d';
        return (
          <Badge 
            count={score?.toFixed(1)} 
            style={{ 
              backgroundColor: color,
              fontSize: 12,
              minWidth: 40
            }} 
          />
        );
      }
    },
    {
      title: '评级',
      dataIndex: 'rating',
      width: 100,
      align: 'center' as const,
      render: (rating: string, record: StockData) => (
        <Space>
          <Text>{record.stars}</Text>
          <Tag color={record.score >= 0 ? 'green' : 'red'}>{rating}</Tag>
        </Space>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: StockData) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button 
              type="text" 
              size="small" 
              icon={<EyeOutlined />} 
              onClick={() => openDetailDrawer(record)}
            />
          </Tooltip>
          <Tooltip title="加入自选">
            <Button 
              type="text" 
              size="small" 
              icon={<PlusOutlined />} 
              onClick={() => addToWatchlist(record)}
              disabled={watchlist.includes(record.symbol)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  // 评分分布图表
  const getScoreDistOption = () => {
    const ranges = ['-5~-3', '-3~-1', '-1~0', '0~1', '1~3', '3~5'];
    const counts = ranges.map(range => {
      const [min, max] = range.split('~').map(x => parseFloat(x));
      return scanResults.filter(s => s.score >= min && s.score < max).length;
    });
    
    return {
      backgroundColor: 'transparent',
      title: {
        text: '评分分布',
        left: 'center',
        textStyle: { color: darkMode ? '#fff' : '#333', fontSize: 14 }
      },
      grid: { left: '15%', right: '10%', top: '20%', bottom: '15%' },
      xAxis: {
        type: 'category',
        data: ranges,
        axisLabel: { color: darkMode ? '#999' : '#666', fontSize: 10 }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: darkMode ? '#999' : '#666', fontSize: 10 },
        splitLine: { lineStyle: { color: darkMode ? '#333' : '#f0f0f0' } }
      },
      series: [{
        type: 'bar',
        data: counts,
        itemStyle: {
          color: (params: any) => {
            const colors = ['#f5222d', '#ff7875', '#ffa39e', '#d9f7be', '#95de64', '#52c41a'];
            return colors[params.dataIndex];
          }
        }
      }]
    };
  };

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
          <Title level={4} style={{ marginBottom: 16 }}>🔍 量化因子选股</Title>
          
          {/* 筛选条件区域 */}
          <Card title="筛选条件" size="small" style={{ marginBottom: 16 }}>
            <Row gutter={[24, 16]}>
              <Col xs={24} sm={12} md={8} lg={6}>
                <div style={{ marginBottom: 8 }}>
                  <Text strong>RSI范围 [{params.rsiMin} - {params.rsiMax}]</Text>
                  <Slider
                    range
                    min={0}
                    max={100}
                    value={[params.rsiMin, params.rsiMax]}
                    onChange={(val) => setParams({...params, rsiMin: val[0], rsiMax: val[1]})}
                  />
                </div>
              </Col>
              <Col xs={24} sm={12} md={8} lg={6}>
                <div style={{ marginBottom: 8 }}>
                  <Text strong>MACD信号</Text>
                  <Select
                    value={params.macdSignal}
                    onChange={(val) => setParams({...params, macdSignal: val})}
                    style={{ width: '100%' }}
                    options={[
                      { label: '全部', value: 'all' },
                      { label: '金叉', value: 'golden' },
                      { label: '死叉', value: 'dead' },
                    ]}
                  />
                </div>
              </Col>
              <Col xs={24} sm={12} md={8} lg={6}>
                <div style={{ marginBottom: 8 }}>
                  <Text strong>均线排列</Text>
                  <Select
                    value={params.maAlignment}
                    onChange={(val) => setParams({...params, maAlignment: val})}
                    style={{ width: '100%' }}
                    options={[
                      { label: '全部', value: 'all' },
                      { label: '多头排列', value: 'bull' },
                      { label: '空头排列', value: 'bear' },
                    ]}
                  />
                </div>
              </Col>
              <Col xs={24} sm={12} md={8} lg={6}>
                <div style={{ marginBottom: 8 }}>
                  <Text strong>布林带位置</Text>
                  <Select
                    value={params.bbPosition}
                    onChange={(val) => setParams({...params, bbPosition: val})}
                    style={{ width: '100%' }}
                    options={[
                      { label: '全部', value: 'all' },
                      { label: '上轨附近', value: 'upper' },
                      { label: '中轨附近', value: 'middle' },
                      { label: '下轨附近', value: 'lower' },
                    ]}
                  />
                </div>
              </Col>
              <Col xs={24} sm={12} md={8} lg={6}>
                <div style={{ marginBottom: 8 }}>
                  <Text strong>综合评分 [{params.scoreMin} - {params.scoreMax}]</Text>
                  <Slider
                    range
                    min={-5}
                    max={5}
                    step={0.5}
                    value={[params.scoreMin, params.scoreMax]}
                    onChange={(val) => setParams({...params, scoreMin: val[0], scoreMax: val[1]})}
                  />
                </div>
              </Col>
            </Row>
            <Row style={{ marginTop: 8 }}>
              <Col span={24}>
                <Space>
                  <Button type="primary" onClick={applyFilter}>应用筛选</Button>
                  <Button onClick={resetFilter}>重置</Button>
                  <Button onClick={fetchScanResults} loading={loading}>刷新数据</Button>
                  <Button 
                    type="dashed" 
                    icon={<DownloadOutlined />} 
                    onClick={exportCSV}
                    disabled={filteredResults.length === 0}
                  >
                    导出CSV
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={18}>
              {/* 筛选结果表格 */}
              <Card 
                title={`筛选结果 (${filteredResults.length}只)`} 
                size="small"
                bodyStyle={{ padding: 0 }}
              >
                <Table
                  dataSource={filteredResults}
                  columns={columns}
                  rowKey="symbol"
                  pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
                  size="small"
                  scroll={{ x: 1000 }}
                  loading={loading}
                />
              </Card>
            </Col>
            <Col xs={24} lg={6}>
              {/* 评分分布图 */}
              <Card title="数据分布" size="small">
                <ReactECharts
                  option={getScoreDistOption()}
                  style={{ height: 200 }}
                  theme={darkMode ? 'dark' : undefined}
                />
                <Divider />
                <div style={{ textAlign: 'center' }}>
                  <Text type="secondary">总计 {scanResults.length} 只股票</Text>
                </div>
                <div style={{ marginTop: 12 }}>
                  <Text strong style={{ fontSize: 12 }}>评分说明:</Text>
                  <div style={{ fontSize: 11, marginTop: 4, color: darkMode ? '#999' : '#666' }}>
                    <div>⭐⭐⭐⭐⭐ 强烈看多 (≥3分)</div>
                    <div>⭐⭐⭐⭐ 看多 (1.5~3分)</div>
                    <div>⭐⭐⭐ 中性 (0~1.5分)</div>
                    <div>⭐⭐ 看空 (-1.5~0分)</div>
                    <div>⭐ 强烈看空 (&lt;-1.5分)</div>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </Content>
      </Layout>

      {/* 股票详情抽屉 */}
      <Drawer
        title={
          <Space>
            <span>{selectedStock?.name}</span>
            <Text type="secondary">{selectedStock?.symbol}</Text>
          </Space>
        }
        placement="right"
        width={500}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        extra={
          <Space>
            <Button 
              icon={<PlusOutlined />}
              onClick={() => selectedStock && addToWatchlist(selectedStock)}
              disabled={selectedStock ? watchlist.includes(selectedStock.symbol) : true}
            >
              加入自选
            </Button>
            <Button type="primary" onClick={() => selectedStock && navigate(`/dashboard?symbol=${selectedStock.symbol}`)}>
              详细分析
            </Button>
          </Space>
        }
      >
        {selectedStock && (
          <div>
            <Card size="small" title="基本信息" style={{ marginBottom: 16 }}>
              <Row gutter={[16, 8]}>
                <Col span={12}>
                  <Text type="secondary">最新价:</Text>
                  <div style={{ fontSize: 18, fontWeight: 'bold' }}>¥{selectedStock.price?.toFixed(2)}</div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">涨跌幅:</Text>
                  <div style={{ 
                    fontSize: 18, 
                    fontWeight: 'bold',
                    color: selectedStock.change_pct >= 0 ? '#f5222d' : '#52c41a'
                  }}>
                    {selectedStock.change_pct >= 0 ? '+' : ''}{selectedStock.change_pct?.toFixed(2)}%
                  </div>
                </Col>
              </Row>
            </Card>

            <Card size="small" title="技术指标" style={{ marginBottom: 16 }}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary">RSI指标:</Text>
                    <div style={{ fontSize: 16, fontWeight: 'bold', color: selectedStock.rsi > 70 ? '#f5222d' : selectedStock.rsi < 30 ? '#1890ff' : '#52c41a' }}>
                      {selectedStock.rsi?.toFixed(1)}
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary">MACD信号:</Text>
                    <div>
                      <Tag color={selectedStock.macd_signal === '金叉' ? 'red' : selectedStock.macd_signal === '死叉' ? 'green' : 'default'}>
                        {selectedStock.macd_signal}
                      </Tag>
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary">均线趋势:</Text>
                    <div>
                      <Tag color={selectedStock.ma_trend === '多头排列' ? 'red' : selectedStock.ma_trend === '空头排列' ? 'green' : 'default'}>
                        {selectedStock.ma_trend}
                      </Tag>
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary">布林带位置:</Text>
                    <div>
                      <Tag color={selectedStock.bb_position_detail?.includes('上轨') ? 'red' : selectedStock.bb_position_detail?.includes('下轨') ? 'green' : 'blue'}>
                        {selectedStock.bb_position_detail}
                      </Tag>
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>

            <Card size="small" title="综合评级" style={{ marginBottom: 16 }}>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{selectedStock.stars}</div>
                <div style={{ fontSize: 18, color: selectedStock.score >= 0 ? '#52c41a' : '#f5222d' }}>
                  {selectedStock.rating}
                </div>
                <div style={{ fontSize: 36, fontWeight: 'bold', marginTop: 16, color: selectedStock.score >= 0 ? '#52c41a' : '#f5222d' }}>
                  {selectedStock.score?.toFixed(1)}<span style={{ fontSize: 14 }}>分</span>
                </div>
              </div>
            </Card>

            <Card size="small" title="技术信号">
              <Space wrap>
                {selectedStock.signals?.map((signal, idx) => (
                  <Tag key={idx} color="blue">{signal}</Tag>
                ))}
              </Space>
            </Card>
          </div>
        )}
      </Drawer>
    </Layout>
  );
};

export default StockSelect;
