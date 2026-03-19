import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Layout, Menu, Card, Typography, Button, Table, Tabs, Input, Badge, Spin, message, Alert } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { SearchOutlined, ReloadOutlined, PlusOutlined, ClockCircleOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import axios from 'axios';
import './Dashboard.css';

// API 基础地址 - 使用后端实际地址
const API_BASE = 'http://170.106.119.80:8090';

const { Header, Content, Sider } = Layout;
const { Text } = Typography;
const { TabPane } = Tabs;
const { Search } = Input;

// 排行类型定义
type RankingType = 'rise' | 'fall' | 'volume' | 'turnover';

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
  const [activeTab, setActiveTab] = useState<RankingType>('rise');
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [marketIndices, setMarketIndices] = useState<MarketIndex[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  // 生成市场指数数据（作为fallback）
  const generateMarketIndices = useCallback((): MarketIndex[] => {
    return [
      { name: '上证指数', code: '000001', price: 3052.37, change_pct: 0.42 },
      { name: '深证成指', code: '399001', price: 9584.25, change_pct: -0.28 },
      { name: '创业板指', code: '399006', price: 1821.94, change_pct: -0.58 },
      { name: '科创50', code: '000688', price: 812.56, change_pct: 1.25 },
    ];
  }, []);

  // 从后端API获取排行榜数据
  const fetchRankings = useCallback(async (type: RankingType) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.get(`${API_BASE}/api/market/rankings`, {
        params: {
          type,
          limit: 1000  // 获取更多股票
        },
        timeout: 20000 // 20秒超时
      });
      
      if (res.data && Array.isArray(res.data.data)) {
        // 为数据添加排名
        const rankedData = res.data.data.map((item: StockData, index: number) => ({
          ...item,
          rank: index + 1
        }));
        setStockData(rankedData);
        setLastUpdate(new Date().toLocaleTimeString('zh-CN'));
      } else {
        throw new Error('API返回数据格式不正确');
      }
    } catch (error) {
      console.error('获取排行榜数据失败:', error);
      setError('获取数据失败，请稍后重试');
      message.error('获取排行榜数据失败');
      setStockData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取市场指数数据
  const fetchMarketIndices = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/market/indices`, {
        timeout: 10000
      });
      if (res.data && Array.isArray(res.data.data)) {
        setMarketIndices(res.data.data);
      } else {
        // 如果API失败，使用本地模拟数据
        setMarketIndices(generateMarketIndices());
      }
    } catch (error) {
      console.error('获取市场指数失败:', error);
      setMarketIndices(generateMarketIndices());
    }
  }, [generateMarketIndices]);

  // 手动刷新
  const handleRefresh = useCallback(() => {
    fetchRankings(activeTab);
    fetchMarketIndices();
    message.success('数据刷新中...');
  }, [fetchRankings, fetchMarketIndices, activeTab]);

  // 加入自选 - 调用后端API
  const handleAddToWatchlist = useCallback(async (stock: StockData, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // 先获取或创建默认分组
      const listRes = await axios.get(`${API_BASE}/api/watchlist/list`);
      let defaultGroupId = 'wl_1';
      
      if (listRes.data && listRes.data.count === 0) {
        // 没有分组，创建默认分组
        const createRes = await axios.post(`${API_BASE}/api/watchlist/create`, {
          name: '我的自选'
        });
        if (createRes.data && createRes.data.watchlist) {
          defaultGroupId = createRes.data.watchlist.id;
        }
      } else if (listRes.data && listRes.data.watchlists && listRes.data.watchlists.length > 0) {
        defaultGroupId = listRes.data.watchlists[0].id;
      }
      
      // 添加股票到分组
      const addRes = await axios.post(`${API_BASE}/api/watchlist/${defaultGroupId}/add`, {
        symbol: stock.symbol,
        name: stock.name
      });
      
      if (addRes.data && addRes.data.success) {
        message.success(`${stock.name} 已加入自选`);
      } else {
        message.info(`${stock.name} 已在自选列表中`);
      }
    } catch (error: any) {
      console.error('添加自选股失败:', error);
      if (error.response?.data?.detail) {
        message.info(`${stock.name} 已在自选列表中`);
      } else {
        message.error('添加失败，请稍后重试');
      }
    }
  }, []);

  // Tab切换
  const handleTabChange = useCallback((key: string) => {
    const validKey = key as RankingType;
    setActiveTab(validKey);
    fetchRankings(validKey);
  }, [fetchRankings]);

  // 搜索过滤
  const filteredData = stockData.filter(
    (stock) =>
      stock.name.toLowerCase().includes(searchText.toLowerCase()) ||
      stock.symbol.includes(searchText)
  );

  // 获取涨跌幅颜色样式 - 红涨绿跌
  const getChangeColor = (changePct: number): React.CSSProperties => ({
    color: changePct > 0 ? '#f5222d' : changePct < 0 ? '#52c41a' : '#666',
    fontWeight: 500,
  });

  // 表格列定义
  const columns = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 70,
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
      width: 90,
      render: (symbol: string) => <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{symbol}</span>,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      render: (name: string, record: StockData) => (
        <span style={{ fontWeight: 500 }}>{name}</span>
      ),
    },
    {
      title: '最新价',
      dataIndex: 'price',
      key: 'price',
      width: 100,
      align: 'right' as const,
      render: (price: number, record: StockData) => (
        <span style={getChangeColor(record.change_pct)}>
          ¥{price.toFixed(2)}
        </span>
      ),
    },
    {
      title: '涨跌幅',
      dataIndex: 'change_pct',
      key: 'change_pct',
      width: 100,
      align: 'right' as const,
      render: (change_pct: number) => (
        <span style={getChangeColor(change_pct)}>
          {change_pct > 0 ? '+' : ''}{change_pct.toFixed(2)}%
        </span>
      ),
    },
    {
      title: '涨跌额',
      key: 'change_amount',
      width: 100,
      align: 'right' as const,
      render: (_: unknown, record: StockData) => {
        const changeAmount = record.price * record.change_pct / 100;
        return (
          <span style={getChangeColor(record.change_pct)}>
            {changeAmount > 0 ? '+' : ''}{changeAmount.toFixed(2)}
          </span>
        );
      },
    },
    {
      title: '成交量',
      dataIndex: 'volume',
      key: 'volume',
      width: 110,
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
      width: 90,
      align: 'right' as const,
      render: (turnover: number) => <span>{turnover.toFixed(2)}%</span>,
    },
    {
      title: '所属行业',
      dataIndex: 'industry',
      key: 'industry',
      width: 110,
      render: (industry: string) => <span style={{ color: '#666' }}>{industry || '--'}</span>,
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
    fetchRankings(activeTab);
    fetchMarketIndices();
  }, [fetchRankings, fetchMarketIndices, activeTab]);

  // 定时刷新 - 每30秒
  useEffect(() => {
    refreshIntervalRef.current = setInterval(() => {
      fetchRankings(activeTab);
      fetchMarketIndices();
    }, 30000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchRankings, fetchMarketIndices, activeTab]);

  // Tab配置
  const tabConfig = [
    { key: 'rise', label: '涨幅榜', icon: <ArrowUpOutlined style={{ color: '#f5222d' }} /> },
    { key: 'fall', label: '跌幅榜', icon: <ArrowDownOutlined style={{ color: '#52c41a' }} /> },
    { key: 'volume', label: '成交量榜', icon: '🔥' },
    { key: 'turnover', label: '换手率榜', icon: '🔄' },
  ];

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
                  <span style={getChangeColor(index.change_pct)}>
                    {index.price.toFixed(2)}
                  </span>
                  <span style={getChangeColor(index.change_pct)}>
                    {index.change_pct > 0 ? '+' : ''}{index.change_pct.toFixed(2)}%
                  </span>
                  <span style={getChangeColor(index.change_pct)}>
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

            {/* 错误提示 */}
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

            {/* Tab切换 */}
            <Tabs activeKey={activeTab} onChange={handleTabChange} type="card">
              {tabConfig.map(tab => (
                <TabPane
                  tab={<span>{tab.icon} {tab.label}</span>}
                  key={tab.key}
                />
              ))}
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
                locale={{
                  emptyText: '暂无数据'
                }}
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
