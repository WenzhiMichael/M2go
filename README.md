# M2GO 订货助手

面向外卖店的库存 + 订货 MVP。所有界面文字为中文。

## 功能概览
- 每日盘点：输入当天结余，自动覆盖库存并记录调整值。
- 换算设置：支持袋子/2寸盒/4寸盒/整箱的换算，含快捷换算。
- 订货建议：周一/周五生成建议，蛋白按箱取整，支持风险提示与数据不足提示。
- 订单保存与导出：保存草稿订单并导出中文 CSV（按供应商/类别排序）。
- 商品与规格管理：基础 CRUD。
- 蔬菜丝混合规则：胡萝卜丝/洋葱丝/青葱丝按 2:1:1 分配。

## 安装与运行

## 部署指南 (Deployment)

### 1. 后端 (Render)
M2GO 后端可以直接部署到 Render (推荐使用 Blueprint)。

1.  将代码推送到 GitHub。
2.  在 Render Dashboard 中选择 "New Blueprint Instance"。
3.  连接你的 Repo，Render 会自动读取 `render.yaml`。
4.  Render 会自动创建 Python Web Service 和 PostgreSQL 数据库。
5.  部署完成后，复制分配给 Backend 的 URL (例如 `https://m2go-backend.onrender.com`)。

### 2. 前端 (Vercel)
1.  在 Vercel 中 "Import Project" 并选择你的 GitHub Repo。
2.  **Framework Preset**: 选择 `Vite`。
3.  **Root Directory**: 选择 `frontend` (不要选跟目录)。
4.  **Environment Variables**: 添加变量 `VITE_API_BASE_URL`，值为你的 Render Backend URL (不要带尾部 Slash, 例如 `https://m2go-backend.onrender.com`)。
5.  点击 Deploy。

### 若手动启动 (Local)
```bash
./dev.sh
```
说明：
- 首次运行会创建后端虚拟环境并安装依赖。
- 前端若无 `node_modules` 会自动执行 `npm install`。
- 若是首次启用或重建数据库，请先在后端执行一次迁移（见下文）。

### 后端
需要 Python 3.9+。
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 运行迁移（推荐）
alembic upgrade head

# 启动后端
uvicorn app.main:app --reload
```
说明：
- 如果已有旧版 `m2go.db`，可先备份，再执行 `alembic stamp 0001_initial` 后 `alembic upgrade head`，或直接删除旧库重建。

### 前端
需要 Node.js。
```bash
cd frontend
npm install
npm run dev
```
浏览器访问终端提示的地址（默认 http://localhost:5173）。

## 使用流程
1. 换算设置  
   先补齐换算，缺失会导致订货不准。快捷换算默认以 4 寸盒 = 1 基准单位(份)。
2. 每日盘点  
   录入各规格结余，系统会记录调整值并覆盖库存。
3. 生成订货建议  
   周一/周五进入订货建议页，生成建议后可修改实订数量与备注。
4. 保存与导出  
   保存订单后导出 CSV 发送给供应商。
5. 商品与规格管理  
   新增/编辑/停用商品，维护规格与换算。
6. 排序与展示  
   商品可在“商品与规格管理”内上下移动排序；每日盘点内可拖动商品行排序（不会跨分类移动）。

## 重要规则
- 订货日固定：周一、周五；到货日固定：周二、周六。
- 蛋白类（鸡球/柠檬鸡/黑鸡/牛肉/鸡翅/猪肉）强制按箱取整。
- 蛋白类规格：生=箱/袋；预制(冷藏)=箱/2寸盒/4寸盒。
- 数据不足：少于 3 个盘点记录，日消耗按 0 估算并提示。
- 预炸成品只按冷藏管理，不回冻。

## 订货建议算法（简版）
1. 日消耗估算  
   取最近 N 天盘点（默认 14 天），按相邻两天差值：  
   `usage = max(0, 前一天盘点 - 当天盘点)`，求平均得到日消耗。
2. 换算到基准单位  
   每个规格按 `conversion_to_base` 换算成“基准单位(份)”再汇总。
3. 目标库存  
   `目标库存 = 日消耗 × 覆盖天数 + 安全缓冲 × 日消耗`
4. 建议订货  
   `Q_raw = max(0, 目标库存 - 当前库存)`
5. 取整规则  
   蛋白按箱取整；其他按起订量处理。
6. 风险提示  
   若库存覆盖天数不足，提示“可能撑不到下次到货”。

## 示例文件
- `samples/daily_counts_sample.csv`：盘点导入示例
- `samples/products_sample.csv`：商品示例（可选）

## 测试
```bash
PYTHONPATH=backend backend/venv/bin/python -m pytest backend/tests/test_logic.py -q
```

## 部署（给客户网址）
推荐：前端用 Vercel，后端用 Render（带持久化磁盘）。

### 1) 部署后端（Render）
- 类型：Web Service  
- 启动命令：
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
- 挂载持久化磁盘（例如 `/var/data`）  
- 环境变量：
```bash
DATABASE_URL=sqlite:////var/data/m2go.db
```

### 2) 部署前端（Vercel）
- 选择项目根目录为 `frontend/`
- 构建命令：`npm run build`
- 输出目录：`dist`
- 环境变量（指向 Render 后端地址）：
```bash
VITE_API_URL=https://<你的-render-后端域名>
```

### 3) 使用
访问 Vercel 提供的网址即可使用系统。  
如果需要使用 `stock-management` 作为子域名，可在 Vercel 创建项目时设置项目名为 `stock-management`。

## 常见问题
- `npm run dev` 报错找不到 `package.json`  
  说明你在根目录执行了前端命令，请先 `cd frontend` 再运行。
- 迁移报 `table already exists`  
  旧库请先执行：`alembic stamp 0001_initial` 再 `alembic upgrade head`，或删除 `backend/m2go.db` 重新建库。
