# HPVideo - 项目交接文档

## 项目概述

HPVideo 是一个基于 AI 的视频生成和对话平台，集成了多种 AI 模型能力，支持视频生成、图像处理、对话交互等功能。项目采用前后端分离架构，支持 Web3 支付集成。

## 技术栈

### 前端技术栈

#### 核心框架
- **SvelteKit** (v1.30.0) - 现代化的 Svelte 全栈框架
- **Svelte** (v4.0.5) - 响应式前端框架
- **Vite** (v4.4.2) - 快速的前端构建工具
- **TypeScript** (v5.0.0) - 类型安全的 JavaScript 超集

#### UI 与样式
- **TailwindCSS** (v3.3.3) - 实用优先的 CSS 框架
- **@tailwindcss/typography** - 排版插件
- **bits-ui** (v0.19.7) - Svelte UI 组件库
- **svelte-sonner** (v0.3.19) - Toast 通知组件
- **svelte-confetti** (v1.3.2) - 动画效果

#### 数据可视化
- **ECharts** (v5.5.1) - 强大的图表库

#### Web3 集成
- **ethers** (v6.13.1) - 以太坊 JavaScript 库
- **@wagmi/core** (v2.14.4) - React Hooks for Ethereum
- **@web3modal/wagmi** (v4.2.3) - Web3 钱包连接
- **viem** (v2.13.1) - TypeScript 以太坊接口
- **@polkadot/api** (v11.2.1) - Polkadot 生态集成

#### AI 与数据处理
- **pyodide** (v0.26.0-alpha.4) - 浏览器中运行 Python
- **@pyscript/core** (v0.4.32) - Python 脚本支持
- **marked** (v9.1.0) - Markdown 解析器
- **katex** (v0.16.9) - 数学公式渲染
- **highlight.js** (v11.9.0) - 代码高亮

#### 国际化
- **i18next** (v23.10.0) - 国际化框架
- **i18next-browser-languagedetector** (v7.2.0) - 语言检测
- **i18next-parser** (v8.13.0) - 翻译文件解析

#### 其他工具库
- **dayjs** (v1.11.10) - 日期处理
- **qrcode** (v1.5.3) - 二维码生成
- **uuid** (v9.0.1) - UUID 生成
- **file-saver** (v2.0.5) - 文件下载
- **compressorjs** (v1.2.1) - 图片压缩
- **@fingerprintjs/fingerprintjs** (v4.3.0) - 浏览器指纹识别
- **vconsole** (v3.15.1) - 移动端调试工具

#### 开发工具
- **ESLint** (v8.56.0) - 代码检查
- **Prettier** (v2.8.0) - 代码格式化
- **Cypress** (v13.8.1) - E2E 测试
- **Vitest** (v1.6.0) - 单元测试

### 后端技术栈

#### Python 后端 (FastAPI)

**核心框架**
- **FastAPI** (v0.115.12) - 现代化的 Python Web 框架
- **Uvicorn** (v0.22.0) - ASGI 服务器
- **Pydantic** (v2.10.3) - 数据验证

**数据库**
- **Peewee** (v3.17.3) - ORM 框架
- **psycopg2-binary** (v2.9.9) - PostgreSQL 驱动
- **PyMySQL** (v1.1.0) - MySQL 驱动
- **Redis** (v5.2.1) - 缓存和消息队列

**认证与安全**
- **python-jose** (v3.3.0) - JWT 处理
- **passlib[bcrypt]** (v1.7.4) - 密码加密
- **bcrypt** (v4.1.2) - 加密算法
- **argon2-cffi** (v23.1.0) - Argon2 加密
- **PyJWT[crypto]** (v2.10.1) - JWT 令牌

**AI 与机器学习**
- **google-generativeai** (v0.5.2) - Google AI 集成
- **sentence-transformers** (v2.7.0) - 文本嵌入模型
- **opencv-python-headless** (v4.9.0.80) - 图像处理
- **rapidocr-onnxruntime** (v1.2.3) - OCR 识别

**文档处理**
- **pypdf** (v4.2.0) - PDF 处理
- **docx2txt** (v0.8) - Word 文档处理
- **python-pptx** (v0.6.23) - PPT 处理
- **unstructured** (v0.11.8) - 非结构化数据处理
- **pandas** (v2.2.2) - 数据分析
- **openpyxl** (v3.1.2) - Excel 处理

