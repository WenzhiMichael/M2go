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

## 重要规则
- 订货日固定：周一、周五；到货日固定：周二、周六。
- 蛋白类（白鸡/黑鸡/牛肉/鸡翅）强制按箱取整。
- 数据不足：少于 3 个盘点记录，日消耗按 0 估算并提示。
- 预炸成品只按冷藏管理，不回冻。

## 示例文件
- `samples/daily_counts_sample.csv`：盘点导入示例
- `samples/products_sample.csv`：商品示例（可选）

## 测试
```bash
PYTHONPATH=backend backend/venv/bin/python -m pytest backend/tests/test_logic.py -q
```
