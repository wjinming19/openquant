#!/bin/bash
# OpenQuant 每日系统汇报脚本
# 每天早上 6:30 执行

REPORT_TIME=$(date '+%Y-%m-%d %H:%M')
echo "=== OpenQuant 量化系统每日汇报 ==="
echo "时间: $REPORT_TIME"
echo ""

# 检查系统状态
echo "📊 系统状态检查"
echo "----------------"

# 后端服务状态
if curl -s --max-time 5 http://localhost:8090/api/health > /dev/null 2>&1; then
    echo "✅ 后端服务: 运行正常"
else
    echo "❌ 后端服务: 异常"
fi

# 前端访问检查
if curl -s --max-time 5 -o /dev/null -w "%{http_code}" http://localhost:8091/ | grep -q "200"; then
    echo "✅ 前端服务: 运行正常"
else
    echo "❌ 前端服务: 异常"
fi

# 数据更新检查
TODAY=$(date +%Y%m%d)
STOCK_COUNT=$(curl -s "http://localhost:8090/api/market/rankings?type=rise&limit=5" 2>/dev/null | grep -o '"count":[0-9]*' | cut -d: -f2)
if [ -n "$STOCK_COUNT" ]; then
    echo "✅ 行情数据: 正常 ($STOCK_COUNT 只股票)"
else
    echo "⚠️ 行情数据: 待检查"
fi

echo ""
echo "📈 昨日市场回顾"
echo "----------------"
# 获取昨日收盘数据
YESTERDAY=$(date -d "yesterday" +%Y%m%d 2>/dev/null || date -v-1d +%Y%m%d 2>/dev/null)
echo "日期: $YESTERDAY"
echo "上证指数: $(curl -s 'http://localhost:8090/api/market/indices' 2>/dev/null | grep -o '"上证指数"[^}]*' | grep -o '"price":[0-9.]*' | cut -d: -f2 || echo '获取中...')"

echo ""
echo "💡 今日优化建议"
echo "----------------"
echo "1. 🔍 检查策略回测历史数据准确性"
echo "2. 📱 验证移动端各页面显示效果"
echo "3. ⚡ 监控系统性能指标（响应时间、内存使用）"

echo ""
echo "🎯 今日开发计划"
echo "----------------"
echo "□ 智能预警系统 - 价格突破通知功能"
echo "□ 组合回测 - 多股票策略验证"
echo "□ 数据可视化优化 - K线图表增强"

echo ""
echo "📋 待办事项"
echo "----------------"
echo "• 完善行业分析页面成分股展示"
echo "• 优化AI分析响应速度"
echo "• 添加更多技术指标（KDJ、布林带）"

echo ""
echo "🌅 明天 6:30 继续汇报"
echo "===================="
