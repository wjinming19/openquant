#!/bin/bash
# OpenQuant 本地一键部署脚本
# Usage: ./deploy-local.sh

set -e

echo "🚀 OpenQuant 本地部署脚本"
echo "=========================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 检查环境
echo "📋 检查环境..."

if ! command_exists python3; then
    echo -e "${RED}❌ Python3 未安装${NC}"
    echo "请前往 https://www.python.org/downloads/ 安装 Python 3.9+"
    exit 1
fi

if ! command_exists node; then
    echo -e "${RED}❌ Node.js 未安装${NC}"
    echo "请前往 https://nodejs.org/ 安装 Node.js 18+"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm 未安装${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 环境检查通过${NC}"
echo ""

# 获取项目路径
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "📁 项目路径: $PROJECT_DIR"
echo ""

# 部署后端
deploy_backend() {
    echo "🔧 部署后端..."
    cd "$PROJECT_DIR/backend"
    
    # 创建虚拟环境
    if [ ! -d "venv" ]; then
        echo "  创建 Python 虚拟环境..."
        python3 -m venv venv
    fi
    
    # 激活虚拟环境
    echo "  激活虚拟环境..."
    source venv/bin/activate
    
    # 安装依赖
    echo "  安装 Python 依赖..."
    if [ -f "requirements.txt" ]; then
        pip install -q -r requirements.txt
    else
        echo "  安装核心依赖..."
        pip install -q fastapi uvicorn requests pandas numpy sqlalchemy pydantic
    fi
    
    # 创建环境文件
    if [ ! -f ".env" ]; then
        echo "  创建环境配置文件..."
        cat > .env << 'EOF'
DATABASE_URL=sqlite:///./openquant.db
SECRET_KEY=local-deployment-secret-key
API_HOST=0.0.0.0
API_PORT=8089
EOF
    fi
    
    echo -e "${GREEN}✅ 后端部署完成${NC}"
    echo ""
}

# 部署前端
deploy_frontend() {
    echo "🎨 部署前端..."
    cd "$PROJECT_DIR/frontend"
    
    # 安装依赖
    echo "  安装 Node 依赖..."
    npm install --silent
    
    # 替换 API 地址为本地
    echo "  配置本地 API 地址..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        find src -name "*.tsx" -exec sed -i '' 's/170\.106\.119\.80:8089/localhost:8089/g' {} \;
    else
        # Linux
        find src -name "*.tsx" -exec sed -i 's/170\.106\.119\.80:8089/localhost:8089/g' {} \;
    fi
    
    # 构建
    echo "  构建前端..."
    npm run build 2>&1 | grep -E "(Compiled|Failed|error)" || true
    
    # 生成 Gzip
    echo "  生成 Gzip 压缩..."
    cd build
    find . -type f \( -name "*.js" -o -name "*.css" \) -exec gzip -k -f {} \; 2>/dev/null || true
    
    echo -e "${GREEN}✅ 前端部署完成${NC}"
    echo ""
}

# 创建启动脚本
create_start_script() {
    echo "📝 创建启动脚本..."
    
    cat > "$PROJECT_DIR/start.sh" << 'EOF'
#!/bin/bash
# OpenQuant 启动脚本

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 启动 OpenQuant..."
echo ""

# 启动后端
echo "🔧 启动后端服务 (http://localhost:8089)..."
cd "$PROJECT_DIR/backend"
source venv/bin/activate
python -m app.main > /tmp/openquant-backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > /tmp/openquant-backend.pid
echo "  后端 PID: $BACKEND_PID"

# 等待后端启动
sleep 3

# 检查后端是否启动成功
if curl -s http://localhost:8089/api/health > /dev/null; then
    echo "  ✅ 后端启动成功"
else
    echo "  ⚠️ 后端启动中，请稍后检查"
fi

echo ""

# 启动前端
echo "🎨 启动前端服务 (http://localhost:8090)..."
cd "$PROJECT_DIR/frontend/build"
python3 ../gzip_server.py > /tmp/openquant-frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > /tmp/openquant-frontend.pid
echo "  前端 PID: $FRONTEND_PID"

echo ""
echo "✅ OpenQuant 已启动！"
echo ""
echo "📊 访问地址："
echo "  前端: http://localhost:8090"
echo "  后端: http://localhost:8089"
echo ""
echo "🔑 默认登录："
echo "  用户名: kimwang"
echo "  密码: cxtz@2026"
echo ""
echo "📝 查看日志："
echo "  后端: tail -f /tmp/openquant-backend.log"
echo "  前端: tail -f /tmp/openquant-frontend.log"
echo ""
echo "🛑 停止服务："
echo "  ./stop.sh"
EOF

    chmod +x "$PROJECT_DIR/start.sh"
    
    cat > "$PROJECT_DIR/stop.sh" << 'EOF'
#!/bin/bash
# OpenQuant 停止脚本

echo "🛑 停止 OpenQuant..."

# 停止后端
if [ -f /tmp/openquant-backend.pid ]; then
    PID=$(cat /tmp/openquant-backend.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo "  ✅ 后端已停止"
    fi
    rm -f /tmp/openquant-backend.pid
fi

# 停止前端
if [ -f /tmp/openquant-frontend.pid ]; then
    PID=$(cat /tmp/openquant-frontend.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo "  ✅ 前端已停止"
    fi
    rm -f /tmp/openquant-frontend.pid
fi

# 清理其他进程
pkill -f "openquant" 2>/dev/null || true

echo ""
echo "✅ 所有服务已停止"
EOF

    chmod +x "$PROJECT_DIR/stop.sh"
    
    echo -e "${GREEN}✅ 启动脚本创建完成${NC}"
    echo ""
}

# 主流程
main() {
    echo "开始部署..."
    echo ""
    
    deploy_backend
    deploy_frontend
    create_start_script
    
    echo ""
    echo "=========================="
    echo -e "${GREEN}🎉 部署完成！${NC}"
    echo ""
    echo "启动命令："
    echo "  ./start.sh"
    echo ""
    echo "访问地址："
    echo "  前端: http://localhost:8090"
    echo "  后端: http://localhost:8089"
    echo ""
    echo "默认登录："
    echo "  用户名: kimwang"
    echo "  密码: cxtz@2026"
    echo ""
}

main
