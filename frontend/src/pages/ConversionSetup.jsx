import React, { useEffect, useState } from 'react';
import { getProducts, updateVariant } from '../api';

function ConversionSetup() {
    const [products, setProducts] = useState([]);
    const [shortcutProductId, setShortcutProductId] = useState('');
    const [caseTo4, setCaseTo4] = useState('');
    const [bagTo4, setBagTo4] = useState('');
    const [box2To4, setBox2To4] = useState('');
    const [message, setMessage] = useState('');
    const containerLabels = { case: '整箱', bag: '袋子', box_2inch: '2寸盒', box_4inch: '4寸盒' };
    const defaultCategoryOrder = ['protein', 'veg', 'frozen'];
    const getCategoryOrder = () => {
        try {
            const stored = localStorage.getItem('m2go:categoryOrder');
            if (!stored) return defaultCategoryOrder;
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultCategoryOrder;
        } catch (err) {
            return defaultCategoryOrder;
        }
    };

    useEffect(() => {
        loadProducts();
    }, []);

    async function loadProducts() {
        const data = await getProducts();
        setProducts(data);
    }

    const orderedProducts = [...products].sort((a, b) => {
        const orderList = getCategoryOrder();
        const aCat = orderList.indexOf(a.category);
        const bCat = orderList.indexOf(b.category);
        const aCatIndex = aCat === -1 ? 999 : aCat;
        const bCatIndex = bCat === -1 ? 999 : bCat;
        if (aCatIndex !== bCatIndex) return aCatIndex - bCatIndex;
        const aOrder = Number.isFinite(a.sort_order) ? a.sort_order : 9999;
        const bOrder = Number.isFinite(b.sort_order) ? b.sort_order : 9999;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return (a.name_zh || '').localeCompare(b.name_zh || '', 'zh');
    });

    const handleConversionChange = async (variant, newVal) => {
        const val = parseFloat(newVal);
        if (isNaN(val)) return;

        // Optimistic update
        const updatedProducts = products.map(p => {
            if (p.id !== variant.product_id) return p;
            return {
                ...p,
                variants: p.variants.map(v => v.id === variant.id ? { ...v, conversion_to_base: val } : v)
            };
        });
        setProducts(updatedProducts);

        try {
            await updateVariant(variant.id, {
                ...variant,
                conversion_to_base: val,
                product_id: variant.product_id // needed by schema
            });
        } catch (err) {
            console.error(err);
            // Revert if needed, but for MVP simpler logging
        }
    };

    const handleApplyShortcut = async () => {
        setMessage('');
        const product = products.find(p => String(p.id) === String(shortcutProductId));
        if (!product) {
            setMessage('请选择商品');
            return;
        }

        const updates = [];
        const caseVal = parseFloat(caseTo4);
        const bagVal = parseFloat(bagTo4);
        const box2Val = parseFloat(box2To4);

        product.variants.forEach(v => {
            if (v.container === 'box_4inch') {
                updates.push({ ...v, conversion_to_base: 1.0 });
            }
            if (v.container === 'case' && !isNaN(caseVal)) {
                updates.push({ ...v, conversion_to_base: caseVal });
            }
            if (v.container === 'bag' && !isNaN(bagVal)) {
                updates.push({ ...v, conversion_to_base: bagVal });
            }
            if (v.container === 'box_2inch' && !isNaN(box2Val)) {
                updates.push({ ...v, conversion_to_base: box2Val });
            }
        });

        if (updates.length === 0) {
            setMessage('没有可更新的容器，请先确认有4寸盒/袋/箱等规格');
            return;
        }

        const updatedProducts = products.map(p => {
            if (p.id !== product.id) return p;
            return {
                ...p,
                variants: p.variants.map(v => {
                    const hit = updates.find(u => u.id === v.id);
                    return hit ? { ...v, conversion_to_base: hit.conversion_to_base } : v;
                })
            };
        });
        setProducts(updatedProducts);

        try {
            await Promise.all(updates.map(v => updateVariant(v.id, {
                ...v,
                product_id: v.product_id
            })));
            setMessage('快捷换算已应用');
        } catch (err) {
            console.error(err);
            setMessage('快捷换算保存失败');
        }
    };

    return (
        <div className="card">
            <h2>换算设置</h2>
            <p style={{ marginBottom: '1rem', color: '#666' }}>
                先选择商品，再用快捷方式设置与4寸盒的换算关系。系统默认 1 个 4 寸盒 = 1 个基准单位(份)。
            </p>

            <div className="card subtle">
                <h3>快捷换算</h3>
                <div className="grid-cols-2">
                    <div>
                        <label>选择商品</label>
                        <select value={shortcutProductId} onChange={e => setShortcutProductId(e.target.value)}>
                            <option value="">请选择</option>
                            {orderedProducts.map(p => (
                                <option key={p.id} value={p.id}>{p.name_zh}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label>1箱 = ? 个4寸盒</label>
                        <input type="number" value={caseTo4} onChange={e => setCaseTo4(e.target.value)} placeholder="如 10" />
                    </div>
                    <div>
                        <label>1袋 = ? 个4寸盒</label>
                        <input type="number" value={bagTo4} onChange={e => setBagTo4(e.target.value)} placeholder="如 2" />
                    </div>
                    <div>
                        <label>1个2寸盒 = ? 个4寸盒</label>
                        <input type="number" value={box2To4} onChange={e => setBox2To4(e.target.value)} placeholder="如 0.5" />
                    </div>
                </div>
                <button className="primary" style={{ marginTop: '1rem' }} onClick={handleApplyShortcut}>
                    应用快捷换算
                </button>
                {message && (
                    <div
                        className="text-center"
                        style={{ marginTop: '0.5rem', color: message.includes('失败') || message.includes('请选择') || message.includes('没有') ? '#b91c1c' : '#2e7d32' }}
                    >
                        {message}
                    </div>
                )}
            </div>

            <table>
                <thead>
                    <tr>
                        <th>商品</th>
                        <th>规格</th>
                        <th>换算值(基准单位)</th>
                        <th>状态</th>
                    </tr>
                </thead>
                <tbody>
                    {orderedProducts.map(p => (
                        <React.Fragment key={p.id}>
                            {[...(p.variants || [])].sort((a, b) => {
                                const aOrder = Number.isFinite(a.sort_order) ? a.sort_order : 9999;
                                const bOrder = Number.isFinite(b.sort_order) ? b.sort_order : 9999;
                                if (aOrder !== bOrder) return aOrder - bOrder;
                                return (a.display_name_zh || '').localeCompare(b.display_name_zh || '', 'zh');
                            }).map(v => (
                                <tr key={v.id}>
                                    <td>{p.name_zh}</td>
                                    <td>{v.display_name_zh} <span style={{ color: '#777' }}>· {containerLabels[v.container] || v.container}</span></td>
                                    <td>
                                        <input
                                            type="number"
                                            value={v.conversion_to_base || ''}
                                            onChange={e => handleConversionChange(v, e.target.value)}
                                            style={{ width: '80px' }}
                                        />
                                    </td>
                                    <td>
                                        {!v.conversion_to_base && <span className="badge badge-warning">缺失</span>}
                                    </td>
                                </tr>
                            ))}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default ConversionSetup;
