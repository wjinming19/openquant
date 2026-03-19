import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Card, Spin, Typography, Button, Descriptions, Tabs, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const API_BASE = 'http://170.106.119.80:8090';

interface StockInfo {
  symbol: string;
  name: string;
  industry: string;
  market_cap: number;
  pe?: number;
  pb?: number;
  roe?: number;
  eps?: number;
  bps?: number;
}

const StockDetail: React.FC = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stockInfo, setStockInfo] = useState<StockInfo | null>(null);

  useEffect(() => {
    if (symbol) {
      fetchStockInfo(symbol);
    }
  }, [symbol]);

  const fetchStockInfo = async (stockSymbol: string) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/stock/${stockSymbol}/info`);
      setStockInfo(res.data);
    } catch (error) {
      console.error('获取股票信息失败:', error);
      message.error('获取股票信息失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!stockInfo) {
    return (
      <div style={{ padding: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          返回
        </Button>
        <div style={{ textAlign: 'center', marginTop: 100 }}>
          <Text type="secondary">暂无该股票信息</Text>
        </div>
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ padding: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
          返回
        </Button>
        
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <Title level={3} style={{ margin: 0 }}>
                {stockInfo.name || stockInfo.symbol} <Text type="secondary">({stockInfo.symbol})</Text>
              </Title>
              <Text type="secondary">{stockInfo.industry || '未知行业'}</Text>
            </div>
          </div>

          <Tabs defaultActiveKey="1">
            <TabPane tab="基本信息" key="1">
              <Descriptions bordered column={2}>
                <Descriptions.Item label="股票代码">{stockInfo.symbol}</Descriptions.Item>
                <Descriptions.Item label="股票名称">{stockInfo.name || '-'}</Descriptions.Item>
                <Descriptions.Item label="所属行业">{stockInfo.industry || '-'}</Descriptions.Item>
                <Descriptions.Item label="市值">{stockInfo.market_cap ? `${(stockInfo.market_cap / 100000000).toFixed(2)}亿` : '-'}</Descriptions.Item>
                <Descriptions.Item label="市盈率(PE)">{stockInfo.pe?.toFixed(2) || '-'}</Descriptions.Item>
                <Descriptions.Item label="市净率(PB)">{stockInfo.pb?.toFixed(2) || '-'}</Descriptions.Item>
                <Descriptions.Item label="净资产收益率(ROE)">{stockInfo.roe ? `${(stockInfo.roe * 100).toFixed(2)}%` : '-'}</Descriptions.Item>
                <Descriptions.Item label="每股收益(EPS)">{stockInfo.eps?.toFixed(2) || '-'}</Descriptions.Item>
              </Descriptions>
            </TabPane>
            
            <TabPane tab="K线数据" key="2">
              <div style={{ textAlign: 'center', padding: 50 }}>
                <Text type="secondary">K线图功能开发中...</Text>
              </div>
            </TabPane>
            
            <TabPane tab="相关新闻" key="3">
              <div style={{ textAlign: 'center', padding: 50 }}>
                <Text type="secondary">新闻功能开发中...</Text>
              </div>
            </TabPane>
          </Tabs>
        </Card>
      </div>
    </Layout>
  );
};

export default StockDetail;