**云服务集成**
- **boto3** (v1.34.95) - AWS SDK
- **oss2** (v2.18.6) - 阿里云 OSS
- **alibabacloud-facebody20191230** (v5.1.2) - 阿里云人脸识别
- **alibabacloud_cloudauth_intl20220809** (v2.0.2) - 阿里云身份认证

**Web3 集成**
- **web3** - 以太坊 Python 库
- **substrate-interface** (v1.7.11) - Substrate 区块链接口
- **cdp-sdk** (v1.33.2) - Coinbase 开发平台 SDK
- **x402** (v0.2.1) - 支付集成

**其他工具**
- **APScheduler** (v3.10.4) - 定时任务
- **python-socketio** (v5.11.2) - WebSocket 支持
- **aiohttp** (v3.11.16) - 异步 HTTP 客户端
- **requests** (v2.31.0) - HTTP 请求
- **tweepy** (v4.14.0) - Twitter API
- **youtube-transcript-api** (v0.6.2) - YouTube 字幕获取
- **pytube** - YouTube 视频下载
- **langfuse** (v2.27.3) - LLM 可观测性
- **rank-bm25** (v0.2.2) - BM25 搜索算法

#### Node.js 后端 (NestJS)

**核心框架**
- **NestJS** (v11.0.1) - 企业级 Node.js 框架
- **Express** (v5.2.1) - Web 服务器
- **TypeScript** (v5.7.3) - 类型安全

**数据库**
- **Mongoose** (v9.0.0) - MongoDB ODM
- **@nestjs/mongoose** (v11.0.3) - NestJS MongoDB 集成

**功能模块**
- **@nestjs/config** (v4.0.2) - 配置管理
- **@nestjs/schedule** (v6.1.0) - 定时任务
- **openai** (v6.9.1) - OpenAI API 集成
- **ali-oss** (v6.23.0) - 阿里云 OSS
- **multer** (v2.0.2) - 文件上传
- **https-proxy-agent** (v7.0.6) - 代理支持

**开发工具**
- **Jest** (v29.7.0) - 测试框架
- **ESLint** (v9.18.0) - 代码检查
- **Prettier** (v3.4.2) - 代码格式化

## 项目架构

### 目录结构

```
HPVideo/
├── backend/                    # 后端代码
│   ├── apps/                   # 应用模块
│   │   ├── audio/             # 音频处理
│   │   ├── images/            # 图像处理
│   │   ├── web/               # Web API
│   │   │   ├── models/        # 数据模型
│   │   │   ├── routers/       # 路由
│   │   │   └── util/          # 工具函数
│   │   └── listener/          # 支付监听器
│   ├── degpt-nest/            # NestJS 后端服务
│   │   └── degpt-nest/
│   │       └── src/           # NestJS 源码
│   ├── utils/                 # 工具函数
│   ├── config.py              # 配置文件
│   ├── constants.py           # 常量定义
│   ├── main.py                # FastAPI 主入口
│   └── requirements.txt       # Python 依赖
├── src/                       # 前端源码
│   ├── lib/                   # 库文件
│   │   ├── components/        # Svelte 组件
│   │   │   ├── admin/         # 管理员组件
│   │   │   ├── chat/          # 聊天组件
│   │   │   ├── common/        # 通用组件
│   │   │   ├── documents/     # 文档组件
│   │   │   ├── icons/         # 图标组件
│   │   │   ├── layout/        # 布局组件
│   │   │   ├── price/         # 价格组件
│   │   │   └── twitter/       # Twitter 集成
│   │   └── i18n/              # 国际化文件
│   └── routes/                # 路由页面
│       ├── (app)/             # 主应用路由
│       ├── auth/              # 认证页面
│       ├── x402/              # 支付页面
│       └── ...
├── static/                    # 静态资源
├── build/                     # 构建输出
├── cypress/                   # E2E 测试
├── scripts/                   # 脚本文件
├── .env                       # 环境变量
├── docker-compose.yaml        # Docker 编排
├── package.json               # 前端依赖
├── svelte.config.js           # Svelte 配置
├── tailwind.config.js         # Tailwind 配置
├── vite.config.ts             # Vite 配置
└── tsconfig.json              # TypeScript 配置
```

