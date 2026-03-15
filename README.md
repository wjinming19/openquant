# OpenQuant - 量化投资分析平台

> 基于 React + FastAPI 构建的专业量化分析系统

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688)
![Python](https://img.shields.io/badge/Python-3.9+-3776ab)

---

## ✨ 功能特性

### 📊 核心模块

| 模块 | 功能 | 状态 |
|------|------|------|
| **大盘情绪** | 市场情绪温度、涨跌家数、成交额 | ✅ |
| **策略回测** | 双均线/MACD策略回测、收益曲线 | ✅ |
| **量化选股** | 多因子筛选、技术指标选股 | ✅ |
| **自选股** | 分组管理、价格预警、盈亏计算 | ✅ |
| **行业分析** | 行业热力图、资金流向、估值分析 | ✅ |
| **实时行情** | 涨幅/跌幅/成交/换手排行榜 | ✅ |
| **AI分析** | 智能诊断、市场热点、投资建议 | ✅ |

### 🎯 技术特点

- **前端**: React 18 + TypeScript + Ant Design + ECharts
- **后端**: FastAPI + Python 3.9+
- **数据源**: 东方财富API（网络通畅时）/ 本地数据（离线模式）
- **移动端**: 完美适配手机浏览器
- **部署**: 支持 Docker / 本地 / 云服务器

---

## 🚀 快速开始

### 方式一：一键部署（推荐）

```bash
# 1. 克隆或下载项目
git clone https://github.com/yourusername/openquant.git
cd openquant

# 2. 运行部署脚本
chmod +x deploy-local.sh
./deploy-local.sh

# 3. 启动服务
./start.sh
```

访问 http://localhost:8090

### 方式二：手动部署

详见 [LOCAL_DEPLOYMENT.md](./LOCAL_DEPLOYMENT.md)

---

## 📁 项目结构

```
openquant/
├── backend/              # 后端服务 (FastAPI)
│   ├── app/
│   │   ├── api/         # API路由
│   │   ├── core/        # 核心配置
│   │   ├── data/        # 数据模块
│   │   └── main.py      # 入口
│   ├── requirements.txt  # Python依赖
│   └── venv/            # 虚拟环境
├── frontend/            # 前端应用 (React)
│   ├── src/
│   │   ├── pages/       # 页面组件
│   │   └── App.tsx      # 主应用
│   ├── package.json     # Node依赖
│   └── build/           # 构建输出
├── docs/                # 文档
├── deploy-local.sh      # 一键部署脚本
├── start.sh            # 启动脚本
└── stop.sh             # 停止脚本
```

---

## 🔑 默认登录

- **用户名**: `kimwang`
- **密码**: `cxtz@2026`

---

## 📖 文档

- [本地部署指南](./LOCAL_DEPLOYMENT.md) - 详细的部署步骤
- [设计文档](./docs/strategy-backtest-design.md) - 策略回测设计
- [API文档](http://localhost:8089/docs) - 自动生成的API文档

---

## 🐳 Docker部署

```bash
# 使用 Docker Compose
docker-compose up -d

# 或手动构建
docker build -t openquant ./backend
docker run -p 8089:8089 openquant
```

---

## 🛠️ 开发

### 前端开发

```bash
cd frontend
npm install
npm start        # 开发模式
npm run build    # 生产构建
```

### 后端开发

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m app.main  # 启动服务
```

---

## 📝 更新日志

### v1.0.0 (2026-03-15)
- ✨ 初始版本发布
- ✨ 7个核心模块完整实现
- ✨ 移动端适配
- ✨ 本地数据模式
- ✨ Docker支持

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可

MIT License

---

**Made with ❤️ by OpenQuant Team**
