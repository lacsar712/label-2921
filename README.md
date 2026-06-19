# 图书后台管理系统

基于 Vue 3 + Element Plus + Node.js + PostgreSQL 开发的功能完善的图书后台管理系统。

## 🛠 技术栈
- **Frontend**: Vue 3, Element Plus, Pinia, Vue Router, ECharts
- **Backend**: Node.js (Express), Prisma ORM, JWT, PostgreSQL
- **Docker**: Docker Compose, Nginx

## 🚀 启动指南 (How to Run)
1. 确保 Docker Desktop 已启动。
2. 在根目录执行：
   ```bash
   docker compose up --build
   ```
3. 等待容器启动完成。系统会自动执行数据库结构同步 (`prisma db push`)。如需种子数据，请进入 backend 容器执行 `npm run seed`。

### 本地开发（可选）
- Backend: `cd backend && cp .env.example .env && npm install && npm run dev`
- Frontend: `cd frontend && npm install && npm run dev`

## 🔗 服务地址 (Services)
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Database**: localhost:5432 (user: postgres / pass: root)

## 🧪 测试账号
- **Admin**: admin / 123456
- **Librarian**: librarian / 123456

## ✨ 核心功能
- **仪表盘**: 数据统计看板，借阅趋势图表。
- **图书管理**: 完整的 CRUD 操作，包含库存管理。
- **分类管理**: 图书分类维护。
- **借阅记录**: 追踪图书借阅与归还状态。
- **权限管理**: 区分管理员与图书管理员角色，实现按钮级权限控制。
- **响应式设计**: 适配不同尺寸的屏幕。

## 🧪 测试
- Backend: `cd backend && npm run test`
- Frontend: `cd frontend && npm run test`（Vitest，示例包含 Pinia store 测试）