### 架构设计

#### 前端架构
- **SvelteKit** 提供 SSR/SSG 能力和路由管理
- **组件化开发**：可复用的 Svelte 组件
- **状态管理**：使用 Svelte Store
- **路径别名**：`@` 指向 `src` 目录
- **基础路径**：应用部署在 `/creator` 路径下

#### 后端架构
- **微服务架构**：FastAPI 主服务 + NestJS 辅助服务
- **反向代理**：FastAPI 代理 NestJS 服务（`/nest-proxy/*`）
- **模块化设计**：
  - `/api/v1` - Web API
  - `/images/api/v1` - 图像处理 API
  - `/audio/api/v1` - 音频处理 API
  - `/nest-proxy/*` - NestJS 服务代理

#### 数据库
- **PostgreSQL**：主数据库（用户、聊天、文档等）
- **MongoDB**：NestJS 服务使用
- **Redis**：缓存和会话管理

## 核心功能

### 1. AI 对话系统
- 多模型支持（OpenAI、Google Gemini 等）
- 流式响应（SSE）
- 上下文管理
- 对话历史

### 2. 视频生成
- AI 视频生成能力
- 视频处理和编辑
- 进度跟踪

### 3. 图像处理
- 图像生成
- 图像编辑
- OCR 识别
- 人脸识别（KYC）

### 4. 文档处理
- 多格式支持（PDF、Word、Excel、PPT）
- 文档解析和向量化
- RAG（检索增强生成）

### 5. Web3 集成
- 多链钱包连接（Ethereum、Polkadot）
- 加密货币支付（USDT、BNB）
- Coinbase Commerce 集成
- 支付监听器（BNB USDT）

### 6. 用户系统
- 用户注册/登录
- JWT 认证
- 权限管理
- VIP 系统

### 7. 国际化
- 多语言支持
- 自动语言检测
- 翻译管理

## 环境配置

### 环境变量说明

#### 数据库配置
```env
DATABASE_URL=postgresql://user:password@host:port/database
```

#### Redis 配置
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PWD=password
```

#### 邮件配置
```env
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=user@example.com
EMAIL_PWD=password
```

#### KYC 配置（阿里云）
```env
FACE_ACCESS_KEY_ID=your_key_id
FACE_ACCESS_KEY_SECRET=your_secret
FACE_ENDPOINT=cloudauth-intl.cn-hongkong.aliyuncs.com
```

#### OSS 配置（阿里云）
```env
FILE_ACCESS_KEY_ID=your_key_id
FILE_ACCESS_KEY_SECRET=your_secret
FILE_ENDPOINT=oss-cn-shanghai.aliyuncs.com
FILE_BUCKET_NAME=your_bucket
```

#### OpenAI 配置
```env
OPENAI_API_KEY=sk-...
```

#### Coinbase 配置
```env
COINBASE_KEY=your_key
COINBASE_SECRET=your_secret
COINBASE_ADDRESS=0x...
```

#### BNB USDT 配置
```env
BNB_RPC=https://bsc-dataseed.binance.org/
USDT_CONTRACT_ADDRESS=0x55d398326f99059fF775485246999027B3197955
USDT_TRAN_ADDRESS=0x...
```

## 开发指南

### 前端开发

#### 安装依赖
```bash
npm install
```

#### 开发模式
```bash
npm run dev          # 启动前端开发服务器
npm run front        # 仅启动前端
```

#### 构建
```bash
npm run build        # 构建生产版本
npm run preview      # 预览构建结果
```

#### 代码质量
```bash
npm run lint         # 运行所有 lint 检查
npm run format       # 格式化代码
npm run check        # TypeScript 类型检查
```

#### 测试
```bash
npm run test:frontend  # 运行单元测试
npm run cy:open        # 打开 Cypress E2E 测试
```

### 后端开发

#### Python 后端

**安装依赖**
```bash
cd backend
pip install -r requirements.txt
```

**启动服务**
```bash
./start.sh           # Linux/Mac
start_windows.bat    # Windows
```

**开发模式**
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8080
```

#### NestJS 后端

**安装依赖**
```bash
cd backend/degpt-nest/degpt-nest
npm install
```

