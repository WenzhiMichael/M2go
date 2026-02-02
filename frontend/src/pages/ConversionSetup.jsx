import React, { useEffect, useState } from 'react';
import { getProducts, updateVariant } from '../api';

function ConversionSetup() {
    const [products, setProducts] = useState([]);
    const [shortcutProductId, setShortcutProductId] = useState('');
    const [caseTo4, setCaseTo4] = useState('');
    const [bagTo4, setBagTo4] = useState('');
    const [box2To4, setBox2To4] = useState('');
    const [message, setMessage] = useState('');
    const [loadError, setLoadError] = useState('');
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
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="neumorphic-inset rounded-[2.5rem] p-6 space-y-6">
                <div>
                    <span className="text-[10px] font-mono font-bold text-[#0f766e] tracking-[0.3em] uppercase block mb-1">
                        系统配置
                    </span>
                    <h2 className="text-3xl font-bold text-gray-700">换算设置</h2>
                    <p className="text-sm text-gray-500">设置与 4 寸盒的换算关系，保持库存口径一致。</p>
                </div>

                {loadError && (
                    <div className="rounded-xl border border-white/70 bg-white/40 px-4 py-3 text-sm text-red-700">
                        {loadError}
                    </div>
                )}

                <div className="neumorphic-flat rounded-2xl p-6 space-y-4">
                    <h3 className="text-sm font-mono uppercase tracking-widest text-gray-500">快捷换算</h3>
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
                    <button className="neumorphic-button px-6 py-3 rounded-xl font-mono text-xs uppercase tracking-widest text-gray-600" onClick={handleApplyShortcut}>
                        应用快捷换算
                    </button>
                    {message && (
                        <div className={`text-sm font-semibold ${message.includes('失败') || message.includes('请选择') || message.includes('没有') ? 'text-red-600' : 'text-green-600'}`}>
                            {message}
                        </div>
                    )}
                </div>

                <div className="neumorphic-flat rounded-2xl p-6">
                    <h3 className="text-sm font-mono uppercase tracking-widest text-gray-500 mb-4">换算清单</h3>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table>
                            <thead>
                                <tr>
                                    <th>商品</th>
                                    <th>规格</th>
                                    <th>换算值</th>
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
                                                <td>{v.display_name_zh} <span className="text-xs text-gray-400">· {containerLabels[v.container] || v.container}</span></td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        value={v.conversion_to_base || ''}
                                                        onChange={e => handleConversionChange(v, e.target.value)}
                                                        className="w-24"
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
                </div>
            </div>

            <aside className="flex flex-col gap-6">
                <div className="neumorphic-flat rounded-3xl p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-[#0f766e] uppercase tracking-widest">参数工具</span>
                        <span className="size-2 rounded-full bg-[#4caf50] led-indicator"></span>
                    </div>
                    <h4 className="text-xl font-bold text-gray-700">换算助手</h4>
                    <p className="text-xs text-gray-500">使用物理参考快速换算到基准单位。</p>
                    <div className="neumorphic-inset rounded-xl p-4 bg-[#0f172a] text-[#4caf50] font-mono">
                        <div className="text-xs opacity-70">校准值</div>
                        <div className="text-3xl text-right tracking-tight">0.00 <span className="text-xs opacity-60">单位</span></div>
                        <div className="mt-2 h-0.5 bg-[#4caf50]/20 relative overflow-hidden">
                            <div className="absolute left-0 top-0 h-full w-1/3 bg-[#4caf50] animate-[ping_3s_ease-in-out_infinite]"></div>
                        </div>
                    </div>
                    <button className="neumorphic-button py-3 rounded-xl text-xs font-mono uppercase tracking-widest text-gray-600">
                        启动向导
                    </button>
                </div>
            </aside>
        </div>
    );
}

export default ConversionSetup;

