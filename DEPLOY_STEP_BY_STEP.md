# OpenQuant 详细部署指南（一步一步版）

> 面向零基础用户，每一步都有验证和截图提示

---

## 📋 部署前检查清单

在开始之前，请确认：
- [ ] 电脑能连接互联网
- [ ] 至少有 10GB 磁盘空间
- [ ] 系统已安装 Git（命令行输入 `git --version` 有输出）

---

## 第一步：获取项目代码（5分钟）

### 1.1 创建项目目录

**Windows (PowerShell):**
```powershell
# 在D盘创建项目目录
New-Item -ItemType Directory -Force -Path "D:\Projects"
Set-Location "D:\Projects"
```

**macOS/Linux (终端):**
```bash
# 在用户目录创建项目目录
mkdir -p ~/Projects
cd ~/Projects
```

**✅ 验证：**
```bash
pwd  # 查看当前目录
# 应该显示: D:\Projects (Windows) 或 /Users/你的用户名/Projects (Mac)
```

---

### 1.2 克隆代码

```bash
git clone https://github.com/wjinming19/openquant.git
```

**预期输出：**
```
Cloning into 'openquant'...
remote: Enumerating objects: 186, done.
remote: Total 186 (delta 0), reused 0 (delta 0)
Receiving objects: 100% (186/186), 4.52 MiB | 2.31 MiB/s, done.
```

**✅ 验证：**
```bash
cd openquant
ls  # 或 Windows: dir
# 应该看到: backend/ frontend/ docs/ README.md 等目录
```

**📸 截图提示：** 截图显示 openquant 目录下的文件列表

---

## 第二步：安装环境依赖（10-20分钟）

### 2.1 安装 Node.js（前端需要）

**检查是否已安装：**
```bash
node --version
npm --version
```

**如果显示版本号（如 v18.x.x），跳过后续安装步骤。**

**未安装时下载：**
1. 访问 https://nodejs.org/
2. 点击 **"LTS"**（长期支持版）下载
3. 运行安装程序，一直点 "Next" 直到完成

**✅ 验证：**
```bash
node --version  # 应该显示 v18.x.x 或更高
npm --version   # 应该显示 9.x.x 或更高
```

**📸 截图提示：** 截图显示 node 和 npm 的版本号

---

### 2.2 安装 Python（后端需要）

**检查是否已安装：**
```bash
python3 --version  # Mac/Linux
python --version   # Windows
```

**如果显示版本号（如 3.9.x），跳过后续安装步骤。**

**未安装时下载：**

**Windows:**
1. 访问 https://www.python.org/downloads/
2. 下载 Python 3.11.x
3. **重要：** 安装时勾选 **"Add Python to PATH"**
4. 点击 "Install Now"

**macOS:**
```bash
# 使用 Homebrew 安装
brew install python@3.11
```

**✅ 验证：**
```bash
python --version  # Windows
python3 --version # Mac/Linux
# 应该显示 Python 3.9.x 或更高
```

**📸 截图提示：** 截图显示 Python 版本号

---

## 第三步：部署后端服务（10分钟）

### 3.1 进入后端目录

```bash
cd backend
```

**✅ 验证：**
```bash
ls  # 或 Windows: dir
# 应该看到: app/ main.py requirements.txt
```

---

### 3.2 创建 Python 虚拟环境

**Windows:**
```powershell
python -m venv venv
```

**macOS/Linux:**
```bash
python3 -m venv venv
```

**✅ 验证：**
```bash
ls venv  # 或 Windows: dir venv
# 应该看到虚拟环境的目录结构
```

---

### 3.3 激活虚拟环境

**Windows (PowerShell):**
```powershell
.\venv\Scripts\Activate.ps1
```

**如果提示执行策略错误，先运行：**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Windows (CMD):**
```cmd
venv\Scripts\activate.bat
```

**macOS/Linux:**
```bash
source venv/bin/activate
```

**✅ 验证：**
```bash
# 命令行前面应该显示 (venv)
# 如: (venv) C:\Projects\openquant\backend>
```

**📸 截图提示：** 截图显示带有 (venv) 的命令行

---

### 3.4 安装 Python 依赖

```bash
pip install -r requirements.txt
```

**预期输出（最后几行）：**
```
Successfully installed fastapi-0.109.0 uvicorn-0.27.0 ...
```

