import React, { useEffect, useMemo, useState } from 'react';
import { getProducts, updateVariant } from '../api';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLang } from '../i18n';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

function ConversionSetup() {
    const [products, setProducts] = useState([]);
    const [shortcutProductId, setShortcutProductId] = useState('');
    const [caseTo4, setCaseTo4] = useState('');
    const [bagTo4, setBagTo4] = useState('');
    const [box2To4, setBox2To4] = useState('');
    const [message, setMessage] = useState('');
    const [loadError, setLoadError] = useState('');
    const { t } = useLang();

    const containerLabels = useMemo(() => ({
        case: t('整箱', 'Case'),
        bag: t('袋装', 'Bag'),
        box_2inch: t('2寸盒', '2" Box'),
        box_4inch: t('4寸盒', '4" Box')
    }), [t]);

    const categoryLabelMap = useMemo(() => ({
        protein: t('蛋白', 'Protein'),
        veg: t('蔬菜', 'Veg'),
        frozen: t('冷冻', 'Frozen'),
        dry: t('干货', 'Dry'),
        sauce: t('酱料', 'Sauce'),
        other: t('其他', 'Other')
    }), [t]);

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
            setLoadError(t('加载商品失败', 'Failed to load products.'));
            setProducts([]);
        }
    }

    const orderedProducts = useMemo(() => {
        return [...products].sort((a, b) => {
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
    }, [products]);

    const handleConversionChange = async (variant, newVal) => {
        const val = parseFloat(newVal);
        if (isNaN(val)) return;

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
                product_id: variant.product_id
            });
        } catch (err) {
            console.error(err);
        }
    };

    const handleApplyShortcut = async () => {
        setMessage('');
        const product = products.find(p => String(p.id) === String(shortcutProductId));
        if (!product) {
            setMessage(t('请选择商品', 'Please select a product.'));
            return;
        }

        const updates = [];
        const caseVal = parseFloat(caseTo4);
        const bagVal = parseFloat(bagTo4);
        const box2Val = parseFloat(box2To4);

        product.variants.forEach(v => {
            if (v.container === 'box_4inch') updates.push({ ...v, conversion_to_base: 1.0 });
            if (v.container === 'case' && !isNaN(caseVal)) updates.push({ ...v, conversion_to_base: caseVal });
            if (v.container === 'bag' && !isNaN(bagVal)) updates.push({ ...v, conversion_to_base: bagVal });
            if (v.container === 'box_2inch' && !isNaN(box2Val)) updates.push({ ...v, conversion_to_base: box2Val });
        });

        if (updates.length === 0) {
            setMessage(t('没有匹配的规格可更新', 'No matching variants found.'));
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
            setMessage(t('快捷换算已应用', 'Shortcuts applied.'));
        } catch (err) {
            console.error(err);
            setMessage(t('应用失败', 'Failed to apply shortcuts.'));
        }
    };

    const isSuccessMessage = /success|成功/i.test(message);

    return (
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="neumorphic-inset rounded-[2.5rem] p-6 space-y-6">
                <div>
                    <span className="text-[10px] font-mono font-bold text-brand-red tracking-[0.3em] uppercase block mb-1">
                        {t('系统配置', 'System Configuration')}
                    </span>
                    <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tight">{t('换算设置', 'Conversion Settings')}</h2>
                    <p className="text-gray-500 font-serif italic mt-1">{t('设置到 4 寸基准单位的换算', 'Define conversion rates to 4-inch base unit.')}</p>
                </div>

                {loadError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-bold">
                        {loadError}
                    </div>
                )}

                <div className="space-y-4">
                    {orderedProducts.map(p => (
                        <div key={p.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className="bg-gray-50/50 px-6 py-3 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-brand-red/10 text-brand-red flex items-center justify-center font-bold text-xs">
                                        {p.name_zh.charAt(0)}
                                    </div>
                                    <h3 className="font-bold text-gray-800">{p.name_zh}</h3>
                                </div>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white border border-gray-200 px-2 py-1 rounded-full">
                                    {categoryLabelMap[p.category] || p.category}
                                </span>
                            </div>

                            <div className="divide-y divide-gray-50">
                                {[...(p.variants || [])].sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999)).map(v => (
                                    <div key={v.id} className="px-6 py-3 flex items-center justify-between group hover:bg-gray-50 transition-colors">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-gray-700">{v.display_name_zh}</span>
                                            <span className="text-[10px] text-gray-400 uppercase tracking-wider">{containerLabels[v.container] || v.container}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {!v.conversion_to_base && (
                                                <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded-full mr-2">{t('缺失', 'Missing')}</span>
                                            )}
                                            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2 py-1 focus-within:border-brand-red/50 focus-within:ring-1 focus-within:ring-brand-red/20 transition-all">
                                                <span className="text-xs text-gray-400 font-bold">x</span>
                                                <input
                                                    type="number"
                                                    value={v.conversion_to_base || ''}
                                                    onChange={e => handleConversionChange(v, e.target.value)}
                                                    placeholder="0.0"
                                                    className="w-16 border-none p-0 text-right text-sm font-bold text-gray-800 bg-transparent focus:ring-0 placeholder-gray-300"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <aside className="flex flex-col gap-6">
                <div className="neumorphic-flat rounded-3xl p-6 flex flex-col gap-6 sticky top-6">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                        <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-[0.3em]">{t('快捷工具', 'Quick Tool')}</span>
                        <span className="material-symbols-outlined text-gray-400 text-lg">bolt</span>
                    </div>

                    <div>
                        <h4 className="font-bold text-gray-800 mb-1">{t('快捷换算', 'Scale Helper')}</h4>
                        <p className="text-xs text-gray-500">{t('为指定商品快速应用常用比例', 'Apply standard ratios to a product.')}</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">{t('目标商品', 'Target Product')}</label>
                            <div className="relative">
                                <select
                                    className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-red/30 focus:ring-2 focus:ring-brand-red/10 transition-all"
                                    value={shortcutProductId}
                                    onChange={e => setShortcutProductId(e.target.value)}
                                >
                                    <option value="">{t('选择商品', 'Select product...')}</option>
                                    {orderedProducts.map(p => (
                                        <option key={p.id} value={p.id}>{p.name_zh}</option>
                                    ))}
                                </select>
                                <span className="material-symbols-outlined absolute right-3 top-3.5 text-gray-400 pointer-events-none text-lg">expand_more</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {[
                                { label: t('1 箱 = ? 基准', '1 Case = ? Base'), val: caseTo4, set: setCaseTo4 },
                                { label: t('1 袋 = ? 基准', '1 Bag = ? Base'), val: bagTo4, set: setBagTo4 },
                                { label: t('1 小盒 = ? 基准', '1 Small Box = ? Base'), val: box2To4, set: setBox2To4 },
                            ].map((field, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-3 py-2">
                                    <span className="text-xs font-semibold text-gray-500">{field.label}</span>
                                    <input
                                        type="number"
                                        className="w-20 text-right text-sm font-bold text-gray-800 border-none bg-transparent p-0 focus:ring-0 placeholder-gray-300"
                                        placeholder="-"
                                        value={field.val}
                                        onChange={e => field.set(e.target.value)}
                                    />
                                </div>
                            ))}
                        </div>

                        <button
                            className="w-full bg-gray-800 hover:bg-black text-white py-3 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                            onClick={handleApplyShortcut}
                        >
                            <span className="material-symbols-outlined text-sm">auto_fix_high</span>
                            {t('应用比例', 'Apply Ratios')}
                        </button>

                        {message && (
                            <div className={cn("text-xs font-bold text-center p-2 rounded-lg", isSuccessMessage ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
                                {message}
                            </div>
                        )}
                    </div>
                </div>
            </aside>
        </div>
    );
}

export default ConversionSetup;

