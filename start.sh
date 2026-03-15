#!/bin/bash
# OpenQuant 启动脚本

echo "🚀 OpenQuant 量化分析平台启动脚本"
echo "=================================="

# 检查后端
echo "📦 启动后端服务..."
cd /root/.openclaw/workspace/openquant/backend
python3 main.py &
BACKEND_PID=$!
echo "✅ 后端已启动 (PID: $BACKEND_PID) - http://localhost:8000"

# 等待后端启动
sleep 3

# 检查前端
echo ""
echo "🎨 启动前端服务..."
cd /root/.openclaw/workspace/openquant/frontend
npm start &
FRONTEND_PID=$!
echo "✅ 前端已启动 (PID: $FRONTEND_PID) - http://localhost:3000"

echo ""
echo "=================================="
echo "🎉 OpenQuant 启动完成！"
echo ""
echo "访问地址:"
echo "  • 前端界面: http://localhost:3000"
echo "  • 后端API:  http://localhost:8000"
echo "  • API文档:  http://localhost:8000/docs"
echo ""
echo "按 Ctrl+C 停止服务"
echo "=================================="

# 等待用户中断
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
