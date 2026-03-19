import React, { useState, useEffect } from 'react';
import { Layout, Menu, Card, Row, Col, Table, Typography, Badge, Spin, Alert, Statistic, Tabs } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './Dashboard.css';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;
const { TabPane } = Tabs;

const API_BASE = 'http://170.106.119.80:8090';

interface IndustryData {
  code: string;
  name: string;
  change_pct: number;
  lead_stock: string;
  lead_change: number;
  fund_flow: number;
  pe?: number;
  pb?: number;
}

interface PageProps {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

const Industry: React.FC<PageProps> = ({ darkMode, setDarkMode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [industries, setIndustries] = useState<IndustryData[]>([]);

  const menuItems = [
    { key: '/dashboard', icon: '📊', label: '大盘情绪' },
    { key: '/strategy', icon: '📈', label: '策略回测' },
    { key: '/stock-select', icon: '🔍', label: '量化选股' },
    { key: '/industry', icon: '🏭', label: '行业分析' },
    { key: '/market', icon: '💹', label: '实时行情' },
    { key: '/watchlist', icon: '⭐', label: '自选股' },
    { key: '/ai-analysis', icon: '🤖', label: 'AI分析' },
  ];

  useEffect(() => {
    fetchIndustries();
  }, []);

  const fetchIndustries = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE}/api/market/industries`);
      if (res.data && res.data.data) {
        setIndustries(res.data.data);
      }
    } catch (err: any) {
      setError('获取行业数据失败: ' + (err.message || '未知错误'));
      console.error('获取行业数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuClick = (key: string) => {
    navigate(key);
  };

  const columns = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 70,
      render: (_: any, __: any, index: number) => (
        <Badge 
          count={index + 1} 
          style={{ 
            backgroundColor: index < 3 ? '#f5222d' : index < 6 ? '#fa8c16' : '#d9d9d9',
            color: index < 6 ? '#fff' : '#666'
          }} 
        />
      ),
    },
    {
      title: '行业名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <strong>{name}</strong>,
    },
    {
      title: '涨跌幅',
      dataIndex: 'change_pct',
      key: 'change_pct',
      width: 120,
      render: (value: number) => (
        <span style={{ 
          color: value > 0 ? '#f5222d' : value < 0 ? '#52c41a' : '#666',
          fontWeight: 500
        }}>
          {value > 0 ? '+' : ''}{value?.toFixed(2)}%
        </span>
      ),
    },
    {
      title: '领涨股',
      dataIndex: 'lead_stock',
      key: 'lead_stock',
      render: (stock: string, record: IndustryData) => (
        <span>
          {stock} <span style={{ 
            color: record.lead_change > 0 ? '#f5222d' : '#52c41a',
            fontSize: 12
          }}>({record.lead_change > 0 ? '+' : ''}{record.lead_change?.toFixed(2)}%)</span>
        </span>
      ),
    },
    {
      title: '资金流向',
      dataIndex: 'fund_flow',
      key: 'fund_flow',
      width: 120,
      render: (value: number) => (
        <span style={{ 
          color: value > 0 ? '#f5222d' : value < 0 ? '#52c41a' : '#666'
        }}>
          {value > 0 ? '+' : ''}{value?.toFixed(2)}亿
        </span>
      ),
    },
    {
      title: '市盈率',
      dataIndex: 'pe',
      key: 'pe',
      width: 100,
      render: (value: number) => value?.toFixed(2) || '-',
    },
    {
      title: '市净率',
      dataIndex: 'pb',
      key: 'pb',
      width: 100,
      render: (value: number) => value?.toFixed(2) || '-',
    },
  ];

  const sortedByChange = [...industries].sort((a, b) => b.change_pct - a.change_pct);
  const sortedByFund = [...industries].sort((a, b) => b.fund_flow - a.fund_flow);

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
        
        <Content className="content" style={{ padding: 24 }}>
          <Title level={4} style={{ marginBottom: 16 }}>🏭 行业板块分析</Title>
          
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
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
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
                  title="净流入"
                  value={industries.filter(i => i.fund_flow > 0).length}
                  valueStyle={{ color: '#f5222d' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small">
                <Statistic 
                  title="净流出"
                  value={industries.filter(i => i.fund_flow < 0).length}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
          </Row>

          <Spin spinning={loading} tip="加载中...">
            <Tabs defaultActiveKey="change">
              <TabPane tab="按涨跌幅排序" key="change">
                <Card>
                  <Table 
                    dataSource={sortedByChange} 
                    columns={columns} 
                    rowKey="code"
                    pagination={false}
                    size="small"
                  />
                </Card>
              </TabPane>
              <TabPane tab="按资金流向排序" key="fund">
                <Card>
                  <Table 
                    dataSource={sortedByFund} 
                    columns={columns} 
                    rowKey="code"
                    pagination={false}
                    size="small"
                  />
                </Card>
              </TabPane>
            </Tabs>
          </Spin>
        </Content>
      </Layout>
      
      {/* 移动端底部导航 */}
      <div className={`mobile-nav ${darkMode ? 'dark' : ''}`}>
        {menuItems.map(item => (
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

export default Industry;
