import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Menu, Card, Row, Col, Statistic, Badge, Spin, Alert, Switch, Space, Typography, Tag, Divider } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import axios from 'axios';
import './Dashboard.css';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

const API_BASE = 'http://170.106.119.80:8089/api';

interface DashboardProps {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ darkMode, setDarkMode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [sentiment, setSentiment] = useState<any>(null);
  const [scanResults, setScanResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const menuItems = [
    { key: '/dashboard', icon: '📊', label: '大盘情绪' },
    { key: '/strategy', icon: '📈', label: '策略回测' },
    { key: '/stock-select', icon: '🔍', label: '量化选股' },
    { key: '/industry', icon: '🏭', label: '行业分析' },
    { key: '/market', icon: '💹', label: '实时行情' },
    { key: '/watchlist', icon: '⭐', label: '自选股' },
    { key: '/ai-analysis', icon: '🤖', label: 'AI分析' },
  ];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [sentimentRes, scanRes] = await Promise.all([
        axios.get(`${API_BASE}/market/sentiment`),
        axios.get(`${API_BASE}/market/scan`).catch(() => ({ data: { results: [] } }))
      ]);
      
      setSentiment(sentimentRes.data);
      setScanResults(scanRes.data.results || []);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError('数据加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchData, 300000); // 5分钟刷新一次
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchData, autoRefresh]);

  const handleMenuClick = (key: string) => {
    navigate(key);
  };

  // 获取情绪温度颜色
  const getTempColorClass = (temp: number): string => {
    if (temp >= 70) return 'temp-high';      // ≥70 红色
    if (temp >= 50) return 'temp-medium-high'; // 50-70 橙色
    if (temp >= 30) return 'temp-medium';     // 30-50 绿色
    return 'temp-low';                        // <30 蓝色
  };

  // 顶部数据条配置（仿无川）
  const getTopBarData = () => {
    const amount = sentiment?.total_amount || 0;
    const amountInTrillion = (amount / 1e12).toFixed(2);
    const prevAmount = (amount / 1e12 - 0.074).toFixed(2);
    const amountChange = -740; // 亿
    const amountChangeStr = amountChange > 0 ? `+${amountChange}` : `${amountChange}`;
    
    return {
      temperature: sentiment?.temperature || 37,
      amount: amountInTrillion,
      prevAmount: prevAmount,
      amountChange: amountChangeStr,
      amountChangePositive: amountChange > 0,
      limitUp: sentiment?.limit_up || 68,
      limitDown: sentiment?.limit_down || 22,
      continuousHeight: sentiment?.continuous_height || 5,
      low5Days: sentiment?.low_5_days || 256,
      low3Days: sentiment?.low_3_days || 128,
      newLows: sentiment?.new_lows || 45,
      advance: sentiment?.advance || 1560,
      decline: sentiment?.decline || 3561,
      advanceRatio: ((sentiment?.advance || 0) / ((sentiment?.advance || 0) + (sentiment?.decline || 1)) * 100).toFixed(0),
      status: sentiment?.status || '震荡行情'
    };
  };

  const topData = getTopBarData();
  const tempColorClass = getTempColorClass(topData.temperature);

  // 情绪趋势图
  const getSentimentOption = () => {
    // 模拟30天情绪数据
    const dates = Array.from({length: 30}, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return `${d.getMonth() + 1}/${d.getDate()}`;
    });
    const data = dates.map(() => Math.floor(Math.random() * 60) + 20);
    
