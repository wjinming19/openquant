# OpenQuant 本地部署指南

> 将云端开发的 OpenQuant 量化平台部署到本地环境

---

## 📁 项目结构

```
openquant/
├── backend/                    # 后端服务
│   ├── app/
│   │   ├── api/               # API路由
│   │   ├── core/              # 核心模块
│   │   ├── data/              # 数据模块
│   │   └── main.py            # 入口文件
│   ├── requirements.txt        # Python依赖
│   └── Dockerfile             # Docker配置
├── frontend/                   # 前端应用
│   ├── src/
│   │   ├── pages/             # 页面组件
│   │   ├── App.tsx            # 主应用
│   │   └── index.tsx          # 入口
│   ├── package.json           # Node依赖
│   └── build/                 # 构建输出
├── docs/                       # 文档
└── README.md
```

---

## 🖥️ 系统要求

### 最低配置
- **CPU**: 2核
- **内存**: 4GB
- **磁盘**: 10GB可用空间
- **系统**: Windows 10/11, macOS 10.15+, Ubuntu 20.04+

### 推荐配置
- **CPU**: 4核+
- **内存**: 8GB+
- **网络**: 可访问东方财富（如需实时数据）

---

## 🛠️ 环境准备

### 1. 安装 Node.js (前端)

```bash
# 检查是否已安装
node --version  # 需要 v18+
npm --version   # 需要 v9+

# 未安装请前往
# https://nodejs.org/ 下载 LTS 版本
```

### 2. 安装 Python (后端)

```bash
# 检查是否已安装
python3 --version  # 需要 3.9+
pip3 --version

# Windows 用户建议安装 Anaconda
# https://www.anaconda.com/download

# macOS/Linux
# 使用 pyenv 管理 Python 版本
# https://github.com/pyenv/pyenv
```

### 3. 安装 Git

```bash
# 检查
git --version

# 下载
# https://git-scm.com/downloads
```

---

## 📥 获取代码

### 方式一：从服务器克隆

```bash
# 在本地创建项目目录
mkdir -p ~/Projects
cd ~/Projects

# 从服务器复制（需要服务器访问权限）
scp -r root@170.106.119.80:/root/.openclaw/workspace/openquant .

# 或使用 rsync
rsync -avz --progress root@170.106.119.80:/root/.openclaw/workspace/openquant ./
```

### 方式二：Git 仓库（推荐）

```bash
# 如果在服务器上已初始化 Git
git clone https://github.com/yourusername/openquant.git

# 或从服务器导出后创建本地仓库
cd openquant
git init
git add .
git commit -m "Initial commit"
```

### 方式三：打包下载

```bash
# 在服务器上打包
cd /root/.openclaw/workspace
tar -czvf openquant.tar.gz openquant/

# 下载到本地
scp root@170.106.119.80:/root/.openclaw/workspace/openquant.tar.gz ~/Downloads/

# 解压
cd ~/Projects
tar -xzvf ~/Downloads/openquant.tar.gz
```

---

## ⚙️ 后端部署

### 1. 创建虚拟环境

```bash
cd openquant/backend

# 创建虚拟环境
python3 -m venv venv

# 激活虚拟环境
# Linux/macOS
source venv/bin/activate

# Windows
venv\Scripts\activate
```

### 2. 安装依赖

```bash
# 安装 Python 依赖
pip install -r requirements.txt

# 主要依赖包括：
# - fastapi (Web框架)
# - uvicorn (ASGI服务器)
# - requests (HTTP请求)
# - pandas (数据处理)
# - numpy (数值计算)
```

如果 `requirements.txt` 不存在，手动安装：

```bash
pip install fastapi uvicorn requests pandas numpy sqlalchemy pydantic python-jose passlib
```

### 3. 配置环境变量

创建 `.env` 文件：

```bash
cat > .env << 'EOF'
# 数据库
DATABASE_URL=sqlite:///./openquant.db

# 安全
SECRET_KEY=your-secret-key-here-change-in-production

# 东方财富Cookie（可选，用于实时数据）
EASTMONEY_COOKIE_FILE=./cookies.txt

# API配置
API_HOST=0.0.0.0
API_PORT=8089

# 环境
development
EOF
```

### 4. 初始化数据库

```bash
# 如果使用 SQLite，会自动创建
# 如需其他数据库，请配置 DATABASE_URL

# 可选：创建初始数据
python -c "
from app.core.database import init_db
init_db()
print('Database initialized')
"
```

### 5. 启动后端服务

#### 方式一：直接启动（开发）

```bash
# 在 backend 目录下
python -m app.main

# 或使用 uvicorn 直接启动
uvicorn app.main:app --host 0.0.0.0 --port 8089 --reload
```

#### 方式二：生产模式

```bash
# 使用 gunicorn + uvicorn workers
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8089
```

#### 方式三：Docker（推荐）

```bash
# 构建镜像
cd openquant/backend
docker build -t openquant-backend .

# 运行容器
docker run -d \
  --name openquant-backend \
  -p 8089:8089 \
  -v $(pwd)/data:/app/data \
  openquant-backend
```

### 6. 验证后端

```bash
# 健康检查
curl http://localhost:8089/api/health

# 预期返回
{"status":"ok","timestamp":"2026-03-15T..."}

# 测试排行榜API
curl "http://localhost:8089/api/market/rankings?type=rise&limit=3"
```

---

## 🎨 前端部署

### 1. 安装依赖

```bash
cd openquant/frontend

# 使用 npm
npm install

# 或使用 yarn
yarn install

# 或使用 pnpm
pnpm install
```

### 2. 配置 API 地址

编辑 `src/config.ts` 或直接在页面中修改：

