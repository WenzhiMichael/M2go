import React, { useEffect, useState } from 'react';
import {
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    createVariant,
    updateVariant,
    deleteVariant
} from '../api';

const categoryOptions = [
    { value: 'protein', label: '蛋白' },
    { value: 'veg', label: '蔬菜' },
    { value: 'frozen', label: '冷冻' }
];

const storageOptions = [
    { value: 'room', label: '常温' },
    { value: 'chill', label: '冷藏' },
    { value: 'frozen', label: '冷冻' }
];

const formOptions = [
    { value: 'RAW', label: '生' },
    { value: 'COOKED_CHILL', label: '预炸(冷藏)' },
    { value: 'PREP_chunk', label: '切块' },
    { value: 'PREP_shred', label: '切丝' },
    { value: 'PREP_dice', label: '切丁' },
    { value: 'FROZEN', label: '冷冻' }
];

const containerOptions = [
    { value: 'case', label: '整箱' },
    { value: 'bag', label: '袋子' },
    { value: 'box_2inch', label: '2寸盒' },
    { value: 'box_4inch', label: '4寸盒' }
];

const defaultCategoryOrder = ['protein', 'veg', 'frozen'];
const loadCategoryOrder = () => {
    try {
        const stored = localStorage.getItem('m2go:categoryOrder');
        if (!stored) return defaultCategoryOrder;
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultCategoryOrder;
    } catch (err) {
        return defaultCategoryOrder;
    }
};

