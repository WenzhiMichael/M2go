import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, GripVertical, Minus, Plus, Trash2 } from 'lucide-react';
import { getProducts, saveDailyCount, updateProduct } from '../api';

function DailyCount() {
    const [products, setProducts] = useState([]);
    const [selections, setSelections] = useState({});
    const [search, setSearch] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [loadError, setLoadError] = useState('');
    const [draggingId, setDraggingId] = useState(null);
    const rowRefs = useRef({});
    const positionsRef = useRef(new Map());
    const hasMountedRef = useRef(false);
    const dragCategoryRef = useRef(null);
    const dragOverRef = useRef(null);
    const originalOrderRef = useRef({});
    const productsRef = useRef([]);
    const [lastVariantMap, setLastVariantMap] = useState(() => {
        try {
            const stored = localStorage.getItem('m2go:lastVariantByProduct');
            return stored ? JSON.parse(stored) : {};
        } catch (err) {
            console.error(err);
            return {};
        }
    });
    const categoryLabels = { protein: '蛋白', veg: '蔬菜', frozen: '冷冻' };
    const containerLabels = { case: '整箱', bag: '袋子', box_2inch: '2寸盒', box_4inch: '4寸盒' };
    const defaultCategoryOrder = ['protein', 'veg', 'frozen'];
    const canReorder = !search.trim();

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

    useEffect(() => {
        productsRef.current = products;
    }, [products]);

    useLayoutEffect(() => {
        if (!hasMountedRef.current) {
            hasMountedRef.current = true;
            return;
        }
        const prevPositions = positionsRef.current;
        const nextPositions = new Map();
        Object.entries(rowRefs.current).forEach(([id, node]) => {
            if (node) {
                nextPositions.set(Number(id), node.getBoundingClientRect());
            }
        });

        nextPositions.forEach((newRect, id) => {
            const prevRect = prevPositions.get(id);
            if (!prevRect) return;
            const deltaY = prevRect.top - newRect.top;
            if (Math.abs(deltaY) < 1) return;
            const node = rowRefs.current[id];
            if (!node) return;
            node.style.transform = `translateY(${deltaY}px)`;
            node.style.transition = 'transform 0s';
            requestAnimationFrame(() => {
                node.style.transition = 'transform 160ms ease';
                node.style.transform = '';
            });
        });

        positionsRef.current = nextPositions;
    }, [products]);


    async function loadProducts() {
        try {
            setLoadError('');
            const data = await getProducts();
            setProducts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            setLoadError('商品加载失败，请确认后端已启动');
            setProducts([]);
        }
    }

    const getVariantOptions = (product) => {
        const variants = Array.isArray(product.variants) ? product.variants : [];
        return [...variants].sort((a, b) => {
            const aOrder = Number.isFinite(a.sort_order) ? a.sort_order : 9999;
            const bOrder = Number.isFinite(b.sort_order) ? b.sort_order : 9999;
            if (aOrder !== bOrder) return aOrder - bOrder;
            return (a.display_name_zh || '').localeCompare(b.display_name_zh || '', 'zh');
        });
    };

    const capturePositions = () => {
        const map = new Map();
        Object.entries(rowRefs.current).forEach(([id, node]) => {
            if (node) {
                map.set(Number(id), node.getBoundingClientRect());
            }
        });
        positionsRef.current = map;
    };


    const sortProducts = (list) => [...list].sort((a, b) => {
        const aOrder = Number.isFinite(a.sort_order) ? a.sort_order : 9999;
        const bOrder = Number.isFinite(b.sort_order) ? b.sort_order : 9999;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return (a.name_zh || '').localeCompare(b.name_zh || '', 'zh');
    });


    const reorderWithinCategory = (category, activeId, overId) => {
        setProducts((prev) => {
            const list = sortProducts(prev.filter(p => p.category === category));
            const fromIndex = list.findIndex(p => p.id === activeId);
            const toIndex = list.findIndex(p => p.id === overId);
            if (fromIndex === -1 || toIndex === -1) return prev;
            const nextList = [...list];
            const [moved] = nextList.splice(fromIndex, 1);
            nextList.splice(toIndex, 0, moved);
            const orderMap = new Map(nextList.map((p, idx) => [p.id, idx + 1]));
            return prev.map(p => (
                p.category !== category ? p : { ...p, sort_order: orderMap.get(p.id) }
            ));
        });
    };

    const handleDragStart = (product) => (event) => {
        if (!canReorder) return;
        dragCategoryRef.current = product.category;
        dragOverRef.current = null;
        originalOrderRef.current = productsRef.current.reduce((acc, item) => {
            if (item.category === product.category) {
                acc[item.id] = Number.isFinite(item.sort_order) ? item.sort_order : null;
            }
            return acc;
        }, {});
        setDraggingId(product.id);
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(product.id));
    };

    const handleDragOver = (product) => (event) => {
        if (!canReorder) return;
        event.preventDefault();
        const dragging = draggingId ?? Number(event.dataTransfer.getData('text/plain'));
        if (!dragging || dragging === product.id) return;
        if (product.category !== dragCategoryRef.current) return;
        if (dragOverRef.current === product.id) return;
        dragOverRef.current = product.id;
        capturePositions();
        reorderWithinCategory(product.category, dragging, product.id);
    };

    const handleDragEnd = async () => {
        if (!canReorder) return;
        setDraggingId(null);
        dragOverRef.current = null;
        const original = originalOrderRef.current;
        if (!original || Object.keys(original).length === 0) return;
        const current = productsRef.current;
        const changed = current.filter(p => original[p.id] !== undefined && (p.sort_order ?? null) !== original[p.id]);
        if (changed.length === 0) return;
        try {
            await Promise.all(changed.map(p => updateProduct(p.id, {
                name_zh: p.name_zh,
                name_en: p.name_en,
                category: p.category,
                storage_type: p.storage_type,
                supplier: p.supplier || null,
                case_pack: p.case_pack ?? null,
                min_order_qty: p.min_order_qty ?? null,
                sort_order: p.sort_order ?? null,
                is_active: p.is_active !== false
            })));
            setMessage('顺序已保存');
        } catch (err) {
            console.error(err);
            setMessage('顺序保存失败');
        }
    };

    const getEntries = (productId, variants) => {
        const existing = selections[productId];
        if (existing && existing.length > 0) return existing;
        const rememberedId = lastVariantMap[productId];
        const validRemembered = variants.find(v => v.id === rememberedId);
        if (validRemembered) {
            return [{ variantId: validRemembered.id, qty: '' }];
        }
        const rawVariant = variants.find(v => v.form === 'RAW') || variants[0];
        const cookedVariant = variants.find(v => v.form === 'COOKED_CHILL' && v.container === 'case')
            || variants.find(v => v.form === 'COOKED_CHILL');
        const defaults = [];
        if (rawVariant) defaults.push({ variantId: rawVariant.id, qty: '' });
        if (cookedVariant && cookedVariant.id !== rawVariant?.id) {
            defaults.push({ variantId: cookedVariant.id, qty: '' });
        }
        return defaults.length > 0 ? defaults : [{ variantId: '', qty: '' }];
    };

    const updateEntry = (productId, index, variants, patch) => {
        const fallback = variants[0] ? variants[0].id : '';
        setSelections((prev) => {
            const list = prev[productId] ? [...prev[productId]] : [{ variantId: fallback, qty: '' }];
            list[index] = { ...list[index], ...patch };
            return { ...prev, [productId]: list };
        });
    };

    const addEntry = (productId, variants, selectedIds) => {
        const fallback = variants.find(v => !selectedIds.has(v.id)) || variants[0];
        if (!fallback) return;
        setSelections((prev) => {
            const list = prev[productId] ? [...prev[productId]] : [];
            list.push({ variantId: fallback.id, qty: '' });
            return { ...prev, [productId]: list };
        });
    };

    const removeEntry = (productId, index, variants) => {
        const fallback = variants[0] ? variants[0].id : '';
        setSelections((prev) => {
            const list = prev[productId] ? [...prev[productId]] : [];
            list.splice(index, 1);
            if (list.length === 0) {
                return { ...prev, [productId]: [{ variantId: fallback, qty: '' }] };
            }
            return { ...prev, [productId]: list };
        });
    };

    const handleSubmit = async () => {
        setLoading(true);
        setMessage('');
        try {
            const promises = Object.values(selections).flatMap(entries => {
                return entries.map(entry => {
                    const qty = parseFloat(entry.qty);
                    if (!entry.variantId || isNaN(qty)) return null;
                    return saveDailyCount({
                        date: date,
                        variant_id: parseInt(entry.variantId),
                        counted_qty: qty
                    });
                });
            }).filter(p => p !== null);

            await Promise.all(promises);
            // 记住上次填写的规格：仅当该商品本次只填写了一个规格时
            const updatedMap = { ...lastVariantMap };
            Object.entries(selections).forEach(([productId, entries]) => {
                const filled = entries.filter(entry => !isNaN(parseFloat(entry.qty)));
                if (filled.length === 1) {
                    updatedMap[productId] = filled[0].variantId;
                } else if (filled.length > 1) {
                    delete updatedMap[productId];
                }
            });
            try {
                localStorage.setItem('m2go:lastVariantByProduct', JSON.stringify(updatedMap));
            } catch (err) {
                console.error(err);
            }
            setLastVariantMap(updatedMap);
            setMessage('盘点已保存');
            setSelections({});
        } catch (err) {
            console.error(err);
            setMessage('保存失败');
        }
        setLoading(false);
    };

    // Group products by category
    const filteredProducts = products.filter(p => {
        if (!search.trim()) return true;
        const keyword = search.trim().toLowerCase();
        const zh = (p.name_zh || '').toLowerCase();
        const en = (p.name_en || '').toLowerCase();
        return (
            zh.includes(keyword) ||
            en.includes(keyword)
        );
    });

    const grouped = filteredProducts.reduce((acc, p) => {
        acc[p.category] = acc[p.category] || [];
        acc[p.category].push(p);
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <h2 className="text-2xl font-semibold text-gray-900">每日盘点</h2>
                <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-sm font-semibold">日期:</span>
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="rounded-xl border border-[#C5A572] bg-white px-4 py-2 text-sm text-gray-900"
                    />
                </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="w-full md:max-w-2xl">
                    <input
                        type="text"
                        placeholder="搜索商品 (中文/英文)"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full rounded-xl border border-[#C5A572] bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-500"
                    />
                </div>
                <div className="text-sm text-gray-600">每个商品可添加多个规格一起保存（拖动≡可调整顺序）</div>
            </div>

            {loadError && (
                <div className="rounded-xl border border-[#C5A572] bg-white px-4 py-3 text-sm text-red-700">
                    {loadError}
                </div>
            )}

            {!loadError && products.length === 0 && (
                <div className="rounded-xl border border-[#C5A572] bg-white px-4 py-3 text-sm text-gray-600">
                    暂无商品，请先在“商品与规格管理”中添加
                </div>
            )}

            {[
                ...getCategoryOrder().filter(cat => grouped[cat]),
                ...Object.keys(grouped).filter(cat => !getCategoryOrder().includes(cat))
            ].map(cat => (
                <div key={cat} className="space-y-4">
                    <div className="text-sm font-semibold text-gray-700">{categoryLabels[cat] || cat}</div>
                    {[...(grouped[cat] || [])].sort((a, b) => {
                        const aOrder = Number.isFinite(a.sort_order) ? a.sort_order : 9999;
                        const bOrder = Number.isFinite(b.sort_order) ? b.sort_order : 9999;
                        if (aOrder !== bOrder) return aOrder - bOrder;
                        return (a.name_zh || '').localeCompare(b.name_zh || '', 'zh');
                    }).map(p => {
                        const variants = getVariantOptions(p);
                        const hasVariants = variants.length > 0;
                        const entries = getEntries(p.id, variants);
                        const selectedIds = new Set(entries.map(entry => entry.variantId).filter(Boolean));
                        return (
                            <div
                                key={p.id}
                                className={`drag-card overflow-hidden rounded-2xl border border-[#C5A572]/40 bg-white shadow-sm ${draggingId === p.id ? 'dragging' : ''}`}
                                onDragOver={handleDragOver(p)}
                                ref={(node) => {
                                    if (node) {
                                        rowRefs.current[p.id] = node;
                                    } else {
                                        delete rowRefs.current[p.id];
                                    }
                                }}
                            >
                                <div className="flex items-center justify-between bg-gray-900 px-4 py-3 text-white">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#C5A572] text-[#C5A572]"
                                            draggable={canReorder}
                                            onDragStart={handleDragStart(p)}
                                            onDragEnd={handleDragEnd}
                                            title="拖动排序"
                                        >
                                            <GripVertical className="h-4 w-4" />
                                        </span>
                                        <span className="font-semibold">{p.name_zh}</span>
                                    </div>
                                </div>

                                <div className="divide-y divide-gray-100 bg-white">
                                    {entries.map((entry, index) => {
                                        const currentVariantId = entry.variantId || (variants[0] ? variants[0].id : '');
                                        const qtyValue = entry.qty === '' ? '' : Number(entry.qty);
                                        return (
                                            <div key={`${p.id}-${index}`} className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center">
                                                <div className="relative flex-1">
                                                    <select
                                                        value={currentVariantId}
                                                        onChange={e => {
                                                            const nextId = parseInt(e.target.value);
                                                            updateEntry(p.id, index, variants, { variantId: Number.isNaN(nextId) ? '' : nextId });
                                                        }}
                                                        disabled={!hasVariants}
                                                        className="w-full appearance-none rounded-xl border border-[#C5A572] bg-white px-4 py-2 pr-10 text-sm text-gray-900"
                                                    >
                                                        {variants.length === 0 && <option value="">无规格</option>}
                                                        {variants.map(v => (
                                                            <option key={v.id} value={v.id} disabled={selectedIds.has(v.id) && v.id !== currentVariantId}>
                                                                {v.display_name_zh} ({containerLabels[v.container] || v.container})
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C5A572]" />
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#C5A572] bg-[#FDFBF7] text-[#7a5b2b]"
                                                        onClick={() => {
                                                            const current = parseFloat(entry.qty) || 0;
                                                            const next = Math.max(0, current - 1);
                                                            updateEntry(p.id, index, variants, { qty: String(next) });
                                                        }}
                                                        disabled={!hasVariants}
                                                    >
                                                        <Minus className="h-4 w-4" />
                                                    </button>
                                                    <input
                                                        type="number"
                                                        className="w-20 rounded-lg border border-[#C5A572] px-3 py-2 text-center text-sm font-semibold text-gray-900"
                                                        placeholder="数量"
                                                        value={qtyValue}
                                                        onChange={e => updateEntry(p.id, index, variants, { qty: e.target.value })}
                                                        disabled={!hasVariants}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#C5A572] bg-[#FDFBF7] text-[#7a5b2b]"
                                                        onClick={() => {
                                                            const current = parseFloat(entry.qty) || 0;
                                                            const next = current + 1;
                                                            updateEntry(p.id, index, variants, { qty: String(next) });
                                                        }}
                                                        disabled={!hasVariants}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </button>
                                                </div>

                                                {entries.length > 1 && (
                                                    <button
                                                        type="button"
                                                        className="inline-flex items-center gap-1 rounded-lg border border-[#C5A572] px-3 py-2 text-sm font-semibold text-[#8b6b3f] hover:bg-[#FFF6E8]"
                                                        onClick={() => removeEntry(p.id, index, variants)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        移除
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="bg-[#FDFBF7] px-4 py-3">
                                    <button
                                        type="button"
                                        className="rounded-xl border border-[#C5A572] px-4 py-2 text-sm font-semibold text-[#8b6b3f] hover:bg-white"
                                        onClick={() => addEntry(p.id, variants, selectedIds)}
                                        disabled={!hasVariants}
                                    >
                                        添加规格
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ))}

            <div className="flex flex-col items-center gap-3 pt-4">
                <button
                    className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-gray-800"
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading ? '保存中...' : '保存盘点'}
                </button>
                {message && <div className="text-sm font-semibold text-gray-700">{message}</div>}
            </div>
        </div>
    );
}

export default DailyCount;
