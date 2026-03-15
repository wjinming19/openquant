import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Layout, Menu, Card, Typography, Button, Table, Tabs, Input, Badge, Spin, message } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { SearchOutlined, ReloadOutlined, PlusOutlined, ClockCircleOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import axios from 'axios';
import './Dashboard.css';

// API 基础地址
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8089/api';

const { Header, Content, Sider } = Layout;
const { Text } = Typography;
const { TabPane } = Tabs;
const { Search } = Input;

interface StockData {
  rank: number;
  symbol: string;
  name: string;
  price: number;
  change_pct: number;
  volume: number;
  turnover: number;
  industry: string;
}

interface MarketIndex {
  name: string;
  code: string;
  price: number;
  change_pct: number;
}

interface PageProps {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

const Market: React.FC<PageProps> = ({ darkMode, setDarkMode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('rise');
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [marketIndices, setMarketIndices] = useState<MarketIndex[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // 生成模拟股票数据
  const generateMockStockData = useCallback((type: string): StockData[] => {
    const industries = ['半导体', '新能源', '医药生物', '软件开发', '银行', '白酒', '汽车', '消费电子', '化工', '电力'];
    const stocks: StockData[] = [];
    const baseStocks = [
      { symbol: '000001', name: '平安银行' },
      { symbol: '000002', name: '万科A' },
      { symbol: '000063', name: '中兴通讯' },
      { symbol: '000100', name: 'TCL科技' },
      { symbol: '000333', name: '美的集团' },
      { symbol: '000538', name: '云南白药' },
      { symbol: '000568', name: '泸州老窖' },
      { symbol: '000651', name: '格力电器' },
      { symbol: '000725', name: '京东方A' },
      { symbol: '000768', name: '中航西飞' },
      { symbol: '000858', name: '五粮液' },
      { symbol: '000895', name: '双汇发展' },
      { symbol: '002001', name: '新和成' },
      { symbol: '002007', name: '华兰生物' },
      { symbol: '002024', name: '苏宁易购' },
      { symbol: '002027', name: '分众传媒' },
      { symbol: '002049', name: '紫光国微' },
      { symbol: '002120', name: '韵达股份' },
      { symbol: '002142', name: '宁波银行' },
      { symbol: '002230', name: '科大讯飞' },
      { symbol: '002236', name: '大华股份' },
      { symbol: '002271', name: '东方雨虹' },
      { symbol: '002304', name: '洋河股份' },
      { symbol: '002352', name: '顺丰控股' },
      { symbol: '002371', name: '北方华创' },
      { symbol: '002415', name: '海康威视' },
      { symbol: '002460', name: '赣锋锂业' },
      { symbol: '002466', name: '天齐锂业' },
      { symbol: '002475', name: '立讯精密' },
      { symbol: '002594', name: '比亚迪' },
      { symbol: '600000', name: '浦发银行' },
      { symbol: '600009', name: '上海机场' },
      { symbol: '600016', name: '民生银行' },
      { symbol: '600028', name: '中国石化' },
      { symbol: '600030', name: '中信证券' },
      { symbol: '600031', name: '三一重工' },
      { symbol: '600036', name: '招商银行' },
      { symbol: '600048', name: '保利发展' },
      { symbol: '600050', name: '中国联通' },
      { symbol: '600104', name: '上汽集团' },
      { symbol: '600276', name: '恒瑞医药' },
      { symbol: '600309', name: '万华化学' },
      { symbol: '600519', name: '贵州茅台' },
      { symbol: '600585', name: '海螺水泥' },
      { symbol: '600588', name: '用友网络' },
      { symbol: '600690', name: '海尔智家' },
      { symbol: '600745', name: '闻泰科技' },
      { symbol: '600809', name: '山西汾酒' },
      { symbol: '600887', name: '伊利股份' },
      { symbol: '601012', name: '隆基绿能' },
      { symbol: '601088', name: '中国神华' },
      { symbol: '601166', name: '兴业银行' },
      { symbol: '601318', name: '中国平安' },
      { symbol: '601398', name: '工商银行' },
    ];

    baseStocks.forEach((stock, index) => {
      const basePrice = 10 + Math.random() * 90;
      let changePct: number;
      
      // 根据类型调整涨跌幅分布
      switch (type) {
        case 'rise':
          changePct = Math.random() * 10 + 0.1;
          break;
        case 'fall':
          changePct = -(Math.random() * 10 + 0.1);
          break;
        case 'volume':
        case 'turnover':
        case 'fund':
        default:
          changePct = (Math.random() - 0.5) * 20;
          break;
      }
      
      stocks.push({
        rank: index + 1,
        symbol: stock.symbol,
        name: stock.name,
        price: basePrice * (1 + changePct / 100),
        change_pct: parseFloat(changePct.toFixed(2)),
        volume: Math.floor(Math.random() * 100000000) + 1000000,
        turnover: parseFloat((Math.random() * 30 + 0.5).toFixed(2)),
        industry: industries[index % industries.length],
      });
    });

    // 根据类型排序
    switch (type) {
      case 'rise':
        stocks.sort((a, b) => b.change_pct - a.change_pct);
        break;
      case 'fall':
        stocks.sort((a, b) => a.change_pct - b.change_pct);
        break;
      case 'volume':
        stocks.sort((a, b) => b.volume - a.volume);
        break;
      case 'turnover':
        stocks.sort((a, b) => b.turnover - a.turnover);
        break;
      case 'fund':
        stocks.sort((a, b) => b.change_pct - a.change_pct);
        break;
      default:
        break;
    }

    // 重新排名
    return stocks.map((stock, index) => ({ ...stock, rank: index + 1 }));
  }, []);

  // 生成市场指数数据
  const generateMarketIndices = useCallback((): MarketIndex[] => {
    return [
      { name: '上证指数', code: '000001', price: 3052.37, change_pct: 0.42 },
      { name: '深证成指', code: '399001', price: 9584.25, change_pct: -0.28 },
      { name: '创业板指', code: '399006', price: 1821.94, change_pct: -0.58 },
      { name: '科创50', code: '000688', price: 812.56, change_pct: 1.25 },
    ];
  }, []);

  // 获取数据
  const fetchData = useCallback(async (type: string) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/market/rankings?type=${type}&limit=50`);
      if (res.data && res.data.data && res.data.data.length > 0) {
        setStockData(res.data.data);
      } else {
        // API返回空数据，使用本地模拟数据
        setStockData(generateMockStockData(type));
      }
    } catch (error) {
      console.error('获取排行榜数据失败:', error);
      // 如果API失败，使用本地模拟数据
      setStockData(generateMockStockData(type));
    } finally {
      setLoading(false);
      setLastUpdate(new Date().toLocaleTimeString('zh-CN'));
    }
  }, [generateMockStockData]);

  // 获取市场指数
  const fetchMarketIndices = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/market/indices`);
      if (res.data && res.data.data && res.data.data.length > 0) {
        // 格式化指数数据
        const formattedIndices = res.data.data.map((item: any) => ({
          name: item.name,
          code: item.code,
          price: item.price,
          change_pct: item.change_pct,
        }));
        setMarketIndices(formattedIndices);
      } else {
        setMarketIndices(generateMarketIndices());
      }
    } catch (error) {
      console.error('获取市场指数失败:', error);
      setMarketIndices(generateMarketIndices());
    }
  }, [generateMarketIndices]);

  // 手动刷新
  const handleRefresh = useCallback(() => {
    fetchData(activeTab);
    message.success('数据已刷新');
  }, [fetchData, activeTab]);

  // 加入自选
  const handleAddToWatchlist = useCallback((stock: StockData, e: React.MouseEvent) => {
    e.stopPropagation();
    const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    if (!watchlist.find((item: StockData) => item.symbol === stock.symbol)) {
      watchlist.push({
        symbol: stock.symbol,
        name: stock.name,
        price: stock.price,
        change_pct: stock.change_pct,
        alert_min: stock.price * 0.9,
        alert_max: stock.price * 1.1,
      });
      localStorage.setItem('watchlist', JSON.stringify(watchlist));
      message.success(`${stock.name} 已加入自选`);
    } else {
      message.info(`${stock.name} 已在自选列表中`);
    }
  }, []);

  // Tab切换
  const handleTabChange = useCallback((key: string) => {
    setActiveTab(key);
    fetchData(key);
  }, [fetchData]);

  // 搜索过滤
  const filteredData = stockData.filter(
    (stock) =>
      stock.name.toLowerCase().includes(searchText.toLowerCase()) ||
      stock.symbol.includes(searchText)
  );

  // 表格列定义
  const columns = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 60,
      align: 'center' as const,
      render: (rank: number) => (
        <Badge
          count={rank}
          style={{
            backgroundColor: rank <= 3 ? '#f5222d' : rank <= 10 ? '#fa8c16' : '#d9d9d9',
            color: rank <= 10 ? '#fff' : '#666',
          }}
        />
      ),
    },
    {
      title: '代码',
      dataIndex: 'symbol',
      key: 'symbol',
      width: 80,
      render: (symbol: string) => <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{symbol}</span>,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 100,
    },
    {
      title: '最新价',
      dataIndex: 'price',
      key: 'price',
      width: 90,
      align: 'right' as const,
      render: (price: number) => <span>¥{price.toFixed(2)}</span>,
    },
    {
      title: '涨跌幅',
      dataIndex: 'change_pct',
      key: 'change_pct',
      width: 90,
      align: 'right' as const,
      render: (change_pct: number) => (
        <span className={`stock-change ${change_pct >= 0 ? 'up' : 'down'}`}>
          {change_pct >= 0 ? '+' : ''}{change_pct.toFixed(2)}%
        </span>
      ),
    },
    {
      title: '成交量',
      dataIndex: 'volume',
      key: 'volume',
      width: 100,
      align: 'right' as const,
      render: (volume: number) => {
        if (volume >= 100000000) {
          return <span>{(volume / 100000000).toFixed(2)}亿</span>;
        } else if (volume >= 10000) {
          return <span>{(volume / 10000).toFixed(2)}万</span>;
        }
        return <span>{volume}</span>;
      },
    },
    {
      title: '换手率',
      dataIndex: 'turnover',
      key: 'turnover',
      width: 80,
      align: 'right' as const,
      render: (turnover: number) => <span>{turnover.toFixed(2)}%</span>,
    },
    {
      title: '所属行业',
      dataIndex: 'industry',
      key: 'industry',
      width: 100,
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      align: 'center' as const,
      render: (_: unknown, record: StockData) => (
        <Button
          type="text"
          size="small"
          icon={<PlusOutlined />}
          onClick={(e) => handleAddToWatchlist(record, e)}
          title="加入自选"
        />
      ),
    },
  ];

  // 初始化数据
  useEffect(() => {
    fetchData(activeTab);
    fetchMarketIndices();
  }, [fetchData, activeTab, fetchMarketIndices]);

  // 定时刷新
  useEffect(() => {
    refreshIntervalRef.current = setInterval(() => {
      fetchData(activeTab);
      fetchMarketIndices();
    }, 30000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchData, fetchMarketIndices, activeTab]);

  return (
    <Layout className={`dashboard ${darkMode ? 'dark' : 'light'}`}>
      <Header className="header">
        <div className="logo">📊 OpenQuant</div>
      </Header>

      <Layout>
        <Sider width={200} className="sider">
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            theme={darkMode ? 'dark' : 'light'}
            onClick={({ key }) => handleMenuClick(key)}
            items={menuItems.map((item) => ({
              key: item.key,
              label: `${item.icon} ${item.label}`,
            }))}
          />
        </Sider>

        <Content className="content">
          {/* 顶部数据条 */}
          <div className={`top-bar ${darkMode ? 'dark' : ''}`}>
            {marketIndices.map((index) => (
              <React.Fragment key={index.code}>
                <div className="top-bar-item">
                  <span className="label">{index.name}</span>
                  <span className={`value ${index.change_pct >= 0 ? 'up' : 'down'}`}>
                    {index.price.toFixed(2)}
                  </span>
                  <span className={`change ${index.change_pct >= 0 ? 'up' : 'down'}`}>
                    {index.change_pct >= 0 ? '+' : ''}{index.change_pct.toFixed(2)}%
                  </span>
                  <span className={`arrow ${index.change_pct >= 0 ? 'up' : 'down'}`}>
                    {index.change_pct >= 0 ? '▲' : '▼'}
                  </span>
                </div>
                <div className="top-bar-divider" />
              </React.Fragment>
            ))}
            <div className="top-bar-item date">
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                更新: {lastUpdate || '--:--:--'}
              </Text>
            </div>
          </div>

          {/* 主内容卡片 */}
          <Card className="chart-card" style={{ marginTop: 16 }}>
            {/* 搜索和操作栏 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <Search
                placeholder="搜索股票代码/名称"
                allowClear
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 250 }}
                prefix={<SearchOutlined />}
              />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  每30秒自动刷新
                </Text>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleRefresh}
                  loading={loading}
                >
                  刷新
                </Button>
              </div>
            </div>

            {/* Tab切换 */}
            <Tabs activeKey={activeTab} onChange={handleTabChange} type="card">
              <TabPane
                tab={<span><ArrowUpOutlined style={{ color: '#f5222d' }} /> 涨幅榜</span>}
                key="rise"
              />
              <TabPane
                tab={<span><ArrowDownOutlined style={{ color: '#52c41a' }} /> 跌幅榜</span>}
                key="fall"
              />
              <TabPane
                tab={<span>🔥 成交量榜</span>}
                key="volume"
              />
              <TabPane
                tab={<span>🔄 换手率榜</span>}
                key="turnover"
              />
              <TabPane
                tab={<span>💰 资金流向榜</span>}
                key="fund"
              />
            </Tabs>

            {/* 数据表格 */}
            <Spin spinning={loading} tip="加载中...">
              <Table
                columns={columns}
                dataSource={filteredData}
                rowKey="symbol"
                pagination={{
                  pageSize: 20,
                  showSizeChanger: false,
                  showQuickJumper: true,
                  showTotal: (total) => `共 ${total} 条`,
                }}
                size="middle"
                onRow={(record) => ({
                  onClick: () => navigate(`/stock/${record.symbol}`),
                  style: { cursor: 'pointer' },
                })}
              />
            </Spin>
          </Card>
        </Content>
      </Layout>

      {/* 移动端底部导航 */}
      <div className={`mobile-nav ${darkMode ? 'dark' : ''}`}>
        {menuItems.map((item) => (
          <div
            key={item.key}
            className={`mobile-nav-item ${location.pathname === item.key ? 'active' : ''}`}
            onClick={() => handleMenuClick(item.key)}
          >
            <span className="mobile-nav-icon">{item.icon}</span>
            <span className="mobile-nav-text">{item.label}</span>
          </div>
        ))}
      </div>
    </Layout>
  );
};

export default Market;