    return {
      backgroundColor: 'transparent',
      animation: false,
      title: {
        text: '大盘情绪(5日线占比)趋势',
        left: 'center',
        top: 8,
        textStyle: { 
          color: darkMode ? '#fff' : '#333',
          fontSize: 14,
          fontWeight: 'normal'
        }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: darkMode ? '#1f1f1f' : '#fff',
        textStyle: { color: darkMode ? '#fff' : '#333' }
      },
      legend: {
        show: false
      },
      grid: { left: '10%', right: '8%', top: '22%', bottom: '12%' },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: darkMode ? '#444' : '#ddd' } },
        axisLabel: { color: darkMode ? '#888' : '#999', fontSize: 10 }
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLine: { lineStyle: { color: darkMode ? '#444' : '#ddd' } },
        axisLabel: { color: darkMode ? '#888' : '#999', fontSize: 10, formatter: '{value}%' },
        splitLine: { lineStyle: { color: darkMode ? '#333' : '#f0f0f0' } }
      },
      series: [{
        data: data,
        type: 'line',
        smooth: true,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
              { offset: 1, color: 'rgba(24, 144, 255, 0.05)' }
            ]
          }
        },
        lineStyle: { color: '#1890ff', width: 2 }
      }]
    };
  };

  // 涨跌停分布图
  const getLimitOption = () => {
    return {
      backgroundColor: 'transparent',
      animation: false,
      title: {
        text: '涨跌停板分布对比',
        left: 'center',
        top: 8,
        textStyle: { 
          color: darkMode ? '#fff' : '#333',
          fontSize: 14,
          fontWeight: 'normal'
        }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: darkMode ? '#1f1f1f' : '#fff',
        textStyle: { color: darkMode ? '#fff' : '#333' }
      },
      legend: {
        data: ['涨停', '跌停'],
        top: 30,
        right: 10,
        itemGap: 8,
        textStyle: { color: darkMode ? '#999' : '#666', fontSize: 11 }
      },
      grid: { left: '10%', right: '8%', top: '22%', bottom: '12%' },
      xAxis: {
        type: 'category',
        data: ['一板', '二板', '三板', '四板', '五板+'],
        axisLine: { lineStyle: { color: darkMode ? '#444' : '#ddd' } },
        axisLabel: { color: darkMode ? '#888' : '#999', fontSize: 10 }
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: darkMode ? '#444' : '#ddd' } },
        axisLabel: { color: darkMode ? '#888' : '#999', fontSize: 10 },
        splitLine: { lineStyle: { color: darkMode ? '#333' : '#f0f0f0' } }
      },
      series: [
        {
          name: '涨停',
          type: 'bar',
          data: [45, 15, 5, 2, 1],
          itemStyle: { color: '#f5222d' }  // 红色
        },
        {
          name: '跌停',
          type: 'bar',
          data: [18, 3, 1, 0, 0],
          itemStyle: { color: '#52c41a' }  // 绿色
        }
      ]
    };
  };

  // 资金流向图
  const getMoneyFlowOption = () => {
    return {
      backgroundColor: 'transparent',
      animation: false,
      title: {
        text: '资金流向分布',
        left: 'center',
        top: 8,
        textStyle: { 
          color: darkMode ? '#fff' : '#333',
          fontSize: 14,
          fontWeight: 'normal'
        }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: darkMode ? '#1f1f1f' : '#fff',
        textStyle: { color: darkMode ? '#fff' : '#333' }
      },
      legend: {
        data: ['主力流入', '主力流出', '散户流入', '散户流出'],
        top: 30,
        right: 10,
        itemGap: 8,
        textStyle: { color: darkMode ? '#999' : '#666', fontSize: 10 }
      },
      grid: { left: '10%', right: '8%', top: '22%', bottom: '12%' },
      xAxis: {
        type: 'category',
        data: ['9:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00'],
        axisLine: { lineStyle: { color: darkMode ? '#444' : '#ddd' } },
        axisLabel: { color: darkMode ? '#888' : '#999', fontSize: 10 }
      },
      yAxis: {
        type: 'value',
        name: '亿元',
        nameTextStyle: { color: darkMode ? '#888' : '#999', fontSize: 10 },
        axisLine: { lineStyle: { color: darkMode ? '#444' : '#ddd' } },
        axisLabel: { color: darkMode ? '#888' : '#999', fontSize: 10 },
        splitLine: { lineStyle: { color: darkMode ? '#333' : '#f0f0f0' } }
      },
      series: [
        {
          name: '主力流入',
          type: 'bar',
          stack: '主力',
          data: [12, 8, 15, 10, 5, 8, 12, 18, 10, 6],
          itemStyle: { color: '#f5222d' }
        },
        {
          name: '主力流出',
          type: 'bar',
          stack: '主力',
          data: [-8, -12, -6, -15, -8, -10, -7, -5, -12, -8],
          itemStyle: { color: '#52c41a' }
        },
        {
          name: '散户流入',
          type: 'line',
          data: [5, 3, 8, 4, 2, 4, 6, 9, 5, 3],
          smooth: true,
          lineStyle: { color: '#faad14', width: 2 },
          itemStyle: { color: '#faad14' }
        },
        {
          name: '散户流出',
          type: 'line',
          data: [-3, -5, -2, -6, -3, -4, -3, -2, -5, -4],
          smooth: true,
          lineStyle: { color: '#722ed1', width: 2 },
          itemStyle: { color: '#722ed1' }
        }
      ]
    };
  };

  // 个股评分排名图
  const getRankingOption = () => {
    const top10 = scanResults.slice(0, 10);
    const names = top10.map(s => s.name || s.symbol);
    const scores = top10.map(s => s.score || 0);
    
    return {
      backgroundColor: 'transparent',
      animation: false,
      title: {
        text: '个股评分排名',
        left: 'center',
        top: 8,
        textStyle: { 
          color: darkMode ? '#fff' : '#333',
          fontSize: 14,
          fontWeight: 'normal'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: darkMode ? '#1f1f1f' : '#fff',
        textStyle: { color: darkMode ? '#fff' : '#333' }
      },
      grid: { left: '18%', right: '8%', top: '18%', bottom: '12%' },
      xAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: darkMode ? '#444' : '#ddd' } },
        axisLabel: { color: darkMode ? '#888' : '#999', fontSize: 10 },
        splitLine: { lineStyle: { color: darkMode ? '#333' : '#f0f0f0' } }
      },
      yAxis: {
        type: 'category',
        data: names.reverse(),
        axisLine: { lineStyle: { color: darkMode ? '#444' : '#ddd' } },
        axisLabel: { color: darkMode ? '#888' : '#999', fontSize: 11 }
      },
      series: [{
        type: 'bar',
        data: scores.reverse(),
        itemStyle: {
          color: (params: any) => {
            const value = params.value;
            if (value >= 80) return '#f5222d';
            if (value >= 60) return '#faad14';
            if (value >= 40) return '#1890ff';
            return '#52c41a';
          }
        },
        label: {
          show: true,
          position: 'right',
          formatter: '{c}',
          color: darkMode ? '#fff' : '#333',
          fontSize: 10
        }
      }]
    };
  };

  if (loading && !sentiment) {
    return <Spin size="large" style={{ marginTop: 100, display: 'block', textAlign: 'center' }} />;
  }

  return (
    <Layout className={`dashboard ${darkMode ? 'dark' : 'light'}`}>
      <Header className="header">
        <div className="logo">📊 OpenQuant</div>
        <div className="header-center">
          <Text style={{ color: darkMode ? '#fff' : 'inherit', fontSize: 12 }}>
            自动刷新 {autoRefresh ? '开启' : '关闭'}
          </Text>
          <Switch size="small" checked={autoRefresh} onChange={setAutoRefresh} />
          <Switch 
            size="small"
            checkedChildren="🌙" 
            unCheckedChildren="☀️" 
            checked={darkMode}
            onChange={setDarkMode}
          />
          <Text type="secondary" style={{ color: darkMode ? '#999' : 'inherit', fontSize: 11 }}>
            {lastUpdate.toLocaleTimeString()}
          </Text>
        </div>
      </Header>

      {/* 顶部数据条 - 仿无川 */}
      <div className={`top-bar ${darkMode ? 'dark' : 'light'}`}>
        {/* 情绪温度 */}
        <div className="top-bar-item">
          <span className="label">情绪温度</span>
          <span className={`value ${tempColorClass}`}>
            {topData.temperature}%
          </span>
        </div>
        
        <div className="top-bar-divider"></div>
        
        {/* 成交额 */}
        <div className="top-bar-item">
          <span className="label">成交额</span>
          <span className="value">{topData.amount}万亿</span>
          <span className={`change ${topData.amountChangePositive ? 'up' : 'down'}`}>
            {topData.amountChangePositive ? '↑' : '↓'}{Math.abs(parseInt(topData.amountChange))}亿
          </span>
        </div>
        
        <div className="top-bar-divider"></div>
        
        {/* 连板高度 */}
        <div className="top-bar-item">
          <span className="label">连板高度</span>
          <span className="value highlight">{topData.continuousHeight}板</span>
        </div>
        
        <div className="top-bar-divider"></div>
        
        {/* 涨停 - 红色 */}
        <div className="top-bar-item">
          <span className="label">涨停</span>
          <span className="value up">{topData.limitUp}</span>
        </div>
        
        {/* 跌停 - 绿色 */}
        <div className="top-bar-item">
          <span className="label">跌停</span>
          <span className="value down">{topData.limitDown}</span>
        </div>
        
        <div className="top-bar-divider"></div>
        
        {/* 涨跌比 */}
        <div className="top-bar-item">
          <span className="label">涨跌比</span>
          <span className="value">{topData.advanceRatio}</span>
        </div>
        
        <div className="top-bar-item">
          <span className="label">涨:{topData.advance}</span>
          <span className="label">跌:{topData.decline}</span>
        </div>
        
        <div className="top-bar-divider"></div>
        
        {/* 低5日、低3日 */}
        <div className="top-bar-item">
          <span className="label">低5日</span>
          <span className="value">{topData.low5Days}</span>
        </div>
        
        <div className="top-bar-item">
          <span className="label">低3日</span>
          <span className="value">{topData.low3Days}</span>
        </div>
        
        {/* 创新低 */}
        <div className="top-bar-item">
          <span className="label">创新低</span>
          <span className="value down">{topData.newLows}</span>
        </div>
        
        <div className="top-bar-divider"></div>
        
        <div className="top-bar-item">
          <Tag color="#1890ff">{topData.status}</Tag>
        </div>
        
        <div className="top-bar-item date">
          {new Date().toLocaleDateString()}
        </div>
      </div>
      
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
          {error && <Alert message={error} type="error" style={{ marginBottom: 16 }} />}
          
          {/* 图表区域 - 2列布局 */}
          <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* 第一行：情绪趋势图 + 涨跌停分布图 */}
            <Card className="chart-card" bodyStyle={{ padding: 10 }}>
              <ReactECharts 
                option={getSentimentOption()} 
                style={{ height: 320 }}
                theme={darkMode ? 'dark' : undefined}
              />
            </Card>
            
            <Card className="chart-card" bodyStyle={{ padding: 10 }}>
              <ReactECharts 
                option={getLimitOption()} 
                style={{ height: 320 }}
                theme={darkMode ? 'dark' : undefined}
              />
            </Card>
            
            {/* 第二行：资金流向图 + 个股评分排名 */}
            <Card className="chart-card" bodyStyle={{ padding: 10 }}>
              <ReactECharts 
                option={getMoneyFlowOption()} 
                style={{ height: 320 }}
                theme={darkMode ? 'dark' : undefined}
              />
            </Card>
            
            <Card className="chart-card" bodyStyle={{ padding: 10 }}>
              <ReactECharts 
                option={getRankingOption()} 
                style={{ height: 320 }}
                theme={darkMode ? 'dark' : undefined}
              />
            </Card>
          </div>
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

export default Dashboard;
