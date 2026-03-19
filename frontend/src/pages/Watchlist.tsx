import React, { useState, useEffect } from 'react';
import { Layout, Menu, Card, Row, Col, Button, Input, Select, Table, Tag, Badge, Typography, Space, Modal, Form, message, Tabs, Statistic, Checkbox, Dropdown, Tooltip, Alert, Popconfirm } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { PlusOutlined, DeleteOutlined, BellOutlined, LineChartOutlined, EditOutlined, FolderOutlined, MoreOutlined, SearchOutlined, FilterOutlined, SortAscendingOutlined, DragOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import axios from 'axios';
import './Dashboard.css';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Search } = Input;
const { TextArea } = Input;

const API_BASE = 'http://170.106.119.80:8090/api';

interface PageProps {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

interface WatchStock {
  symbol: string;
  name: string;
  price: number;
  change_pct: number;
  score: number;
  rating: string;
  alertPrice?: number;
  alertDirection?: 'above' | 'below';
  notes?: string;
  group: string;
  alertTriggered?: boolean;
  alertTriggeredAt?: string;
  addedAt?: string;
}

interface Group {
  key: string;
  label: string;
  color: string;
}

const DEFAULT_GROUPS: Group[] = [
  { key: 'default', label: '默认', color: '#1890ff' },
  { key: 'tech', label: '科技', color: '#722ed1' },
  { key: 'finance', label: '金融', color: '#52c41a' },
  { key: 'consumer', label: '消费', color: '#fa8c16' },
  { key: 'medical', label: '医药', color: '#eb2f96' },
  { key: 'energy', label: '能源', color: '#f5222d' },
  { key: 'hk', label: '港股', color: '#13c2c2' },
  { key: 'us', label: '美股', color: '#fa541c' },
];

const Watchlist: React.FC<PageProps> = ({ darkMode, setDarkMode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [watchlist, setWatchlist] = useState<WatchStock[]>([]);
  const [groups, setGroups] = useState<Group[]>(DEFAULT_GROUPS);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [groupForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [activeGroup, setActiveGroup] = useState('all');
  const [editingStock, setEditingStock] = useState<WatchStock | null>(null);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [alertMessages, setAlertMessages] = useState<{symbol: string, message: string, type: 'success' | 'warning'}[]>([]);
  const [sortBy, setSortBy] = useState<'custom' | 'change' | 'score' | 'name'>('custom');

  // 从后端API加载自选股
  useEffect(() => {
    const savedGroups = localStorage.getItem('openquant_groups');
    
    if (savedGroups) {
      setGroups(JSON.parse(savedGroups));
    }
    
    // 从后端API获取自选股
    fetchWatchlistFromAPI();
  }, []);

  // 从后端API获取自选股
  const fetchWatchlistFromAPI = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/watchlist/list`);
      if (response.data && response.data.watchlists) {
        // 将分组数据扁平化为股票列表
        const apiData: WatchStock[] = [];
        response.data.watchlists.forEach((group: any) => {
          if (group.stocks && Array.isArray(group.stocks)) {
            group.stocks.forEach((stock: any) => {
              apiData.push({
                symbol: stock.symbol,
                name: stock.name,
                price: stock.price || 0,
                change_pct: stock.change_pct || 0,
                score: stock.score || 0,
                rating: stock.rating || '-',
                group: group.id,
                notes: stock.notes,
                alertPrice: stock.alert_high || stock.alert_low,
                alertDirection: stock.alert_high ? 'above' : (stock.alert_low ? 'below' : undefined),
                addedAt: stock.added_at,
              });
            });
          }
        });
        
        // 获取实时股价
        const stocksWithPrice = await fetchRealtimePrices(apiData);
        setWatchlist(stocksWithPrice);
        // 同时更新localStorage保持同步
        localStorage.setItem('openquant_watchlist', JSON.stringify(stocksWithPrice));
        // 检查预警
        checkAlerts(stocksWithPrice);
      }
    } catch (error) {
      console.error('获取自选股失败:', error);
      message.error('获取自选股失败，使用本地数据');
      // 失败时回退到localStorage
      const saved = localStorage.getItem('openquant_watchlist');
      if (saved) {
        setWatchlist(JSON.parse(saved));
      }
    } finally {
      setLoading(false);
    }
  };

  // 获取实时股价
  const fetchRealtimePrices = async (stocks: WatchStock[]): Promise<WatchStock[]> => {
    if (stocks.length === 0) return stocks;
    
    try {
      // 使用涨幅榜API获取实时价格（因为后端没有单独的股票价格查询接口）
      const response = await axios.get(`${API_BASE}/market/rankings`, {
        params: { type: 'rise', limit: 100 },
        timeout: 10000
      });
      
      if (response.data && Array.isArray(response.data.data)) {
        const realtimeData = response.data.data;
        
        // 更新自选股价格
        return stocks.map(stock => {
          const realtime = realtimeData.find((r: any) => r.symbol === stock.symbol);
          if (realtime) {
            return {
              ...stock,
              price: realtime.price || 0,
              change_pct: realtime.change_pct || 0,
            };
          }
          return stock;
        });
      }
    } catch (error) {
      console.error('获取实时价格失败:', error);
    }
    
    return stocks;
  };

  // 保存到localStorage
  const saveWatchlist = (list: WatchStock[]) => {
    setWatchlist(list);
    localStorage.setItem('openquant_watchlist', JSON.stringify(list));
  };

  const saveGroups = (newGroups: Group[]) => {
    setGroups(newGroups);
    localStorage.setItem('openquant_groups', JSON.stringify(newGroups));
  };

  // 检查价格预警
  const checkAlerts = (list: WatchStock[]) => {
    const alerts: {symbol: string, message: string, type: 'success' | 'warning'}[] = [];
    
    list.forEach(stock => {
      if (stock.alertPrice && stock.price > 0) {
        const isTriggered = stock.alertDirection === 'above' 
          ? stock.price >= stock.alertPrice
          : stock.price <= stock.alertPrice;
        
        if (isTriggered && !stock.alertTriggered) {
          alerts.push({
            symbol: stock.symbol,
            message: `${stock.name}(${stock.symbol}) 价格${stock.alertDirection === 'above' ? '上涨至' : '下跌至'} ¥${stock.price.toFixed(2)}，触及预警线 ¥${stock.alertPrice}`,
            type: stock.alertDirection === 'above' ? 'success' : 'warning'
          });
          // 标记为已触发
          stock.alertTriggered = true;
          stock.alertTriggeredAt = new Date().toISOString();
        }
      }
    });
    
    if (alerts.length > 0) {
      setAlertMessages(alerts);
      saveWatchlist([...list]);
    }
  };

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

  // 添加自选股 - 调用后端API
  const handleAddStock = async (values: any) => {
    if (watchlist.find(s => s.symbol === values.symbol)) {
      message.warning('该股票已在自选列表中');
      return;
    }
    
    try {
      // 先获取或创建默认分组
      const listRes = await axios.get(`${API_BASE}/watchlist/list`);
      let defaultGroupId = 'wl_1';
      
      if (listRes.data && listRes.data.count === 0) {
        // 没有分组，创建默认分组
        const createRes = await axios.post(`${API_BASE}/watchlist/create`, {
          name: '我的自选'
        });
        if (createRes.data && createRes.data.watchlist) {
          defaultGroupId = createRes.data.watchlist.id;
        }
      } else if (listRes.data && listRes.data.watchlists && listRes.data.watchlists.length > 0) {
        defaultGroupId = listRes.data.watchlists[0].id;
      }
      
      // 调用后端API添加股票到分组
      const response = await axios.post(`${API_BASE}/watchlist/${defaultGroupId}/add`, {
        symbol: values.symbol,
        name: values.name || values.symbol,
      });
      
      if (response.data && response.data.success) {
        // 重新获取列表
        await fetchWatchlistFromAPI();
        setIsModalOpen(false);
        form.resetFields();
        message.success('添加成功');
      }
    } catch (error: any) {
      console.error('添加失败:', error);
      message.error(error.response?.data?.detail || '添加失败');
    }
  };

  // 删除自选股
  const handleDelete = (symbol: string) => {
    const newList = watchlist.filter(s => s.symbol !== symbol);
    saveWatchlist(newList);
    setSelectedSymbols(prev => prev.filter(s => s !== symbol));
    message.success('删除成功');
  };

  // 批量删除
  const handleBatchDelete = () => {
    const newList = watchlist.filter(s => !selectedSymbols.includes(s.symbol));
    saveWatchlist(newList);
    setSelectedSymbols([]);
    setIsBatchModalOpen(false);
    message.success(`成功删除 ${selectedSymbols.length} 只股票`);
  };

  // 批量移动分组
  const handleBatchMove = (targetGroup: string) => {
    const newList = watchlist.map(s => 
      selectedSymbols.includes(s.symbol) ? { ...s, group: targetGroup } : s
    );
    saveWatchlist(newList);
    setSelectedSymbols([]);
    setIsBatchModalOpen(false);
    message.success('移动成功');
  };

  // 编辑股票信息
  const handleEdit = (stock: WatchStock) => {
    setEditingStock(stock);
    editForm.setFieldsValue({
      notes: stock.notes,
      alertPrice: stock.alertPrice,
      alertDirection: stock.alertDirection || 'above',
      group: stock.group
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (values: any) => {
    if (!editingStock) return;
    
    const newList = watchlist.map(s => 
      s.symbol === editingStock.symbol 
        ? { 
            ...s, 
            notes: values.notes,
            alertPrice: values.alertPrice ? parseFloat(values.alertPrice) : undefined,
            alertDirection: values.alertDirection,
            group: values.group,
            alertTriggered: false // 重置预警状态
          }
        : s
    );
    saveWatchlist(newList);
    setIsEditModalOpen(false);
    setEditingStock(null);
    message.success('保存成功');
  };

  // 移动股票到分组
  const handleMoveToGroup = (symbol: string, groupKey: string) => {
    const newList = watchlist.map(s => 
      s.symbol === symbol ? { ...s, group: groupKey } : s
    );
    saveWatchlist(newList);
    message.success('移动成功');
  };

  // 创建新分组
  const handleCreateGroup = (values: any) => {
    const newGroup: Group = {
      key: `group_${Date.now()}`,
      label: values.label,
      color: values.color || '#1890ff'
    };
    saveGroups([...groups, newGroup]);
    setIsGroupModalOpen(false);
    groupForm.resetFields();
    message.success('分组创建成功');
  };

  // 拖拽排序
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(filteredList);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // 更新原始列表中的顺序
    const otherItems = watchlist.filter(s => !filteredList.find(f => f.symbol === s.symbol));
    const newList = [...otherItems, ...items];
    saveWatchlist(newList);
    setSortBy('custom');
  };

  // 刷新数据
  const refreshData = async () => {
    setLoading(true);
    try {
      const updated = await Promise.all(
        watchlist.map(async (stock) => {
          try {
            const res = await axios.get(`${API_BASE}/market/stock/${stock.symbol}/indicators`);
            return {
              ...stock,
              price: res.data.price,
              change_pct: res.data.change_pct,
              score: res.data.score,
              rating: res.data.rating
            };
          } catch {
            return stock;
          }
        })
      );
      saveWatchlist(updated);
      checkAlerts(updated);
    } catch (err) {
      message.error('刷新失败');
    } finally {
      setLoading(false);
    }
  };

  // 排序逻辑
  const getSortedList = (list: WatchStock[]) => {
    switch (sortBy) {
      case 'change':
        return [...list].sort((a, b) => (b.change_pct || 0) - (a.change_pct || 0));
      case 'score':
        return [...list].sort((a, b) => (b.score || 0) - (a.score || 0));
      case 'name':
        return [...list].sort((a, b) => a.name.localeCompare(b.name));
      default:
        return list;
    }
  };

  // 过滤分组
  const filteredList = React.useMemo(() => {
    const list = activeGroup === 'all' 
      ? watchlist 
      : watchlist.filter(s => s.group === activeGroup);
    return getSortedList(list);
  }, [watchlist, activeGroup, sortBy]);

  // 计算盈亏
  const totalProfit = watchlist.reduce((sum, s) => sum + (s.change_pct || 0), 0);
  const upCount = watchlist.filter(s => (s.change_pct || 0) > 0).length;
  const downCount = watchlist.filter(s => (s.change_pct || 0) < 0).length;
  const alertCount = watchlist.filter(s => s.alertTriggered).length;

  // 预警状态渲染
  const renderAlertStatus = (stock: WatchStock) => {
    if (!stock.alertPrice) return <Text type="secondary">-</Text>;
    
    const isTriggered = stock.alertDirection === 'above'
      ? (stock.price || 0) >= stock.alertPrice
      : (stock.price || 0) <= stock.alertPrice;
    
    if (stock.alertTriggered) {
      return (
        <Tooltip title={`已于 ${new Date(stock.alertTriggeredAt || '').toLocaleString()} 触发`}>
          <Tag icon={<CheckCircleOutlined />} color="success">
            已触发 ¥{stock.alertPrice}
          </Tag>
        </Tooltip>
      );
    }
    
    return (
      <Tooltip title={`${stock.alertDirection === 'above' ? '上涨' : '下跌'}至 ¥${stock.alertPrice} 时提醒`}>
        <Tag icon={<BellOutlined />} color={isTriggered ? 'warning' : 'default'}>
          {stock.alertDirection === 'above' ? '↑' : '↓'} ¥{stock.alertPrice}
        </Tag>
      </Tooltip>
    );
  };

  // 行选择配置
  const rowSelection = {
    selectedRowKeys: selectedSymbols,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedSymbols(selectedKeys as string[]);
    }
  };

  // 表格列
  const columns = [
    {
      title: '股票',
      dataIndex: 'name',
      render: (name: string, record: WatchStock) => (
        <Space direction="vertical" size={0}>
          <Space>
            <Text strong>{name}</Text>
            {record.notes && (
              <Tooltip title={record.notes}>
                <EditOutlined style={{ color: '#1890ff', fontSize: 12 }} />
              </Tooltip>
            )}
          </Space>
          <Space>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.symbol}</Text>
            <Tag color={groups.find(g => g.key === record.group)?.color} style={{ fontSize: 10, lineHeight: '14px', padding: '0 4px' }}>
              {groups.find(g => g.key === record.group)?.label || record.group}
            </Tag>
          </Space>
        </Space>
      )
    },
    {
      title: '最新价',
      dataIndex: 'price',
      align: 'right' as const,
      render: (price: number) => (
        <Text strong>¥{price?.toFixed(2) || '-'}</Text>
      )
    },
    {
      title: '涨跌幅',
      dataIndex: 'change_pct',
      align: 'right' as const,
      render: (change: number) => (
        <span className={`stock-change ${change > 0 ? 'up' : change < 0 ? 'down' : ''}`}>
          {change > 0 ? '+' : ''}{change?.toFixed(2) || '0.00'}%
        </span>
      )
    },
    {
      title: '综合评分',
      dataIndex: 'score',
      align: 'center' as const,
      render: (score: number) => (
        <Badge 
          count={score?.toFixed(1) || '-'} 
          style={{ 
            backgroundColor: score > 0 ? '#52c41a' : score < 0 ? '#f5222d' : '#999',
            fontSize: 12
          }} 
        />
      )
    },
    {
      title: '评级',
      dataIndex: 'rating',
      align: 'center' as const,
      render: (rating: string) => (
        <Tag color={rating?.includes('看多') ? 'green' : rating?.includes('看空') ? 'red' : 'default'}>
          {rating || '-'}
        </Tag>
      )
    },
    {
      title: '价格预警',
      dataIndex: 'alertPrice',
      align: 'center' as const,
      render: (_: any, record: WatchStock) => renderAlertStatus(record)
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: WatchStock) => (
        <Space>
          <Tooltip title="分析">
            <Button 
              type="primary" 
              size="small" 
              icon={<LineChartOutlined />}
              onClick={() => navigate(`/dashboard?symbol=${record.symbol}`)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button 
              size="small" 
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Dropdown
            menu={{
              items: groups.map(g => ({
                key: g.key,
                label: `移动到 ${g.label}`,
                onClick: () => handleMoveToGroup(record.symbol, g.key)
              }))
            }}
          >
            <Button size="small" icon={<FolderOutlined />} />
          </Dropdown>
          <Popconfirm
            title="确认删除"
            description={`确定要从自选列表中删除 ${record.name} 吗？`}
            onConfirm={() => handleDelete(record.symbol)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button 
              danger 
              size="small" 
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      )
    }
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
          <Title level={4} style={{ marginBottom: 16 }}>⭐ 自选股管理</Title>
          
          {/* 预警消息 */}
          {alertMessages.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              {alertMessages.map((alert, idx) => (
                <Alert
                  key={idx}
                  message={alert.message}
                  type={alert.type}
                  showIcon
                  closable
                  onClose={() => setAlertMessages(prev => prev.filter((_, i) => i !== idx))}
                  style={{ marginBottom: 8 }}
                  icon={alert.type === 'success' ? <CheckCircleOutlined /> : <WarningOutlined />}
                />
              ))}
            </div>
          )}
          
          {/* 统计卡片 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={6}>
              <Card size="small" className="stat-card">
                <Statistic 
                  title="自选股数量" 
                  value={watchlist.length} 
                  suffix="只"
                />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card size="small" className="stat-card">
                <Statistic 
                  title="平均涨跌幅" 
                  value={totalProfit / (watchlist.length || 1)} 
                  precision={2}
                  suffix="%"
                  valueStyle={{ color: totalProfit >= 0 ? '#f5222d' : '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card size="small" className="stat-card">
                <Statistic 
                  title="上涨 / 下跌" 
                  value={upCount}
                  suffix={` / ${downCount}`}
                  valueStyle={{ color: '#f5222d' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card size="small" className="stat-card">
                <Statistic 
                  title="预警触发" 
                  value={alertCount}
                  suffix={` / ${watchlist.filter(s => s.alertPrice).length}`}
                  valueStyle={{ color: alertCount > 0 ? '#fa8c16' : '#52c41a' }}
                />
              </Card>
            </Col>
          </Row>

          {/* 分组和操作栏 */}
          <Card size="small" className="watchlist-card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <Tabs activeKey={activeGroup} onChange={setActiveGroup} type="card" size="small" style={{ marginBottom: 0 }}>
                <TabPane tab={`全部 (${watchlist.length})`} key="all" />
                {groups.map(g => (
                  <TabPane 
                    tab={`${g.label} (${watchlist.filter(s => s.group === g.key).length})`} 
                    key={g.key} 
                  />
                ))}
              </Tabs>
              
              <Space>
                <Select
                  value={sortBy}
                  onChange={setSortBy}
                  style={{ width: 100 }}
                  size="small"
                  options={[
                    { label: '自定义', value: 'custom' },
                    { label: '涨跌幅', value: 'change' },
                    { label: '评分', value: 'score' },
                    { label: '名称', value: 'name' },
                  ]}
                />
                <Button size="small" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
                  添加
                </Button>
                <Button size="small" icon={<FolderOutlined />} onClick={() => setIsGroupModalOpen(true)}>
                  分组
                </Button>
                {selectedSymbols.length > 0 && (
                  <Button size="small" icon={<CheckCircleOutlined />} onClick={() => setIsBatchModalOpen(true)}>
                    批量 ({selectedSymbols.length})
                  </Button>
                )}
                <Button size="small" onClick={refreshData} loading={loading}>
                  刷新
                </Button>
              </Space>
            </div>

            {sortBy === 'custom' && activeGroup === 'all' ? (
              // 拖拽排序模式
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="watchlist">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}>
                      <Table
                        dataSource={filteredList}
                        columns={[
                          {
                            title: '',
                            width: 40,
                            render: () => <DragOutlined style={{ cursor: 'grab', color: '#999' }} />
                          },
                          ...columns
                        ]}
                        rowKey="symbol"
                        pagination={false}
                        size="small"
                        loading={loading}
                        rowSelection={rowSelection}
                        components={{
                          body: {
                            row: (props: any) => {
                              const index = filteredList.findIndex(item => item.symbol === props['data-row-key']);
                              return (
                                <Draggable 
                                  draggableId={props['data-row-key']} 
                                  index={index}
                                  key={props['data-row-key']}
                                >
                                  {(provided) => (
                                    <tr
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      {...props}
                                    />
                                  )}
                                </Draggable>
                              );
                            }
                          }
                        }}
                      />
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            ) : (
              // 普通表格模式
              <Table
                dataSource={filteredList}
                columns={columns}
                rowKey="symbol"
                pagination={false}
                size="small"
                loading={loading}
                rowSelection={rowSelection}
              />
            )}
          </Card>

          {/* 添加自选股弹窗 */}
          <Modal
            title="添加自选股"
            open={isModalOpen}
            onCancel={() => setIsModalOpen(false)}
            onOk={() => form.submit()}
            width={500}
          >
            <Form form={form} onFinish={handleAddStock} layout="vertical">
              <Form.Item 
                name="symbol" 
                label="股票代码" 
                rules={[{ required: true, message: '请输入股票代码' }]}
              >
                <Search 
                  placeholder="如: 600519 或 0700.HK" 
                  onSearch={(val) => form.setFieldsValue({ name: val })}
                />
              </Form.Item>
              <Form.Item name="name" label="股票名称">
                <Input placeholder="股票名称（可选）" />
              </Form.Item>
              <Form.Item name="group" label="分组" initialValue="default">
                <Select options={groups.map(g => ({ label: g.label, value: g.key }))} />
              </Form.Item>
              <Row gutter={16}>
                <Col span={14}>
                  <Form.Item name="alertPrice" label="预警价格">
                    <Input type="number" placeholder="设置价格提醒" />
                  </Form.Item>
                </Col>
                <Col span={10}>
                  <Form.Item name="alertDirection" label="触发条件" initialValue="above">
                    <Select options={[
                      { label: '上涨触及', value: 'above' },
                      { label: '下跌触及', value: 'below' }
                    ]} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="notes" label="备注">
                <TextArea rows={2} placeholder="添加备注（可选）" />
              </Form.Item>
            </Form>
          </Modal>

          {/* 创建分组弹窗 */}
          <Modal
            title="管理分组"
            open={isGroupModalOpen}
            onCancel={() => setIsGroupModalOpen(false)}
            footer={[
              <Button key="close" onClick={() => setIsGroupModalOpen(false)}>关闭</Button>
            ]}
            width={500}
          >
            <div style={{ marginBottom: 16 }}>
              <Title level={5}>现有分组</Title>
              <Space wrap style={{ marginTop: 8 }}>
                {groups.map(g => (
                  <Tag key={g.key} color={g.color}>{g.label}</Tag>
                ))}
              </Space>
            </div>
            <div style={{ borderTop: '1px solid #e8e8e8', paddingTop: 16 }}>
              <Title level={5}>创建新分组</Title>
              <Form form={groupForm} onFinish={handleCreateGroup} layout="vertical">
                <Form.Item name="label" label="分组名称" rules={[{ required: true }]}>
                  <Input placeholder="如：新能源" />
                </Form.Item>
                <Form.Item name="color" label="颜色" initialValue="#1890ff">
                  <Select options={[
                    { label: '蓝色', value: '#1890ff' },
                    { label: '绿色', value: '#52c41a' },
                    { label: '红色', value: '#f5222d' },
                    { label: '橙色', value: '#fa8c16' },
                    { label: '紫色', value: '#722ed1' },
                    { label: '粉色', value: '#eb2f96' },
                    { label: '青色', value: '#13c2c2' },
                    { label: '深橙', value: '#fa541c' },
                  ]} />
                </Form.Item>
                <Button type="primary" onClick={() => groupForm.submit()}>创建分组</Button>
              </Form>
            </div>
          </Modal>

          {/* 编辑股票弹窗 */}
          <Modal
            title="编辑自选股"
            open={isEditModalOpen}
            onCancel={() => setIsEditModalOpen(false)}
            onOk={() => editForm.submit()}
            width={500}
          >
            <Form form={editForm} onFinish={handleSaveEdit} layout="vertical">
              {editingStock && (
                <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
                  <Text strong>{editingStock.name}</Text>
                  <Text type="secondary" style={{ marginLeft: 8 }}>{editingStock.symbol}</Text>
                </div>
              )}
              <Form.Item name="group" label="分组">
                <Select options={groups.map(g => ({ label: g.label, value: g.key }))} />
              </Form.Item>
              <Row gutter={16}>
                <Col span={14}>
                  <Form.Item name="alertPrice" label="预警价格">
                    <Input type="number" placeholder="设置价格提醒" />
                  </Form.Item>
                </Col>
                <Col span={10}>
                  <Form.Item name="alertDirection" label="触发条件">
                    <Select options={[
                      { label: '上涨触及', value: 'above' },
                      { label: '下跌触及', value: 'below' }
                    ]} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="notes" label="备注">
                <TextArea rows={3} placeholder="添加备注" />
              </Form.Item>
            </Form>
          </Modal>

          {/* 批量操作弹窗 */}
          <Modal
            title={`批量操作 (${selectedSymbols.length} 只)`}
            open={isBatchModalOpen}
            onCancel={() => setIsBatchModalOpen(false)}
            footer={null}
            width={400}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Card size="small" title="移动到分组">
                <Space wrap>
                  {groups.map(g => (
                    <Button 
                      key={g.key} 
                      size="small" 
                      onClick={() => handleBatchMove(g.key)}
                      style={{ borderColor: g.color, color: g.color }}
                    >
                      {g.label}
                    </Button>
                  ))}
                </Space>
              </Card>
              <Card size="small" title="删除">
                <Popconfirm
                  title="确认批量删除"
                  description={`确定要删除选中的 ${selectedSymbols.length} 只股票吗？此操作不可恢复。`}
                  onConfirm={handleBatchDelete}
                  okText="确认删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                >
                  <Button danger icon={<DeleteOutlined />} block>
                    删除选中股票
                  </Button>
                </Popconfirm>
              </Card>
            </Space>
          </Modal>
        </Content>
      </Layout>
      
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

export default Watchlist;