**如果 requirements.txt 不存在，手动安装：**
```bash
pip install fastapi uvicorn requests pandas numpy sqlalchemy pydantic
```

**✅ 验证：**
```bash
pip list | grep fastapi
# 应该显示 fastapi 及其版本
```

**📸 截图提示：** 截图显示安装成功的包列表

---

### 3.5 启动后端服务

```bash
# 方式1: 使用 Python 模块
python -m app.main

# 方式2: 使用 uvicorn（推荐开发用）
uvicorn app.main:app --host 0.0.0.0 --port 8089 --reload
```

**预期输出：**
```
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
🚀 OpenQuant Backend Starting...
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8089
```

**✅ 验证（新开一个终端窗口）：**
```bash
curl http://localhost:8089/api/health
# 应该返回: {"status":"ok","timestamp":"..."}
```

**Windows 用户如果没有 curl，用浏览器访问：**
```
http://localhost:8089/api/health
```

**应该看到：**
```json
{"status":"ok","timestamp":"2026-03-15T..."}
```

**📸 截图提示：** 截图显示后端启动日志或浏览器访问结果

---

### 3.6 测试后端 API（可选但推荐）

**测试排行榜 API：**
```bash
curl "http://localhost:8089/api/market/rankings?type=rise&limit=3"
```

**Windows 用户用浏览器访问：**
```
http://localhost:8089/api/market/rankings?type=rise&limit=3
```

**应该看到股票排行数据的 JSON 格式返回。**

**📸 截图提示：** 截图显示 API 返回的数据

---

## 第四步：部署前端（10分钟）

### 4.1 进入前端目录（新终端窗口）

**保持后端运行，新开一个终端窗口：**

```bash
cd ~/Projects/openquant/frontend   # Mac/Linux
cd D:\Projects\openquant\frontend  # Windows
```

**✅ 验证：**
```bash
ls  # 或 dir
# 应该看到: package.json src/ public/
```

---

### 4.2 安装前端依赖

```bash
npm install
```

**预期输出（最后几行）：**
```
added 1542 packages in 45s
```

**⚠️ 如果安装很慢或失败，使用国内镜像：**
```bash
npm config set registry https://registry.npmmirror.com
npm install
```

**✅ 验证：**
```bash
ls node_modules | head -5
# 应该看到很多包目录，如: react react-dom ...
```

**📸 截图提示：** 截图显示 npm install 成功

---

### 4.3 修改 API 地址（重要！）

**编辑配置文件，将服务器地址改为本地地址：**

**方式1：全局替换（推荐）**

**Windows:**
```powershell
# 查找所有包含服务器地址的文件
Get-ChildItem src\pages\*.tsx | Select-String "170.106.119.80"

# 替换为本地地址
(Get-Content src\pages\Dashboard.tsx) -replace "170.106.119.80:8089", "localhost:8089" | Set-Content src\pages\Dashboard.tsx
(Get-Content src\pages\Market.tsx) -replace "170.106.119.80:8089", "localhost:8089" | Set-Content src\pages\Market.tsx
(Get-Content src\pages\StockSelect.tsx) -replace "170.106.119.80:8089", "localhost:8089" | Set-Content src\pages\StockSelect.tsx
(Get-Content src\pages\Industry.tsx) -replace "170.106.119.80:8089", "localhost:8089" | Set-Content src\pages\Industry.tsx
(Get-Content src\pages\Strategy.tsx) -replace "170.106.119.80:8089", "localhost:8089" | Set-Content src\pages\Strategy.tsx
(Get-Content src\pages\Watchlist.tsx) -replace "170.106.119.80:8089", "localhost:8089" | Set-Content src\pages\Watchlist.tsx
(Get-Content src\pages\AIAnalysis.tsx) -replace "170.106.119.80:8089", "localhost:8089" | Set-Content src\pages\AIAnalysis.tsx
```

**macOS/Linux:**
```bash
# 查找所有包含服务器地址的文件
grep -r "170.106.119.80" src/pages/

# 替换为本地地址
sed -i '' 's/170.106.119.80:8089/localhost:8089/g' src/pages/*.tsx
```

**方式2：手动修改（如果不熟悉命令行）**

1. 用代码编辑器（VS Code）打开 `frontend/src/pages/`
2. 查找 `170.106.119.80:8089`
3. 全部替换为 `localhost:8089`

**✅ 验证：**
```bash
grep -r "localhost:8089" src/pages/ | head -3
# 应该显示替换后的结果
```