```typescript
// 开发环境
export const API_BASE = 'http://localhost:8089/api';

// 如需使用相对路径（同域部署）
// export const API_BASE = '/api';
```

在现有页面中搜索并替换：

```bash
# 查找所有 API 地址引用
grep -r "170.106.119.80:8089" src/

# 替换为本地地址（macOS/Linux）
sed -i '' 's/170.106.119.80:8089/localhost:8089/g' src/pages/*.tsx

# Linux
sed -i 's/170.106.119.80:8089/localhost:8089/g' src/pages/*.tsx
```

### 3. 开发模式启动

```bash
npm start

# 启动后访问 http://localhost:3000
```

### 4. 生产构建

```bash
# 构建
npm run build

# 构建输出在 build/ 目录
# 包含静态 HTML/JS/CSS 文件
```

### 5. 部署前端

#### 方式一：使用 serve（简单）

```bash
# 安装 serve
npm install -g serve

# 启动
cd build
serve -s . -l 8090
```

#### 方式二：使用 Nginx（推荐）

创建 `nginx.conf`：

```nginx
server {
    listen 80;
    server_name localhost;

    location / {
        root /path/to/openquant/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8089;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

启动 Nginx：

```bash
# macOS
brew install nginx
nginx

# Ubuntu
sudo apt install nginx
sudo nginx -s reload

# 复制配置
sudo cp nginx.conf /etc/nginx/sites-available/openquant
sudo ln -s /etc/nginx/sites-available/openquant /etc/nginx/sites-enabled/
```

#### 方式三：Python HTTP 服务器（快速测试）

```bash
cd build

# 使用 Python 内置服务器
python3 -m http.server 8090

# 或使用已有的 gzip_server.py
python3 ../gzip_server.py
```

---

## 🐳 Docker 一键部署

### 创建 docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8089:8089"
    environment:
      - DATABASE_URL=sqlite:///./data/openquant.db
      - SECRET_KEY=your-secret-key
    volumes:
      - ./data:/app/data
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

  # 可选：使用 Nginx 作为反向代理
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./frontend/build:/usr/share/nginx/html
    depends_on:
      - backend
    restart: unless-stopped
```

### 启动

```bash
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

---

## 🔧 配置说明

### 1. 后端配置 (backend/app/core/config.py)

```python
class Settings:
    # 数据库
    DATABASE_URL = "sqlite:///./openquant.db"
    
    # 安全
    SECRET_KEY = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES = 30
    
    # 东方财富Cookie（用于实时数据）
    EASTMONEY_COOKIE_FILE = "./cookies.txt"
    
    # CORS
    CORS_ORIGINS = ["http://localhost:3000", "http://localhost:8090"]
```

### 2. 前端配置

```typescript
// src/config.ts
export const config = {
  API_BASE: process.env.REACT_APP_API_URL || 'http://localhost:8089/api',
  WS_BASE: process.env.REACT_APP_WS_URL || 'ws://localhost:8089/ws',
  
  // 登录配置
  AUTH_KEY: 'openquant_auth',
  USER_KEY: 'openquant_user',
  
  // 刷新间隔
  REFRESH_INTERVAL: 300000, // 5分钟
}
```

---

## ✅ 验证部署

### 1. 后端健康检查

```bash
# 健康检查
curl http://localhost:8089/api/health

# 测试排行榜
curl "http://localhost:8089/api/market/rankings?type=rise&limit=5"

# 测试策略列表
curl http://localhost:8089/api/strategy/list
```

### 2. 前端访问

```bash
# 打开浏览器
open http://localhost:8090  # macOS
start http://localhost:8090  # Windows
xdg-open http://localhost:8090  # Linux
```

### 3. 登录测试

- 用户名：`kimwang`
- 密码：`cxtz@2026`

---

## 🐛 常见问题

### 1. 端口被占用

```bash
# 查找占用 8089 端口的进程
lsof -i :8089

# 或
netstat -tlnp | grep 8089

# 杀掉进程
kill -9 <PID>
```

### 2. CORS 跨域错误

修改后端 `app/main.py`：

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8090"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 3. 前端 API 连接失败

检查：
1. 后端服务是否启动
2. API 地址配置是否正确
3. 防火墙是否放行端口

### 4. Python 依赖安装失败

```bash
# 更新 pip
pip install --upgrade pip

# 使用国内镜像
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### 5. Node 依赖安装失败

```bash
# 清除缓存
npm cache clean --force

# 使用国内镜像
npm config set registry https://registry.npmmirror.com
npm install
```

---

## 🚀 生产环境优化

### 1. 使用 Gunicorn + Uvicorn

```bash
gunicorn app.main:app \
  -w 4 \
  -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8089 \
  --access-logfile - \
  --error-logfile - \
  --log-level info
```

### 2. 使用 PM2 管理进程

```bash
# 安装 PM2
npm install -g pm2

# 创建配置文件 ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'openquant-backend',
      script: 'python -m app.main',
      cwd: './backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'openquant-frontend',
      script: 'serve',
      args: '-s build -l 8090',
      cwd: './frontend',
      instances: 1,
      autorestart: true
    }
  ]
};

# 启动
pm2 start ecosystem.config.js

# 保存配置
pm2 save
pm2 startup
```

### 3. 使用 HTTPS

使用 Let's Encrypt：

```bash
# 安装 certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d yourdomain.com

# 自动续期
crontab -e
# 添加: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 📞 支持

- **GitHub Issues**: https://github.com/yourusername/openquant/issues
- **文档**: https://docs.openquant.ai
- **Email**: support@openquant.ai

---

## 📝 更新日志

### 2026-03-15
- 初始版本发布
- 支持 7 个核心模块
- 本地数据源实现
- 移动端适配

---

**Happy Trading! 📈**
