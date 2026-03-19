import React, { useState, useEffect, useRef } from 'react';
import { Layout, Menu, Card, Row, Col, Button, Input, List, Typography, Space, Spin, Divider, Tag, Timeline, Alert, message, Tooltip, Badge, Popconfirm } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { RobotOutlined, SendOutlined, LoadingOutlined, FileTextOutlined, BulbOutlined, DeleteOutlined, HistoryOutlined, LineChartOutlined, FireOutlined, BankOutlined, StockOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import axios from 'axios';
import './Dashboard.css';

const { Header, Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const API_BASE = 'http://170.106.119.80:8090/api';
const DEEPSEEK_API_URL = 'https://api.lkeap.cloud.tencent.com/coding/v3';
const DEEPSEEK_API_KEY = 'sk-sp-kTzguyvtV6yrvRNOTfzsyLEXxj0NMFRN73HivZWoV7G82vdd';

interface PageProps {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  stockData?: StockBasicData;
}

interface StockBasicData {
  symbol: string;
  name: string;
  price: number;
  change_pct: number;
  volume?: number;
  turnover?: number;
  pe?: number;
  pb?: number;
  market_cap?: number;
}

// 生成唯一ID
const generateId = () => Math.random().toString(36).substring(2, 15);

// 系统提示词
const SYSTEM_PROMPT = `你是专业的股票分析师，擅长技术分析和基本面分析。请基于提供的数据给出专业、客观的分析建议。注意风险提示。`;

// 获取个股数据
const fetchStockBasicData = async (symbol: string): Promise<StockBasicData | null> => {
  try {
    // 标准化股票代码
    const normalizedSymbol = symbol.replace(/\D/g, '');
    const marketPrefix = normalizedSymbol.startsWith('6') ? '1' : '0';
    const secid = `${marketPrefix}.${normalizedSymbol}`;
    
    // 调用东方财富API获取实时数据
    const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?fields=f2,f3,f12,f14,f5,f6,f9,f23,f20&secids=${secid}`;
    const response = await axios.get(url);
    
    if (response.data?.data?.diff && response.data.data.diff.length > 0) {
      const data = response.data.data.diff[0];
      return {
        symbol: data.f12,
        name: data.f14,
        price: data.f2 ? data.f2 / 100 : 0,
        change_pct: data.f3 ? data.f3 / 100 : 0,
        volume: data.f5,
        turnover: data.f6 ? data.f6 / 100000000 : 0, // 亿元
        pe: data.f9 ? data.f9 / 100 : 0,
        pb: data.f23 ? data.f23 / 100 : 0,
        market_cap: data.f20 ? data.f20 / 100000000 : 0, // 亿元
      };
    }
    return null;
  } catch (error) {
    console.error('获取股票数据失败:', error);
    return null;
  }
};

// 构建个股分析提示词
const buildStockAnalysisPrompt = (stockData: StockBasicData): string => {
  return `请分析股票${stockData.symbol}(${stockData.name})，当前价格${stockData.price.toFixed(2)}元，涨跌幅${stockData.change_pct.toFixed(2)}%。

股票基本信息：
- 总市值：${stockData.market_cap ? (stockData.market_cap / 10000).toFixed(2) + '万亿' : '未知'}
- 市盈率(PE)：${stockData.pe ? stockData.pe.toFixed(2) : '未知'}
- 市净率(PB)：${stockData.pb ? stockData.pb.toFixed(2) : '未知'}
- 成交额：${stockData.turnover ? stockData.turnover.toFixed(2) + '亿' : '未知'}

请从以下维度分析:
1. 技术面（均线、MACD、RSI）
2. 基本面（PE/PB估值）
3. 资金面（主力流向）
4. 风险提示
5. 操作建议

注意：
- 请基于当前价格${stockData.price.toFixed(2)}元和涨跌幅${stockData.change_pct.toFixed(2)}%进行分析
- 提供具体、可操作的建议
- 必须包含风险提示`;
};

// 调用DeepSeek API
const callDeepSeekAPI = async (
  messages: { role: string; content: string }[],
  onChunk?: (chunk: string) => void
): Promise<string> => {
  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-r1',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';

  if (!reader) {
    throw new Error('无法读取响应流');
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;
        
        try {
          const parsed = JSON.parse(data);
          if (parsed.choices?.[0]?.delta?.content) {
            const content = parsed.choices[0].delta.content;
            fullContent += content;
            if (onChunk) {
              onChunk(content);
            }
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }
  }

  return fullContent;
};

const AIAnalysis: React.FC<PageProps> = ({ darkMode, setDarkMode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [sentiment, setSentiment] = useState<any>(null);
  const [scanResults, setScanResults] = useState<any[]>([]);

  const menuItems = [
    { key: '/dashboard', icon: '📊', label: '大盘情绪' },
    { key: '/strategy', icon: '📈', label: '策略回测' },
    { key: '/stock-select', icon: '🔍', label: '量化选股' },
    { key: '/industry', icon: '🏭', label: '行业分析' },
    { key: '/market', icon: '💹', label: '实时行情' },
    { key: '/watchlist', icon: '⭐', label: '自选股' },
    { key: '/ai-analysis', icon: '🤖', label: 'AI分析' },
  ];

  // 预设场景按钮
  const presetButtons = [
    { 
      key: 'market', 
      icon: <LineChartOutlined />, 
      label: '大盘分析', 
      prompt: '请分析当前A股市场整体情况，包括上证指数、深证成指、创业板指的走势，市场情绪，以及成交额变化。'
    },
    { 
      key: 'hot', 
      icon: <FireOutlined />, 
      label: '热点追踪', 
      prompt: '今天市场有哪些热点板块？请分析涨幅居前的行业和概念板块，并说明上涨原因。'
    },
    { 
      key: 'advice', 
      icon: <BulbOutlined />, 
      label: '投资建议', 
      prompt: '当前市场环境下有什么投资策略建议？请从仓位管理、板块配置、风险控制等角度给出建议。'
    },
  ];

  // 从localStorage加载历史对话
  useEffect(() => {
    const savedMessages = localStorage.getItem('ai_analysis_messages');
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })));
      } catch (e) {
        console.error('加载历史对话失败:', e);
      }
    } else {
      // 首次使用，生成每日晨报
      generateDailyReport();
    }
  }, []);

  // 保存对话到localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('ai_analysis_messages', JSON.stringify(messages));
    }
  }, [messages]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // 获取市场数据
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sentimentRes, scanRes] = await Promise.all([
        axios.get(`${API_BASE}/market/sentiment`),
        axios.get(`${API_BASE}/market/scan`)
      ]);
      setSentiment(sentimentRes.data);
      setScanResults(scanRes.data.results || []);
    } catch (err) {
      console.error('获取数据失败', err);
    }
  };

  // 清空对话
  const clearMessages = () => {
    setMessages([]);
    localStorage.removeItem('ai_analysis_messages');
    message.success('对话已清空');
  };

  // 生成每日晨报
  const generateDailyReport = async () => {
    try {
      const [sentimentRes, scanRes] = await Promise.all([
        axios.get(`${API_BASE}/market/sentiment`).catch(() => ({ data: null })),
        axios.get(`${API_BASE}/market/scan`).catch(() => ({ data: { results: [] } }))
      ]);
      
      const sentimentData = sentimentRes.data;
      const scanResultsData = scanRes.data.results || [];
      
      const topGainers = scanResultsData.filter((s: any) => s.score > 2).slice(0, 5);
      const topLosers = scanResultsData.filter((s: any) => s.score < -2).slice(0, 5);
      
      const reportContent = `## 📊 每日市场晨报

**市场情绪**: ${sentimentData?.temperature || 37}% (${sentimentData?.temperature > 50 ? '偏多' : '偏空'})
**成交额**: ${((sentimentData?.total_amount || 0) / 1e12).toFixed(2)}万亿
**上证指数**: ${sentimentData?.index_price || '-'} (${sentimentData?.index_change || 0}%)

### 🚀 今日重点关注
${topGainers.length > 0 ? topGainers.map((s: any, i: number) => `${i+1}. **${s.name || s.symbol}** - 评分: ${s.score} ${s.stars}\n   技术信号: ${s.signals?.join(', ')}`).join('\n\n') : '暂无强看多标的'}

### ⚠️ 风险提示
${topLosers.length > 0 ? topLosers.map((s: any, i: number) => `${i+1}. **${s.name || s.symbol}** - 评分: ${s.score} ${s.stars}`).join('\n') : '暂无强看空标的'}

### 💡 AI建议
基于当前技术面分析，建议关注评分较高的个股，同时注意控制仓位。`;

      const report: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: reportContent,
        timestamp: new Date()
      };

      setMessages([report]);
    } catch (err) {
      console.error('生成晨报失败:', err);
    }
  };

  const handleMenuClick = (key: string) => {
    navigate(key);
  };

  // 检查是否包含股票代码
  const extractStockSymbol = (text: string): string | null => {
    // 匹配6位数字（股票代码）
    const match = text.match(/\b(\d{6})\b/);
    return match ? match[1] : null;
  };

  // 处理AI回复
  const handleSend = async (customInput?: string) => {
    const textToSend = customInput || input;
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setStreamingContent('');

    try {
      // 检查是否需要获取股票数据
      const stockSymbol = extractStockSymbol(textToSend);
      let stockData: StockBasicData | null = null;
      let promptContent = textToSend;

      if (stockSymbol) {
        // 获取股票基础数据
        stockData = await fetchStockBasicData(stockSymbol);
        if (stockData) {
          promptContent = buildStockAnalysisPrompt(stockData);
        }
      }

      // 准备对话历史
      const apiMessages = messages
        .filter(m => m.role !== 'assistant' || !m.content.startsWith('## 📊 每日市场晨报'))
        .slice(-10) // 只保留最近10条
        .map(m => ({
          role: m.role,
          content: m.content
        }));

      apiMessages.push({
        role: 'user',
        content: promptContent
      });

      // 调用DeepSeek API
      let fullResponse = '';
      await callDeepSeekAPI(apiMessages, (chunk) => {
        fullResponse += chunk;
        setStreamingContent(fullResponse);
      });

      // 添加AI回复到消息列表
      const aiMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date(),
        stockData: stockData || undefined
      };

      setMessages(prev => [...prev, aiMsg]);
      setStreamingContent('');
    } catch (error) {
      console.error('AI调用失败:', error);
      message.error('AI分析失败，请稍后重试');
      
      // 添加错误消息
      const errorMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: '❌ 抱歉，AI服务暂时不可用，请稍后重试。\n\n您可以尝试：\n1. 检查网络连接\n2. 刷新页面重试\n3. 联系管理员',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // 处理预设按钮点击
  const handlePresetClick = (prompt: string) => {
    handleSend(prompt);
  };

  // 处理个股诊断
  const handleStockDiagnosis = () => {
    const symbol = input.trim();
    if (!symbol) {
      message.warning('请输入股票代码');
      return;
    }
    if (!/^\d{6}$/.test(symbol)) {
      message.warning('请输入正确的6位股票代码');
      return;
    }
    handleSend(`分析股票${symbol}`);
  };

  // 渲染Markdown内容
  const renderMessageContent = (content: string) => {
    return (
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                style={darkMode ? vscDarkPlus : oneLight}
                language={match[1]}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          table({ children }: any) {
            return (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ 
                  borderCollapse: 'collapse', 
                  width: '100%',
                  border: `1px solid ${darkMode ? '#30363d' : '#d9d9d9'}`
                }}>
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }: any) {
            return <thead style={{ background: darkMode ? '#21262d' : '#f5f5f5' }}>{children}</thead>;
          },
          th({ children }: any) {
            return (
              <th style={{ 
                padding: '8px 12px', 
                border: `1px solid ${darkMode ? '#30363d' : '#d9d9d9'}`,
                textAlign: 'left',
                fontWeight: 600
              }}>
                {children}
              </th>
            );
          },
          td({ children }: any) {
            return (
              <td style={{ 
                padding: '8px 12px', 
                border: `1px solid ${darkMode ? '#30363d' : '#d9d9d9'}` 
              }}>
                {children}
              </td>
            );
          },
          h1({ children }: any) {
            return <h1 style={{ fontSize: '1.5em', fontWeight: 600, marginBottom: '0.5em' }}>{children}</h1>;
          },
          h2({ children }: any) {
            return <h2 style={{ fontSize: '1.3em', fontWeight: 600, margin: '0.8em 0 0.4em' }}>{children}</h2>;
          },
          h3({ children }: any) {
            return <h3 style={{ fontSize: '1.1em', fontWeight: 600, margin: '0.6em 0 0.3em' }}>{children}</h3>;
          },
          p({ children }: any) {
            return <p style={{ margin: '0.5em 0', lineHeight: 1.6 }}>{children}</p>;
          },
          ul({ children }: any) {
            return <ul style={{ paddingLeft: '1.5em', margin: '0.5em 0' }}>{children}</ul>;
          },
          ol({ children }: any) {
            return <ol style={{ paddingLeft: '1.5em', margin: '0.5em 0' }}>{children}</ol>;
          },
          li({ children }: any) {
            return <li style={{ margin: '0.3em 0' }}>{children}</li>;
          },
          blockquote({ children }: any) {
            return (
              <blockquote style={{ 
                borderLeft: `4px solid ${darkMode ? '#1f6feb' : '#1890ff'}`,
                paddingLeft: '1em',
                margin: '0.5em 0',
                color: darkMode ? '#8b949e' : '#666'
              }}>
                {children}
              </blockquote>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  // 快速提问
  const quickQuestions = [
    '分析贵州茅台',
    '分析600519',
    '今天市场怎么样',
    '推荐看多股票',
    '风险警示',
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
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24}>
              <Card size="small" style={{ background: darkMode ? '#161b22' : '#f6f8fa' }}>
                <Space wrap align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space wrap>
                    <Text strong style={{ marginRight: 8 }}>AI助手：</Text>
                    {presetButtons.map(btn => (
                      <Button
                        key={btn.key}
                        type="dashed"
                        icon={btn.icon}
                        size="small"
                        onClick={() => handlePresetClick(btn.prompt)}
                        loading={loading}
                      >
                        {btn.label}
                      </Button>
                    ))}
                    <Tooltip title="输入股票代码后点击诊断">
                      <Button
                        type="primary"
                        icon={<StockOutlined />}
                        size="small"
                        onClick={handleStockDiagnosis}
                        loading={loading}
                      >
                        个股诊断
                      </Button>
                    </Tooltip>
                  </Space>
                  <Popconfirm
                    title="确定要清空所有对话吗？"
                    description="此操作不可恢复"
                    onConfirm={clearMessages}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button 
                      type="text" 
                      danger 
                      icon={<DeleteOutlined />}
                      size="small"
                    >
                      清空对话
                    </Button>
                  </Popconfirm>
                </Space>
              </Card>
            </Col>
          </Row>
          
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
              <Card 
                title={
                  <Space>
                    <RobotOutlined />
                    <span>AI对话助手</span>
                    <Badge status={loading ? "processing" : "success"} text={loading ? "分析中" : "就绪"} />
                  </Space>
                }
                className="chat-card"
                bodyStyle={{ padding: 0, height: 'calc(100vh - 320px)', minHeight: 400, display: 'flex', flexDirection: 'column' }}
              >
                {/* 消息列表 */}
                <div style={{ 
                  flex: 1, 
                  overflowY: 'auto', 
                  padding: 16,
                  background: darkMode ? '#0d1117' : '#f5f5f5'
                }}>
                  {messages.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: darkMode ? '#8b949e' : '#666' }}>
                      <RobotOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }} />
                      <Paragraph>
                        我是您的AI股票分析助手
                      </Paragraph>
                      <Paragraph type="secondary" style={{ fontSize: 14 }}>
                        点击下方快捷按钮或输入股票代码开始分析
                      </Paragraph>
                    </div>
                  )}
                  
                  <List
                    dataSource={messages}
                    renderItem={(msg, index) => (
                      <div style={{ 
                        marginBottom: 16,
                        display: 'flex',
                        justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                      }}>
                        <div style={{
                          maxWidth: '85%',
                          padding: 12,
                          borderRadius: 12,
                          background: msg.role === 'user' 
                            ? (darkMode ? '#1f6feb' : '#1890ff')
                            : (darkMode ? '#21262d' : '#fff'),
                          color: msg.role === 'user' ? '#fff' : (darkMode ? '#c9d1d9' : '#333'),
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          border: msg.role === 'assistant' ? `1px solid ${darkMode ? '#30363d' : '#e8e8e8'}` : 'none'
                        }}>
                          <div style={{ 
                            fontSize: 11, 
                            marginBottom: 8,
                            opacity: 0.7,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                          }}>
                            <span>{msg.role === 'user' ? '您' : '🤖 AI助手'}</span>
                            <span>·</span>
                            <span>{msg.timestamp.toLocaleTimeString()}</span>
                            {msg.stockData && (
                              <>
                                <span>·</span>
                                <Tag color="blue">{msg.stockData.symbol}</Tag>
                              </>
                            )}
                          </div>
                          <div style={{ 
                            lineHeight: 1.6,
                            wordBreak: 'break-word'
                          }}>
                            {msg.role === 'user' ? (
                              <span>{msg.content}</span>
                            ) : (
                              renderMessageContent(msg.content)
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  />
                  
                  {/* 流式输出内容 */}
                  {streamingContent && (
                    <div style={{ 
                      marginBottom: 16,
                      display: 'flex',
                      justifyContent: 'flex-start'
                    }}>
                      <div style={{
                        maxWidth: '85%',
                        padding: 12,
                        borderRadius: 12,
                        background: darkMode ? '#21262d' : '#fff',
                        color: darkMode ? '#c9d1d9' : '#333',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        border: `1px solid ${darkMode ? '#30363d' : '#e8e8e8'}`
                      }}>
                        <div style={{ 
                          fontSize: 11, 
                          marginBottom: 8,
                          opacity: 0.7,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8
                        }}>
                          <span>🤖 AI助手</span>
                          <span>·</span>
                          <span>{new Date().toLocaleTimeString()}</span>
                          <span>·</span>
                          <span style={{ color: '#1890ff' }}>正在输入...</span>
                        </div>
                        <div style={{ lineHeight: 1.6 }}>
                          {renderMessageContent(streamingContent)}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {loading && !streamingContent && (
                    <div style={{ textAlign: 'center', padding: 20 }}>
                      <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
                      <Text type="secondary" style={{ marginLeft: 8 }}>AI分析中...</Text>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* 输入框 */}
                <div style={{ 
                  padding: 12, 
                  borderTop: `1px solid ${darkMode ? '#30363d' : '#e8e8e8'}`,
                  background: darkMode ? '#161b22' : '#fff'
                }}>
                  <Space direction="vertical" style={{ width: '100%' }} size={8}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <TextArea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="输入您的问题或股票代码（如：600519），按回车发送..."
                        autoSize={{ minRows: 1, maxRows: 4 }}
                        onPressEnter={(e) => {
                          if (!e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        style={{ flex: 1 }}
                        disabled={loading}
                      />
                      <Button 
                        type="primary" 
                        icon={<SendOutlined />}
                        onClick={() => handleSend()}
                        loading={loading}
                        disabled={!input.trim()}
                      >
                        发送
                      </Button>
                    </div>
                    <Space wrap>
                      <Text type="secondary" style={{ fontSize: 12 }}>快速提问:</Text>
                      {quickQuestions.map((q, i) => (
                        <Button 
                          key={i} 
                          size="small" 
                          type="link"
                          disabled={loading}
                          onClick={() => {
                            setInput(q);
                            setTimeout(() => handleSend(q), 100);
                          }}
                        >
                          {q}
                        </Button>
                      ))}
                    </Space>
                  </Space>
                </div>
              </Card>
            </Col>
            
            <Col xs={24} lg={8}>
              <Card 
                title={
                  <Space>
                    <BulbOutlined />
                    <span>AI功能</span>
                  </Space>
                } 
                size="small"
                style={{ marginBottom: 16 }}
              >
                <Timeline mode="left">
                  <Timeline.Item dot={<FileTextOutlined />}>每日晨报自动生成</Timeline.Item>
                  <Timeline.Item dot={<RobotOutlined />}>个股技术面解读</Timeline.Item>
                  <Timeline.Item dot={<LineChartOutlined />}>市场情绪分析</Timeline.Item>
                  <Timeline.Item dot={<BankOutlined />}>投资策略建议</Timeline.Item>
                  <Timeline.Item dot={<FireOutlined />}>热点板块追踪</Timeline.Item>
                </Timeline>
                
                <Divider />
                
                <Alert
                  message="使用提示"
                  description="AI分析基于技术指标数据，仅供参考，不构成投资建议。投资有风险，决策需谨慎。"
                  type="warning"
                  showIcon
                />
              </Card>
              
              <Card 
                title="今日市场概况" 
                size="small"
                style={{ marginBottom: 16 }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">情绪温度</Text>
                    <Text strong style={{ color: sentiment?.temperature > 50 ? '#f5222d' : '#52c41a' }}>
                      {sentiment?.temperature || 37}%
                    </Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">成交额</Text>
                    <Text strong>{((sentiment?.total_amount || 0) / 1e12).toFixed(2)}万亿</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">涨跌比</Text>
                    <Text strong>{sentiment?.advance || 0}:{sentiment?.decline || 0}</Text>
                  </div>
                </Space>
              </Card>

              <Card title="使用说明" size="small">
                <Space direction="vertical" size="small">
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <strong>📊 大盘分析</strong> - 了解市场整体走势
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <strong>🔥 热点追踪</strong> - 发现市场热点板块
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <strong>💡 投资建议</strong> - 获取投资策略建议
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <strong>📈 个股诊断</strong> - 输入6位股票代码分析
                  </Text>
                </Space>
              </Card>
            </Col>
          </Row>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AIAnalysis;