**启动服务**
```bash
npm run start:dev    # 开发模式
npm run start:prod   # 生产模式
```

**构建**
```bash
npm run build
```

### Docker 部署

#### 开发环境
```bash
docker-compose -f docker-compose.yaml up -d
```

#### 生产环境
```bash
docker-compose -f docker-compose.prod.yml up -d
```

#### 测试环境
```bash
docker-compose -f docker-compose.test.yml up -d
```

## API 文档

### FastAPI 文档
- 开发环境：`http://localhost:8080/creator/docs`
- 生产环境：文档已禁用

### 主要 API 端点

#### 配置 API
- `GET /api/config` - 获取应用配置
- `GET /api/version` - 获取版本信息
- `GET /api/changelog` - 获取更新日志

#### 认证 API
- `POST /api/v1/auths/signin` - 用户登录
- `POST /api/v1/auths/signup` - 用户注册
- `POST /api/v1/auths/signout` - 用户登出

#### 聊天 API
- `POST /api/v1/chat` - 发送聊天消息
- `GET /api/v1/chats` - 获取聊天列表
- `DELETE /api/v1/chats/{id}` - 删除聊天

#### 图像 API
- `POST /images/api/v1/generate` - 生成图像
- `POST /images/api/v1/edit` - 编辑图像

#### 音频 API
- `POST /audio/api/v1/transcribe` - 音频转文字
- `POST /audio/api/v1/generate` - 文字转音频

#### NestJS 代理
- `/nest-proxy/*` - 代理到 NestJS 服务

## 关键技术点

### 1. SSE 流式响应
FastAPI 使用 `StreamingResponse` 实现 SSE，支持长连接（超时 3000 秒）。

### 2. 反向代理
FastAPI 代理 NestJS 服务，使用 `aiohttp` 实现流式转发。

### 3. 中间件
- **RAGMiddleware**：处理聊天请求，移除 citations 字段
- **CORSMiddleware**：跨域支持
- **Process Time Middleware**：记录请求处理时间

### 4. 支付监听
使用 `asyncio` 实现 BNB USDT 支付监听器，在应用启动时自动运行。

### 5. 文件上传
支持多种文件格式，使用 OSS 存储。

### 6. 国际化
使用 i18next 实现多语言支持，自动检测浏览器语言。

## 常见问题

### 1. 端口配置
- 前端开发服务器：`5173`
- FastAPI 后端：`8080`
- NestJS 后端：`3008`

### 2. 路径配置
应用部署在 `/creator` 路径下，需要在 Nginx 或其他反向代理中配置。

### 3. 数据库迁移
使用 `peewee-migrate` 管理数据库迁移。

### 4. 环境变量
确保 `.env` 文件配置正确，包含所有必需的 API 密钥和数据库连接信息。

### 5. CORS 问题
后端已配置 CORS 允许所有来源，生产环境建议限制来源。

## 性能优化

### 前端优化
- 代码分割（Vite 自动处理）
- 图片压缩（使用 compressorjs）
- 懒加载组件
- 资源预加载

### 后端优化
- 数据库连接池
- Redis 缓存
- 异步处理
- 流式响应

## 安全注意事项

1. **API 密钥管理**：不要将 `.env` 文件提交到版本控制
2. **CORS 配置**：生产环境限制允许的来源
3. **JWT 密钥**：使用强随机密钥
4. **SQL 注入**：使用 ORM 参数化查询
5. **XSS 防护**：前端输入验证和输出转义
6. **文件上传**：验证文件类型和大小

## 监控与日志

### 日志配置
- Python：使用 `logging` 模块
- NestJS：使用内置 Logger

### 性能监控
- 请求处理时间（X-Process-Time header）
- 错误日志记录
- LangFuse 集成（LLM 可观测性）

## 团队协作

### Git 工作流
- `main` 分支：生产环境
- `dev` 分支：开发环境
- 功能分支：`feature/*`
- 修复分支：`fix/*`

### 代码规范
- 使用 ESLint 和 Prettier
- 提交前运行 lint 检查
- 编写有意义的提交信息

## 联系方式

如有问题，请联系项目维护团队。

## 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解详细的版本更新历史。

---

**最后更新时间**：2026-02-10
