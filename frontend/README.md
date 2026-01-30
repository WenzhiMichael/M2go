# 前端说明

## 前置条件
- Node.js（建议 LTS）

## 本地运行
1) 复用你已部署的 Supabase 项目，在 `frontend/.env.local` 配置：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2) 安装依赖并启动：
```bash
npm install
npm run dev
```
默认访问 http://localhost:5173。

## 构建与预览
```bash
npm run build
npm run preview
```

## 代码检查
```bash
npm run lint
```