function Products() {
    const [products, setProducts] = useState([]);
    const [message, setMessage] = useState('');
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [categoryOrder, setCategoryOrder] = useState(loadCategoryOrder);
    const [loadError, setLoadError] = useState('');
    const [newProduct, setNewProduct] = useState({
        name_zh: '',
        name_en: '',
        category: 'veg',
        storage_type: 'room',
        supplier: '',
        case_pack: '',
        min_order_qty: ''
    });
    const [newVariantByProduct, setNewVariantByProduct] = useState({});
    const categoryLabelMap = Object.fromEntries(categoryOptions.map(o => [o.value, o.label]));
    const storageLabelMap = Object.fromEntries(storageOptions.map(o => [o.value, o.label]));

    useEffect(() => {
        loadProducts();
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('m2go:categoryOrder', JSON.stringify(categoryOrder));
        } catch (err) {
            console.error(err);
        }
    }, [categoryOrder]);

    useEffect(() => {
        const categories = Array.from(new Set(products.map(p => p.category)));
        const merged = [...categoryOrder];
        categories.forEach(cat => {
            if (!merged.includes(cat)) merged.push(cat);
        });
        if (merged.length !== categoryOrder.length) {
            setCategoryOrder(merged);
        }
    }, [products, categoryOrder]);

    async function loadProducts() {
        try {
            setLoadError('');
            const data = await getProducts();
            setProducts(data);
        } catch (err) {
            console.error(err);
            setLoadError('商品加载失败，请确认已登录并检查网络');
            setProducts([]);
        }
    }

    const buildProductPayload = (product) => ({
        name_zh: product.name_zh,
        name_en: product.name_en,
        category: product.category,
        storage_type: product.storage_type,
        supplier: product.supplier || null,
        case_pack: product.case_pack ? parseFloat(product.case_pack) : null,
        min_order_qty: product.min_order_qty ? parseFloat(product.min_order_qty) : null,
        sort_order: Number.isFinite(product.sort_order) ? product.sort_order : null,
        is_active: product.is_active !== false
    });

    const handleCreateProduct = async () => {
        setMessage('');
        try {
            const payload = {
                ...newProduct,
                case_pack: newProduct.case_pack ? parseFloat(newProduct.case_pack) : null,
                min_order_qty: newProduct.min_order_qty ? parseFloat(newProduct.min_order_qty) : null,
                supplier: newProduct.supplier || null,
                is_active: true
            };
            const created = await createProduct(payload);
            setProducts([...products, { ...created, variants: [] }]);
            setNewProduct({
                name_zh: '',
                name_en: '',
                category: 'veg',
                storage_type: 'room',
                supplier: '',
                case_pack: '',
                min_order_qty: ''
            });
            setMessage('商品已新增');
        } catch (err) {
            console.error(err);
            setMessage('新增失败');
        }
    };

    const handleProductChange = (productId, field, value) => {
        setProducts(products.map(p => p.id === productId ? { ...p, [field]: value } : p));
    };

    const handleSaveProduct = async (product) => {
        setMessage('');
        try {
            const payload = buildProductPayload(product);
            await updateProduct(product.id, payload);
            setMessage('商品已保存');
        } catch (err) {
            console.error(err);
            setMessage('保存失败');
        }
    };

    const handleDeleteProduct = async (productId) => {
        setMessage('');
        try {
            await deleteProduct(productId);
            setProducts(products.filter(p => p.id !== productId));
            setMessage('商品已停用');
        } catch (err) {
            console.error(err);
            setMessage('删除失败');
        }
    };

    const handleVariantChange = (productId, variantId, field, value) => {
        setProducts(products.map(p => {
            if (p.id !== productId) return p;
            return {
                ...p,
                variants: p.variants.map(v => v.id === variantId ? { ...v, [field]: value } : v)
            };
        }));
    };

    const handleSaveVariant = async (variant) => {
        setMessage('');
        try {
            const payload = {
                ...variant,
                conversion_to_base: variant.conversion_to_base !== '' ? parseFloat(variant.conversion_to_base) : null,
                sort_order: Number.isFinite(variant.sort_order) ? variant.sort_order : null,
                product_id: variant.product_id
            };
            await updateVariant(variant.id, payload);
            setMessage('规格已保存');
        } catch (err) {
            console.error(err);
            setMessage('保存失败');
        }
    };

    const handleDeleteVariant = async (productId, variantId) => {
        setMessage('');
        try {
            await deleteVariant(variantId);
            setProducts(products.map(p => p.id === productId ? { ...p, variants: p.variants.filter(v => v.id !== variantId) } : p));
            setMessage('规格已删除');
        } catch (err) {
            console.error(err);
            setMessage('删除失败');
        }
    };

    const handleNewVariantChange = (productId, field, value) => {
        setNewVariantByProduct({
            ...newVariantByProduct,
            [productId]: {
                ...newVariantByProduct[productId],
                [field]: value
            }
        });
    };

    const handleCreateVariant = async (productId) => {
        const draft = newVariantByProduct[productId];
        if (!draft || !draft.display_name_zh) {
            setMessage('请补全规格名称');
            return;
        }

        setMessage('');
        try {
            const payload = {
                product_id: productId,
                form: draft.form || 'RAW',
                container: draft.container || 'bag',
                conversion_to_base: draft.conversion_to_base ? parseFloat(draft.conversion_to_base) : null,
                display_name_zh: draft.display_name_zh
            };
            const created = await createVariant(payload);
            setProducts(products.map(p => p.id === productId ? { ...p, variants: [...p.variants, created] } : p));
            setNewVariantByProduct({ ...newVariantByProduct, [productId]: {} });
            setMessage('规格已新增');
        } catch (err) {
            console.error(err);
            setMessage('新增失败');
        }
    };

    const filteredProducts = products.filter(p => {
        if (!search.trim()) return true;
        const keyword = search.trim().toLowerCase();
        const zh = (p.name_zh || '').toLowerCase();
        const en = (p.name_en || '').toLowerCase();
        return zh.includes(keyword) || en.includes(keyword);
    });

    const grouped = filteredProducts.reduce((acc, p) => {
        acc[p.category] = acc[p.category] || [];
        acc[p.category].push(p);
        return acc;
    }, {});

    const orderedCategories = [
        ...categoryOrder.filter(cat => grouped[cat]),
        ...Object.keys(grouped).filter(cat => !categoryOrder.includes(cat))
    ];

    const sortProducts = (list) => [...list].sort((a, b) => {
        const aOrder = Number.isFinite(a.sort_order) ? a.sort_order : 9999;
        const bOrder = Number.isFinite(b.sort_order) ? b.sort_order : 9999;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return (a.name_zh || '').localeCompare(b.name_zh || '', 'zh');
    });

    const moveCategory = (category, direction) => {
        const idx = categoryOrder.indexOf(category);
        if (idx === -1) return;
        const nextIdx = idx + direction;
        if (nextIdx < 0 || nextIdx >= categoryOrder.length) return;
        const next = [...categoryOrder];
        [next[idx], next[nextIdx]] = [next[nextIdx], next[idx]];
        setCategoryOrder(next);
        setMessage('分类顺序已更新');
    };

    const moveProduct = async (category, productId, direction) => {
        if (search.trim()) return;
        const list = sortProducts(grouped[category] || []);
        const index = list.findIndex(p => p.id === productId);
        const targetIndex = index + direction;
        if (index === -1 || targetIndex < 0 || targetIndex >= list.length) return;
        const current = list[index];
        const swap = list[targetIndex];
        const currentOrder = Number.isFinite(current.sort_order) ? current.sort_order : index + 1;
        const swapOrder = Number.isFinite(swap.sort_order) ? swap.sort_order : targetIndex + 1;
        const prevProducts = products;
        const updated = products.map(p => {
            if (p.id === current.id) return { ...p, sort_order: swapOrder };
            if (p.id === swap.id) return { ...p, sort_order: currentOrder };
            return p;
        });
        setProducts(updated);
        try {
            await Promise.all([
                updateProduct(current.id, buildProductPayload({ ...current, sort_order: swapOrder })),
                updateProduct(swap.id, buildProductPayload({ ...swap, sort_order: currentOrder }))
            ]);
        } catch (err) {
            console.error(err);
            setMessage('排序保存失败');
            setProducts(prevProducts);
        }
    };

    return (
        <div className="card">
            <h2>商品与规格管理</h2>
            {loadError && (
                <div className="text-center" style={{ marginBottom: '1rem', color: '#b91c1c' }}>
                    {loadError}
                </div>
            )}

            <div className="count-toolbar">
                <input
                    className="count-search"
                    type="text"
                    placeholder="搜索商品（中文/英文）"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <div className="count-hint">点击“编辑”展开详情</div>
            </div>

            <div className="card subtle">
                <h3>新增商品</h3>
                <div className="grid-cols-2">
                    <div>
                        <label>中文名</label>
                        <input value={newProduct.name_zh} onChange={e => setNewProduct({ ...newProduct, name_zh: e.target.value })} />
                    </div>
                    <div>
                        <label>英文名</label>
                        <input value={newProduct.name_en} onChange={e => setNewProduct({ ...newProduct, name_en: e.target.value })} />
                    </div>
                    <div>
                        <label>分类</label>
                        <select value={newProduct.category} onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}>
                            {categoryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label>储存</label>
                        <select value={newProduct.storage_type} onChange={e => setNewProduct({ ...newProduct, storage_type: e.target.value })}>
                            {storageOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label>供应商</label>
                        <input value={newProduct.supplier} onChange={e => setNewProduct({ ...newProduct, supplier: e.target.value })} />
                    </div>
                    <div>
                        <label>整箱规格(可选)</label>
                        <input type="number" value={newProduct.case_pack} onChange={e => setNewProduct({ ...newProduct, case_pack: e.target.value })} />
                    </div>
                    <div>
                        <label>起订量(可选)</label>
                        <input type="number" value={newProduct.min_order_qty} onChange={e => setNewProduct({ ...newProduct, min_order_qty: e.target.value })} />
                    </div>
                </div>
                <button className="primary" style={{ marginTop: '1rem' }} onClick={handleCreateProduct}>新增商品</button>
            </div>

            {orderedCategories.map(cat => {
                const list = sortProducts(grouped[cat] || []);
                return (
                    <div key={cat}>
                        <div className="category-header category-header-row">
                            <span>{categoryLabelMap[cat] || cat}</span>
                            <div className="category-actions">
                                <button
                                    className="secondary small"
                                    onClick={() => moveCategory(cat, -1)}
                                    disabled={categoryOrder.indexOf(cat) <= 0}
                                >
                                    上移
                                </button>
                                <button
                                    className="secondary small"
                                    onClick={() => moveCategory(cat, 1)}
                                    disabled={categoryOrder.indexOf(cat) === categoryOrder.length - 1}
                                >
                                    下移
                                </button>
                            </div>
                        </div>

                        {list.map((product, index) => {
                            const expanded = expandedId === product.id;
                            const canMoveUp = index > 0 && !search.trim();
                            const canMoveDown = index < list.length - 1 && !search.trim();
                            const variantsSorted = [...(product.variants || [])].sort((a, b) => {
                                const aOrder = Number.isFinite(a.sort_order) ? a.sort_order : 9999;
                                const bOrder = Number.isFinite(b.sort_order) ? b.sort_order : 9999;
                                if (aOrder !== bOrder) return aOrder - bOrder;
                                return (a.display_name_zh || '').localeCompare(b.display_name_zh || '', 'zh');
                            });
                            return (
                                <div key={product.id} className="card subtle">
                                    <div className="product-header">
                                        <div>
                                            <h3>{product.name_zh}</h3>
                                            <div className="product-meta">
                                                {categoryLabelMap[product.category] || product.category}
                                                {' · '}
                                                {storageLabelMap[product.storage_type] || product.storage_type}
                                                {' · '}
                                                {product.variants.length} 个规格
                                            </div>
                                        </div>
                                        <div className="product-actions">
                                            <button
                                                className="secondary small"
                                                onClick={() => moveProduct(cat, product.id, -1)}
                                                disabled={!canMoveUp}
                                            >
                                                上移
                                            </button>
                                            <button
                                                className="secondary small"
                                                onClick={() => moveProduct(cat, product.id, 1)}
                                                disabled={!canMoveDown}
                                            >
                                                下移
                                            </button>
                                            <button
                                                className="secondary"
                                                onClick={() => setExpandedId(expanded ? null : product.id)}
                                            >
                                                {expanded ? '收起' : '编辑'}
                                            </button>
                                        </div>
                                    </div>

                                    {expanded && (
                                        <>
                                            <div className="grid-cols-2">
                                                <div>
                                                    <label>中文名</label>
                                                    <input value={product.name_zh} onChange={e => handleProductChange(product.id, 'name_zh', e.target.value)} />
                                                </div>
                                                <div>
                                                    <label>英文名</label>
                                                    <input value={product.name_en} onChange={e => handleProductChange(product.id, 'name_en', e.target.value)} />
                                                </div>
                                                <div>
                                                    <label>分类</label>
                                                    <select value={product.category} onChange={e => handleProductChange(product.id, 'category', e.target.value)}>
                                                        {categoryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label>储存</label>
                                                    <select value={product.storage_type} onChange={e => handleProductChange(product.id, 'storage_type', e.target.value)}>
                                                        {storageOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label>供应商</label>
                                                    <input value={product.supplier || ''} onChange={e => handleProductChange(product.id, 'supplier', e.target.value)} />
                                                </div>
                                                <div>
                                                    <label>整箱规格</label>
                                                    <input type="number" value={product.case_pack || ''} onChange={e => handleProductChange(product.id, 'case_pack', e.target.value)} />
                                                </div>
                                                <div>
                                                    <label>起订量</label>
                                                    <input type="number" value={product.min_order_qty || ''} onChange={e => handleProductChange(product.id, 'min_order_qty', e.target.value)} />
                                                </div>
                                            </div>
                                            <div style={{ marginTop: '0.6rem' }}>
                                                <button className="secondary" onClick={() => handleSaveProduct(product)} style={{ marginRight: '0.5rem' }}>保存商品</button>
                                                <button className="secondary danger" onClick={() => handleDeleteProduct(product.id)}>停用商品</button>
                                            </div>

                                            <div style={{ marginTop: '1rem' }}>
                                                <h4>规格列表</h4>
                                                <table>
                                                    <thead>
                                                        <tr>
                                                            <th>名称</th>
                                                            <th>形态</th>
                                                            <th>容器</th>
                                                            <th>换算</th>
                                                            <th>操作</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {variantsSorted.map(v => (
                                                            <tr key={v.id}>
                                                                <td>
                                                                    <input value={v.display_name_zh} onChange={e => handleVariantChange(product.id, v.id, 'display_name_zh', e.target.value)} />
                                                                </td>
                                                                <td>
                                                                    <select value={v.form} onChange={e => handleVariantChange(product.id, v.id, 'form', e.target.value)}>
                                                                        {formOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                                    </select>
                                                                </td>
                                                                <td>
                                                                    <select value={v.container} onChange={e => handleVariantChange(product.id, v.id, 'container', e.target.value)}>
                                                                        {containerOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                                    </select>
                                                                </td>
                                                                <td>
                                                                    <input type="number" value={v.conversion_to_base || ''} onChange={e => handleVariantChange(product.id, v.id, 'conversion_to_base', e.target.value)} />
                                                                </td>
                                                                <td>
                                                                    <button className="secondary" onClick={() => handleSaveVariant(v)} style={{ marginRight: '0.5rem' }}>保存</button>
                                                                    <button className="secondary danger" onClick={() => handleDeleteVariant(product.id, v.id)}>删除</button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {product.variants.length === 0 && (
                                                            <tr><td colSpan="5" className="text-center">暂无规格</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>

                                                <div className="grid-cols-2">
                                                    <div>
                                                        <label>新增规格名称</label>
                                                        <input
                                                            value={(newVariantByProduct[product.id] || {}).display_name_zh || ''}
                                                            onChange={e => handleNewVariantChange(product.id, 'display_name_zh', e.target.value)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label>形态</label>
                                                        <select
                                                            value={(newVariantByProduct[product.id] || {}).form || 'RAW'}
                                                            onChange={e => handleNewVariantChange(product.id, 'form', e.target.value)}
                                                        >
                                                            {formOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label>容器</label>
                                                        <select
                                                            value={(newVariantByProduct[product.id] || {}).container || 'bag'}
                                                            onChange={e => handleNewVariantChange(product.id, 'container', e.target.value)}
                                                        >
                                                            {containerOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label>换算</label>
                                                        <input
                                                            type="number"
                                                            value={(newVariantByProduct[product.id] || {}).conversion_to_base || ''}
                                                            onChange={e => handleNewVariantChange(product.id, 'conversion_to_base', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <button className="primary" style={{ marginTop: '0.5rem' }} onClick={() => handleCreateVariant(product.id)}>新增规格</button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );
            })}

            {message && <div style={{ marginTop: '1rem', textAlign: 'center', color: '#2e7d32' }}>{message}</div>}
        </div>
    );
}

export default Products;
