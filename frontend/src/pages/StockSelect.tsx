import React, { useState, useEffect } from 'react';
import { Layout, Menu, Card, Row, Col, Button, Select, Slider, Table, Tag, Badge, Typography, Space, Divider, Radio, Drawer, Tooltip, Popconfirm, message, Statistic, Progress, List } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import axios from 'axios';
import { DownloadOutlined, PlusOutlined, EyeOutlined, CloseOutlined, FileTextOutlined, ThunderboltOutlined, RiseOutlined, FallOutlined, StockOutlined, LineChartOutlined, BarChartOutlined } from '@ant-design/icons';
import './Dashboard.css';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

const API_BASE = 'http://170.106.119.80:8090/api';

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
  volume?: number;
  ma5?: number;
  ma10?: number;
  ma20?: number;
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
    setTimeout(() => fetchScanResults(), 0);
  };

  // 快速筛选
  const quickFilter = (type: string) => {
    let newParams = { ...params };
    switch (type) {
      case 'macd_golden':
        newParams = { ...newParams, macdSignal: 'golden', scoreMin: 0 };
        break;
      case 'ma_bull':
        newParams = { ...newParams, maAlignment: 'bull', scoreMin: 0 };
        break;
      case 'rsi_oversold':
        newParams = { ...newParams, rsiMin: 0, rsiMax: 30, bbPosition: 'lower' };
        break;
      case 'bb_lower':
        newParams = { ...newParams, bbPosition: 'lower' };
        break;
      case 'strong_buy':
        newParams = { ...newParams, scoreMin: 3, scoreMax: 5 };
        break;
      case 'breakout':
        newParams = { ...newParams, macdSignal: 'golden', maAlignment: 'bull', scoreMin: 1 };
        break;
    }
    setParams(newParams);
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
    message.success(`已导出 ${filteredResults.length} 条数据 (CSV)`);
  };

  // 导出JSON
  const exportJSON = () => {
    if (filteredResults.length === 0) {
      message.warning('没有数据可导出');
      return;
    }

    const exportData = {
      exportTime: new Date().toISOString(),
      filterParams: params,
      totalCount: filteredResults.length,
      statistics: {
        avgChange: (filteredResults.reduce((sum, s) => sum + s.change_pct, 0) / filteredResults.length).toFixed(2),
        avgScore: (filteredResults.reduce((sum, s) => sum + s.score, 0) / filteredResults.length).toFixed(2),
        upCount: filteredResults.filter(s => s.change_pct > 0).length,
        downCount: filteredResults.filter(s => s.change_pct < 0).length,
      },
      stocks: filteredResults
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `量化选股_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    message.success(`已导出 ${filteredResults.length} 条数据 (JSON)`);
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

  // 涨跌幅颜色类
  const getChangeClass = (change: number) => {
    if (change > 0) return 'value up';
    if (change < 0) return 'value down';
    return 'value';
  };

  // 涨跌幅背景色
  const getChangeBgColor = (change: number, opacity = 0.1) => {
    if (change >= 5) return `rgba(245, 34, 45, ${opacity})`;
    if (change >= 2) return `rgba(250, 140, 22, ${opacity})`;
    if (change > 0) return `rgba(82, 196, 26, ${opacity})`;
    if (change <= -5) return `rgba(82, 196, 26, ${opacity * 2})`;
    if (change <= -2) return `rgba(24, 144, 255, ${opacity})`;
    if (change < 0) return `rgba(82, 196, 26, ${opacity})`;
    return 'transparent';
  };

  // 表格列定义
  const columns = [
    {
      title: '排名',
      dataIndex: 'rank',
      width: 60,
      fixed: 'left' as const,
      render: (_: any, __: any, index: number) => (
        <div style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: index < 3 ? 'linear-gradient(135deg, #ff4d4f, #ff7875)' : index < 10 ? 'linear-gradient(135deg, #ffa940, #ffc53d)' : '#f5f5f5',
          color: index < 10 ? '#fff' : '#999',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          fontSize: 13,
          boxShadow: index < 3 ? '0 2px 8px rgba(255, 77, 79, 0.4)' : 'none'
        }}>
          {index + 1}
        </div>
      )
    },
    {
      title: '代码/名称',
      dataIndex: 'symbol',
      width: 130,
      fixed: 'left' as const,
      render: (symbol: string, record: StockData) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ cursor: 'pointer', color: '#1890ff', fontSize: 14 }} onClick={() => openDetailDrawer(record)}>
            {record.name}
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{symbol}</Text>
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
      width: 85,
      align: 'right' as const,
      render: (price: number, record: StockData) => (
        <Text strong style={{ fontSize: 13 }}>¥{price?.toFixed(2)}</Text>
      )
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
        <span style={{
          padding: '2px 8px',
          borderRadius: 4,
          fontWeight: 'bold',
          fontSize: 13,
          backgroundColor: getChangeBgColor(change, 0.12),
          color: change > 0 ? '#cf1322' : change < 0 ? '#389e0d' : '#666'
        }}>
          {change > 0 ? '+' : ''}{change?.toFixed(2)}%
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
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Progress
              type="circle"
              percent={Math.round(rsi)}
              width={35}
              strokeWidth={8}
              strokeColor={color}
              format={(percent) => <span style={{ fontSize: 10, color, fontWeight: 'bold' }}>{percent}</span>}
            />
          </div>
        );
      }
    },
    {
      title: 'MACD',
      dataIndex: 'macd_signal',
      width: 75,
      align: 'center' as const,
      render: (signal: string) => {
        const isGolden = signal === '金叉';
        const isDead = signal === '死叉';
        return (
          <Tag 
            style={{ 
              fontSize: 11, 
              padding: '0 6px',
              backgroundColor: isGolden ? '#fff1f0' : isDead ? '#f6ffed' : '#f5f5f5',
              borderColor: isGolden ? '#ff4d4f' : isDead ? '#52c41a' : '#d9d9d9',
              color: isGolden ? '#cf1322' : isDead ? '#389e0d' : '#666'
            }}
          >
            {signal}
          </Tag>
        );
      }
    },
    {
      title: '均线',
      dataIndex: 'ma_trend',
      width: 85,
      align: 'center' as const,
      render: (trend: string) => {
        const isBull = trend === '多头排列';
        const isBear = trend === '空头排列';
        return (
          <Tag 
            style={{ 
              fontSize: 11, 
              padding: '0 6px',
              backgroundColor: isBull ? '#fff1f0' : isBear ? '#f6ffed' : '#f5f5f5',
              borderColor: isBull ? '#ff4d4f' : isBear ? '#52c41a' : '#d9d9d9',
              color: isBull ? '#cf1322' : isBear ? '#389e0d' : '#666'
            }}
          >
            {trend}
          </Tag>
        );
      }
    },
    {
      title: '布林带',
      dataIndex: 'bb_position_detail',
      width: 85,
      align: 'center' as const,
      render: (pos: string) => {
        let color = '#d9d9d9';
        let bgColor = '#f5f5f5';
        if (pos?.includes('上轨')) { color = '#cf1322'; bgColor = '#fff1f0'; }
        else if (pos?.includes('下轨')) { color = '#389e0d'; bgColor = '#f6ffed'; }
        else { color = '#096dd9'; bgColor = '#e6f7ff'; }
        return (
          <Tag style={{ fontSize: 11, padding: '0 6px', backgroundColor: bgColor, borderColor: color, color }}>
            {pos}
          </Tag>
        );
      }
    },
    {
      title: (
        <span style={{ cursor: 'pointer' }} onClick={() => handleSort('score')}>
          评分 {getSortIcon('score')}
        </span>
      ),
      dataIndex: 'score',
      width: 75,
      align: 'center' as const,
      render: (score: number) => {
        let color = '#999';
        let bgColor = '#f5f5f5';
        if (score >= 3) { color = '#52c41a'; bgColor = '#f6ffed'; }
        else if (score >= 1) { color = '#95de64'; bgColor = '#f6ffed'; }
        else if (score >= 0) { color = '#faad14'; bgColor = '#fffbe6'; }
        else if (score >= -1) { color = '#ff7875'; bgColor = '#fff1f0'; }
        else { color = '#f5222d'; bgColor = '#fff1f0'; }
        return (
          <span style={{
            display: 'inline-block',
            padding: '2px 10px',
            borderRadius: 12,
            backgroundColor: bgColor,
            color: color,
            fontWeight: 'bold',
            fontSize: 13,
            border: `1px solid ${color}`,
          }}>
            {score?.toFixed(1)}
          </span>
        );
      }
    },
    {
      title: '评级',
      dataIndex: 'rating',
      width: 110,
      align: 'center' as const,
      render: (rating: string, record: StockData) => (
        <Space size={4}>
          <span style={{ fontSize: 14 }}>{record.stars}</span>
          <Tag 
            style={{ 
              fontSize: 11,
              padding: '0 4px',
              backgroundColor: record.score >= 0 ? '#f6ffed' : '#fff1f0',
              borderColor: record.score >= 0 ? '#52c41a' : '#ff4d4f',
              color: record.score >= 0 ? '#389e0d' : '#cf1322'
            }}
          >
            {rating}
          </Tag>
        </Space>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: StockData) => (
        <Space size={0}>
          <Tooltip title="查看详情">
            <Button 
              type="text" 
              size="small" 
              icon={<EyeOutlined />} 
              onClick={() => openDetailDrawer(record)}
              style={{ color: '#1890ff' }}
            />
          </Tooltip>
          <Tooltip title="加入自选">
            <Button 
              type="text" 
              size="small" 
              icon={<PlusOutlined />} 
              onClick={() => addToWatchlist(record)}
              disabled={watchlist.includes(record.symbol)}
              style={{ color: watchlist.includes(record.symbol) ? '#999' : '#52c41a' }}
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
          },
          borderRadius: [4, 4, 0, 0]
        }
      }]
    };
  };

  // K线缩略图配置
  const getMiniKLineOption = (stock: StockData | null) => {
    if (!stock) return {};
    
    // 模拟生成一些K线数据（实际应用中应该从API获取）
    const days = 30;
    const dates: string[] = [];
    const data: number[][] = [];
    let basePrice = stock.price;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0].slice(5));
      
      const open = basePrice * (1 + (Math.random() - 0.5) * 0.04);
      const close = basePrice * (1 + (Math.random() - 0.5) * 0.04);
      const low = Math.min(open, close) * (1 - Math.random() * 0.02);
      const high = Math.max(open, close) * (1 + Math.random() * 0.02);
      data.push([parseFloat(open.toFixed(2)), parseFloat(close.toFixed(2)), parseFloat(low.toFixed(2)), parseFloat(high.toFixed(2))]);
    }

    return {
      backgroundColor: 'transparent',
      grid: { left: '8%', right: '5%', top: '10%', bottom: '15%' },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { color: darkMode ? '#999' : '#666', fontSize: 9 },
        axisLine: { show: false }
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: { color: darkMode ? '#999' : '#666', fontSize: 9 },
        splitLine: { lineStyle: { color: darkMode ? '#333' : '#f0f0f0' } }
      },
      series: [{
        type: 'candlestick',
        data: data,
        itemStyle: {
          color: '#f5222d',
          color0: '#52c41a',
          borderColor: '#f5222d',
          borderColor0: '#52c41a'
        }
      }]
    };
  };

  // 技术指标雷达图
  const getTechRadarOption = (stock: StockData | null) => {
    if (!stock) return {};
    
    return {
      backgroundColor: 'transparent',
      radar: {
        indicator: [
          { name: '趋势强度', max: 100 },
          { name: '动量', max: 100 },
          { name: '波动性', max: 100 },
          { name: '成交量', max: 100 },
          { name: '资金流入', max: 100 },
        ],
        radius: '65%',
        axisName: {
          color: darkMode ? '#999' : '#666',
          fontSize: 10
        },
        splitArea: {
          areaStyle: {
            color: ['rgba(24, 144, 255, 0.05)', 'rgba(24, 144, 255, 0.1)', 
                    'rgba(24, 144, 255, 0.15)', 'rgba(24, 144, 255, 0.2)']
          }
        }
      },
      series: [{
        type: 'radar',
        data: [{
          value: [
            Math.max(0, Math.min(100, (stock.score + 5) * 10)),
            Math.max(0, Math.min(100, stock.rsi)),
            Math.max(0, Math.min(100, (stock.bb_position || 0.5) * 100)),
            70,
            Math.max(0, Math.min(100, (stock.change_pct + 10) * 5))
          ],
          name: '技术指标',
          areaStyle: {
            color: stock.score >= 0 ? 'rgba(82, 196, 26, 0.3)' : 'rgba(245, 34, 45, 0.3)'
          },
          lineStyle: {
            color: stock.score >= 0 ? '#52c41a' : '#f5222d'
          },
          itemStyle: {
            color: stock.score >= 0 ? '#52c41a' : '#f5222d'
          }
        }]
      }]
    };
  };

  // 统计信息
  const getStatistics = () => {
    if (filteredResults.length === 0) return null;
    
    const avgChange = filteredResults.reduce((sum, s) => sum + s.change_pct, 0) / filteredResults.length;
    const avgScore = filteredResults.reduce((sum, s) => sum + s.score, 0) / filteredResults.length;
    const upCount = filteredResults.filter(s => s.change_pct > 0).length;
    const downCount = filteredResults.filter(s => s.change_pct < 0).length;
    const strongBuyCount = filteredResults.filter(s => s.score >= 3).length;
    const strongSellCount = filteredResults.filter(s => s.score <= -3).length;
    
    return { avgChange, avgScore, upCount, downCount, strongBuyCount, strongSellCount };
  };

  const stats = getStatistics();

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
        
        <Content className="content" style={{ padding: '16px' }}>
          <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
            <Col>
              <Title level={4} style={{ margin: 0 }}>🔍 量化因子选股</Title>
            </Col>
            <Col>
              <Space>
                <Button 
                  type="dashed" 
                  icon={<DownloadOutlined />} 
                  onClick={exportCSV}
                  disabled={filteredResults.length === 0}
                  size="small"
                >
                  导出CSV
                </Button>
                <Button 
                  type="dashed" 
                  icon={<FileTextOutlined />} 
                  onClick={exportJSON}
                  disabled={filteredResults.length === 0}
                  size="small"
                >
                  导出JSON
                </Button>
              </Space>
            </Col>
          </Row>
          
          {/* 筛选条件区域 - 紧凑卡片设计 */}
          <Card 
            size="small" 
            style={{ marginBottom: 16 }}
            bodyStyle={{ padding: '12px 16px' }}
          >
            <Row gutter={[16, 8]} align="middle">
              <Col xs={24} lg={18}>
                <Row gutter={[16, 12]}>
                  <Col xs={12} sm={8} md={6} lg={5}>
                    <div>
                      <Text style={{ fontSize: 12, color: '#666' }}>RSI范围 [{params.rsiMin}-{params.rsiMax}]</Text>
                      <Slider
                        range
                        min={0}
                        max={100}
                        value={[params.rsiMin, params.rsiMax]}
                        onChange={(val) => setParams({...params, rsiMin: val[0], rsiMax: val[1]})}
                        style={{ margin: '4px 0 0' }}
                      />
                    </div>
                  </Col>
                  <Col xs={12} sm={8} md={6} lg={4}>
                    <div>
                      <Text style={{ fontSize: 12, color: '#666' }}>MACD信号</Text>
                      <Select
                        value={params.macdSignal}
                        onChange={(val) => setParams({...params, macdSignal: val})}
                        style={{ width: '100%', marginTop: 4 }}
                        size="small"
                        options={[
                          { label: '全部', value: 'all' },
                          { label: '金叉', value: 'golden' },
                          { label: '死叉', value: 'dead' },
                        ]}
                      />
                    </div>
                  </Col>
                  <Col xs={12} sm={8} md={6} lg={4}>
                    <div>
                      <Text style={{ fontSize: 12, color: '#666' }}>均线排列</Text>
                      <Select
                        value={params.maAlignment}
                        onChange={(val) => setParams({...params, maAlignment: val})}
                        style={{ width: '100%', marginTop: 4 }}
                        size="small"
                        options={[
                          { label: '全部', value: 'all' },
                          { label: '多头排列', value: 'bull' },
                          { label: '空头排列', value: 'bear' },
                        ]}
                      />
                    </div>
                  </Col>
                  <Col xs={12} sm={8} md={6} lg={4}>
                    <div>
                      <Text style={{ fontSize: 12, color: '#666' }}>布林带位置</Text>
                      <Select
                        value={params.bbPosition}
                        onChange={(val) => setParams({...params, bbPosition: val})}
                        style={{ width: '100%', marginTop: 4 }}
                        size="small"
                        options={[
                          { label: '全部', value: 'all' },
                          { label: '上轨附近', value: 'upper' },
                          { label: '中轨附近', value: 'middle' },
                          { label: '下轨附近', value: 'lower' },
                        ]}
                      />
                    </div>
                  </Col>
                  <Col xs={12} sm={8} md={6} lg={5}>
                    <div>
                      <Text style={{ fontSize: 12, color: '#666' }}>综合评分 [{params.scoreMin} - {params.scoreMax}]</Text>
                      <Slider
                        range
                        min={-5}
                        max={5}
                        step={0.5}
                        value={[params.scoreMin, params.scoreMax]}
                        onChange={(val) => setParams({...params, scoreMin: val[0], scoreMax: val[1]})}
                        style={{ margin: '4px 0 0' }}
                      />
                    </div>
                  </Col>
                  <Col xs={12} sm={8} md={6} lg={2}>
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Button type="primary" size="small" block onClick={applyFilter} icon={<ThunderboltOutlined />}>
                        筛选
                      </Button>
                      <Button size="small" block onClick={resetFilter}>
                        重置
                      </Button>
                    </Space>
                  </Col>
                </Row>
              </Col>
              <Col xs={24} lg={6}>
                <Card size="small" style={{ background: '#f6ffed', border: '1px solid #b7eb8f' }} bodyStyle={{ padding: 8 }}>
                  <Text style={{ fontSize: 12, color: '#52c41a', fontWeight: 'bold' }}>
                    <ThunderboltOutlined /> 快速筛选
                  </Text>
                  <div style={{ marginTop: 6 }}>
                    <Space wrap size={4}>
                      <Button size="small" onClick={() => quickFilter('macd_golden')} style={{ fontSize: 11 }}>
                        MACD金叉
                      </Button>
                      <Button size="small" onClick={() => quickFilter('ma_bull')} style={{ fontSize: 11 }}>
                        均线多头
                      </Button>
                      <Button size="small" onClick={() => quickFilter('rsi_oversold')} style={{ fontSize: 11 }}>
                        RSI超卖
                      </Button>
                      <Button size="small" onClick={() => quickFilter('bb_lower')} style={{ fontSize: 11 }}>
                        布林下轨
                      </Button>
                      <Button size="small" type="primary" danger onClick={() => quickFilter('strong_buy')} style={{ fontSize: 11 }}>
                        强烈看多
                      </Button>
                      <Button size="small" type="primary" onClick={() => quickFilter('breakout')} style={{ fontSize: 11 }}>
                        突破信号
                      </Button>
                    </Space>
                  </div>
                </Card>
              </Col>
            </Row>
          </Card>

          {/* 统计信息区域 */}
          {stats && (
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={12} sm={6}>
                <Card size="small" bodyStyle={{ padding: 12 }}>
                  <Statistic 
                    title="选股结果" 
                    value={filteredResults.length} 
                    suffix="只"
                    valueStyle={{ color: '#1890ff', fontSize: 20 }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" bodyStyle={{ padding: 12 }}>
                  <Statistic 
                    title="平均涨跌幅" 
                    value={stats.avgChange} 
                    suffix="%"
                    precision={2}
                    valueStyle={{ color: stats.avgChange >= 0 ? '#cf1322' : '#389e0d', fontSize: 20 }}
                    prefix={stats.avgChange >= 0 ? <RiseOutlined /> : <FallOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" bodyStyle={{ padding: 12 }}>
                  <Statistic 
                    title="平均评分" 
                    value={stats.avgScore} 
                    precision={2}
                    valueStyle={{ color: stats.avgScore >= 0 ? '#52c41a' : '#f5222d', fontSize: 20 }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" bodyStyle={{ padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#666' }}>涨跌分布</div>
                      <div style={{ fontSize: 20, fontWeight: 'bold' }}>
                        <span style={{ color: '#cf1322' }}>{stats.upCount}</span>
                        <span style={{ color: '#999', margin: '0 4px' }}>/</span>
                        <span style={{ color: '#389e0d' }}>{stats.downCount}</span>
                      </div>
                    </div>
                    <Progress
                      type="circle"
                      percent={Math.round((stats.upCount / filteredResults.length) * 100)}
                      width={45}
                      strokeWidth={10}
                      strokeColor="#52c41a"
                      format={(p) => <span style={{ fontSize: 10 }}>{p}%</span>}
                    />
                  </div>
                </Card>
              </Col>
            </Row>
          )}

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={18}>
              {/* 筛选结果表格 */}
              <Card 
                title={`筛选结果 (${filteredResults.length}只)`} 
                size="small"
                bodyStyle={{ padding: 0 }}
                extra={
                  <Space size={4}>
                    <Button type="link" size="small" onClick={fetchScanResults} loading={loading}>
                      刷新数据
                    </Button>
                  </Space>
                }
              >
                <Table
                  dataSource={filteredResults}
                  columns={columns}
                  rowKey="symbol"
                  pagination={{ 
                    pageSize: 10, 
                    showSizeChanger: true, 
                    showTotal: (total) => `共 ${total} 条`,
                    size: 'small'
                  }}
                  size="small"
                  scroll={{ x: 1000 }}
                  loading={loading}
                  rowClassName={(record) => record.change_pct >= 5 ? 'highlight-row' : ''}
                />
              </Card>
            </Col>
            <Col xs={24} lg={6}>
              {/* 评分分布图 */}
              <Card title="评分分布" size="small" style={{ marginBottom: 16 }}>
                <ReactECharts
                  option={getScoreDistOption()}
                  style={{ height: 160 }}
                  theme={darkMode ? 'dark' : undefined}
                />
              </Card>
              
              {/* 评级说明 */}
              <Card size="small" title="评级说明" bodyStyle={{ padding: 12 }}>
                <List
                  size="small"
                  dataSource={[
                    { stars: '⭐⭐⭐⭐⭐', range: '≥3分', desc: '强烈看多', color: '#52c41a' },
                    { stars: '⭐⭐⭐⭐', range: '1.5~3分', desc: '看多', color: '#95de64' },
                    { stars: '⭐⭐⭐', range: '0~1.5分', desc: '中性', color: '#faad14' },
                    { stars: '⭐⭐', range: '-1.5~0分', desc: '看空', color: '#ff7875' },
                    { stars: '⭐', range: '<-1.5分', desc: '强烈看空', color: '#f5222d' },
                  ]}
                  renderItem={(item) => (
                    <List.Item style={{ padding: '4px 0', border: 'none' }}>
                      <Space>
                        <span>{item.stars}</span>
                        <Text type="secondary" style={{ fontSize: 11 }}>{item.range}</Text>
                        <Tag color={item.color} style={{ fontSize: 10, margin: 0 }}>{item.desc}</Tag>
                      </Space>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
        </Content>
      </Layout>

      {/* 股票详情抽屉 - 增强版 */}
      <Drawer
        title={
          selectedStock && (
            <Space>
              <span style={{ fontSize: 18, fontWeight: 'bold' }}>{selectedStock.name}</span>
              <Text type="secondary">{selectedStock.symbol}</Text>
              <Tag color={selectedStock.score >= 0 ? 'green' : 'red'}>
                {selectedStock.rating}
              </Tag>
            </Space>
          )
        }
        placement="right"
        width={560}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        extra={
          <Space>
            <Button 
              icon={<PlusOutlined />}
              onClick={() => selectedStock && addToWatchlist(selectedStock)}
              disabled={selectedStock ? watchlist.includes(selectedStock.symbol) : true}
              size="small"
            >
              加入自选
            </Button>
            <Button type="primary" size="small" onClick={() => selectedStock && navigate(`/dashboard?symbol=${selectedStock.symbol}`)}>
              详细分析
            </Button>
          </Space>
        }
      >
        {selectedStock && (
          <div>
            {/* 价格概览 */}
            <Card size="small" style={{ marginBottom: 12, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }} bodyStyle={{ padding: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <div style={{ textAlign: 'center' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>最新价</Text>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fff' }}>
                      ¥{selectedStock.price?.toFixed(2)}
                    </div>
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ textAlign: 'center' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>涨跌幅</Text>
                    <div style={{ 
                      fontSize: 24, 
                      fontWeight: 'bold',
                      color: selectedStock.change_pct >= 0 ? '#ffccc7' : '#b7eb8f'
                    }}>
                      {selectedStock.change_pct >= 0 ? '+' : ''}{selectedStock.change_pct?.toFixed(2)}%
                    </div>
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ textAlign: 'center' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>综合评分</Text>
                    <div style={{ 
                      fontSize: 24, 
                      fontWeight: 'bold',
                      color: selectedStock.score >= 0 ? '#b7eb8f' : '#ffccc7'
                    }}>
                      {selectedStock.score?.toFixed(1)}
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>

            {/* K线缩略图 */}
            <Card 
              size="small" 
              title={<Space><StockOutlined /> K线走势 (近30日)</Space>}
              style={{ marginBottom: 12 }}
            >
              <ReactECharts
                option={getMiniKLineOption(selectedStock)}
                style={{ height: 180 }}
                theme={darkMode ? 'dark' : undefined}
              />
            </Card>

            <Row gutter={[12, 12]}>
              <Col span={12}>
                {/* 技术指标 */}
                <Card size="small" title={<Space><LineChartOutlined /> 技术指标</Space>} style={{ height: '100%' }}>
                  <Row gutter={[8, 12]}>
                    <Col span={12}>
                      <div style={{ textAlign: 'center', padding: 8, background: '#f6ffed', borderRadius: 6 }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>RSI指标</Text>
                        <div style={{ 
                          fontSize: 20, 
                          fontWeight: 'bold', 
                          color: selectedStock.rsi > 70 ? '#cf1322' : selectedStock.rsi < 30 ? '#1890ff' : '#52c41a'
                        }}>
                          {selectedStock.rsi?.toFixed(1)}
                        </div>
                      </div>
                    </Col>
                    <Col span={12}>
                      <div style={{ textAlign: 'center', padding: 8, background: selectedStock.macd_signal === '金叉' ? '#fff1f0' : selectedStock.macd_signal === '死叉' ? '#f6ffed' : '#f5f5f5', borderRadius: 6 }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>MACD</Text>
                        <div>
                          <Tag color={selectedStock.macd_signal === '金叉' ? 'red' : selectedStock.macd_signal === '死叉' ? 'green' : 'default'}>
                            {selectedStock.macd_signal}
                          </Tag>
                        </div>
                      </div>
                    </Col>
                    <Col span={12}>
                      <div style={{ textAlign: 'center', padding: 8, background: selectedStock.ma_trend === '多头排列' ? '#fff1f0' : selectedStock.ma_trend === '空头排列' ? '#f6ffed' : '#f5f5f5', borderRadius: 6 }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>均线趋势</Text>
                        <div>
                          <Tag color={selectedStock.ma_trend === '多头排列' ? 'red' : selectedStock.ma_trend === '空头排列' ? 'green' : 'default'}>
                            {selectedStock.ma_trend}
                          </Tag>
                        </div>
                      </div>
                    </Col>
                    <Col span={12}>
                      <div style={{ textAlign: 'center', padding: 8, background: '#e6f7ff', borderRadius: 6 }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>布林带</Text>
                        <div>
                          <Tag color={selectedStock.bb_position_detail?.includes('上轨') ? 'red' : selectedStock.bb_position_detail?.includes('下轨') ? 'green' : 'blue'}>
                            {selectedStock.bb_position_detail}
                          </Tag>
                        </div>
                      </div>
                    </Col>
                  </Row>
                </Card>
              </Col>
              
              <Col span={12}>
                {/* 技术指标雷达图 */}
                <Card size="small" title={<Space><BarChartOutlined /> 技术雷达</Space>}>
                  <ReactECharts
                    option={getTechRadarOption(selectedStock)}
                    style={{ height: 180 }}
                    theme={darkMode ? 'dark' : undefined}
                  />
                </Card>
              </Col>
            </Row>

            {/* 评级详情 */}
            <Card size="small" title="综合评级" style={{ marginTop: 12 }}>
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 4 }}>{selectedStock.stars}</div>
                <div style={{ fontSize: 16, color: selectedStock.score >= 0 ? '#52c41a' : '#f5222d', fontWeight: 'bold' }}>
                  {selectedStock.rating}
                </div>
              </div>
            </Card>

            {/* 技术信号 */}
            <Card size="small" title="技术信号" style={{ marginTop: 12 }}>
              <Space wrap>
                {selectedStock.signals?.map((signal, idx) => (
                  <Tag key={idx} color="blue" style={{ fontSize: 12, padding: '2px 8px' }}>
                    {signal}
                  </Tag>
                ))}
              </Space>
            </Card>
          </div>
        )}
      </Drawer>
      
      {/* 移动端底部导航 */}
      <div className={`mobile-nav ${darkMode ? 'dark' : ''}`}>
        {menuItems.map(item => (
          <div
            key={item.key}
            className={`mobile-nav-item ${location.pathname === item.key ? 'active' : ''}`}
            onClick={() => navigate(item.key)}
          >
            <span className="mobile-nav-icon">{item.icon}</span>
            <span className="mobile-nav-text">{item.label}</span>
          </div>
        ))}
      </div>
    </Layout>
  );
};

export default StockSelect;