**📸 截图提示：** 截图显示替换后的代码片段

---

### 4.4 启动前端开发服务器

```bash
npm start
```

**预期输出：**
```
Compiled successfully!

You can now view frontend in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

**浏览器会自动打开 http://localhost:3000**

**如果没有自动打开，手动访问：**
```
http://localhost:3000
```

**✅ 验证：**
- 浏览器显示登录页面
- 页面标题是 "OpenQuant"

**📸 截图提示：** 截图显示登录页面

---

## 第五步：登录和测试（5分钟）

### 5.1 登录系统

**在登录页面输入：**
- 用户名：`kimwang`
- 密码：`cxtz@2026`

**点击 "登录" 按钮**

**✅ 验证：**
- 成功跳转到 Dashboard 大盘情绪页面
- 显示情绪温度、涨跌家数、成交额等数据

**📸 截图提示：** 截图显示 Dashboard 页面

---

### 5.2 测试各个模块

**依次点击左侧菜单测试：**

| 菜单 | 预期显示 |
|------|----------|
| 大盘情绪 | 情绪温度、标的池卡片 |
| 策略回测 | 策略选择、参数设置 |
| 量化选股 | 筛选条件、股票列表 |
| 行业分析 | 行业列表、概念板块 |
| 实时行情 | 排行榜、市场指数 |
| 自选股 | 自选股列表、分组 |
| AI分析 | 聊天界面 |

**📸 截图提示：** 每个模块截图验证

---

## 第六步：生产构建（可选，5分钟）

如果你想部署到生产环境：

### 6.1 构建前端

```bash
npm run build
```

**预期输出：**
```
Creating an optimized production build...
Compiled successfully.

File sizes after gzip:
  245.67 kB  build/static/js/main.xxx.js
  45.23 kB   build/static/css/main.xxx.css
```

**✅ 验证：**
```bash
ls build/
# 应该看到: index.html static/
```

---

### 6.2 使用生产服务器部署

**方式1：使用 serve（简单）**
```bash
npm install -g serve
serve -s build -l 8090
```

**方式2：使用 Nginx（推荐生产用）**
参考 LOCAL_DEPLOYMENT.md 中的 Nginx 配置

---

## 🐛 常见问题排查

### 问题1：后端启动失败

**症状：** 运行 `python -m app.main` 报错

**排查步骤：**
1. 检查是否在 backend 目录
2. 检查虚拟环境是否激活（看是否有 (venv) 前缀）
3. 检查依赖是否安装：`pip list | grep fastapi`

**解决：**
```bash
cd backend
source venv/bin/activate  # Mac/Linux
# 或 .\venv\Scripts\activate  # Windows
pip install -r requirements.txt
python -m app.main
```

---

### 问题2：前端无法连接后端

**症状：** 页面显示 "Network Error" 或数据加载失败

**排查步骤：**
1. 后端是否在运行？`curl http://localhost:8089/api/health`
2. API 地址是否已改为 localhost？
3. 浏览器控制台是否有 CORS 错误？

**解决：**
```bash
# 1. 确认后端运行
curl http://localhost:8089/api/health

# 2. 修改前端 API 地址
grep "localhost:8089" src/pages/*.tsx
# 如果没有输出，需要替换

# 3. 重启前端
npm start
```

---

### 问题3：npm install 很慢或失败

**解决：**
```bash
# 使用国内镜像
npm config set registry https://registry.npmmirror.com
npm install

# 或使用 yarn
npm install -g yarn
yarn install
```

---

### 问题4：端口被占用

**症状：** 启动时报错 "Address already in use"

**解决：**
```bash
# 查找占用 8089 的进程
# Windows
netstat -ano | findstr :8089
# 然后任务管理器结束进程

# Mac/Linux
lsof -ti:8089 | xargs kill -9
```

---

## ✅ 部署完成检查清单

- [ ] 后端启动成功，健康检查返回 ok
- [ ] 前端启动成功，浏览器能访问
- [ ] 能正常登录系统
- [ ] Dashboard 显示数据
- [ ] 至少测试了 3 个模块功能正常

---

## 📞 需要帮助？

如果按以上步骤仍有错误，请提供：
1. 截图显示的错误信息
2. 完整的命令行输出
3. 操作系统版本（Windows 10/11, macOS 版本等）

---

**祝你部署顺利！🚀**

*文档版本: 2026-03-15*
