import React, { useEffect, useState, useMemo } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    ChevronDown,
    GripVertical,
    Minus,
    Plus,
    Trash2,
    Search,
    Calendar,
    Save,
    Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { getProducts, saveDailyCount, updateProduct } from '../api';

// --- Utility Components ---
function cn(...inputs) {
    return twMerge(clsx(inputs));
}

// --- Sortable Item Component ---
function SortableProductCard({
    product,
    entries,
    selections,
    variants,
    onUpdateEntry,
    onAddEntry,
    onRemoveEntry,
    containerLabels
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: product.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        position: 'relative',
    };

    const hasVariants = variants.length > 0;
    const selectedIds = new Set(entries.map(e => e.variantId).filter(Boolean));

    return (
        <div ref={setNodeRef} style={style} className={cn("group mb-4", isDragging && "opacity-50")}>
            <div className={cn(
                "overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200",
                isDragging ? "border-[#C5A572] shadow-lg ring-1 ring-[#C5A572]" : "border-gray-100 hover:border-[#C5A572]/30 hover:shadow-md"
            )}>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-50 bg-gray-50/50 px-4 py-3">
                    <div className="flex items-center gap-3">
                        <div
                            {...attributes}
                            {...listeners}
                            className="flex h-8 w-8 cursor-grab items-center justify-center rounded-lg text-gray-400 opacity-0 transition-all hover:bg-gray-200 active:cursor-grabbing group-hover:opacity-100"
                        >
                            <GripVertical className="h-4 w-4" />
                        </div>
                        <span className="font-semibold text-gray-900">{product.name_zh}</span>
                        {product.name_en && (
                            <span className="text-xs text-gray-400 hidden sm:inline-block">{product.name_en}</span>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="divide-y divide-gray-50 p-4">
                    <AnimatePresence initial={false}>
                        {entries.map((entry, index) => {
                            const currentVariantId = entry.variantId || (variants[0] ? variants[0].id : '');
                            const qtyValue = entry.qty === '' ? '' : Number(entry.qty);

                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 md:flex-row md:items-center"
                                >
                                    {/* Variant Select */}
                                    <div className="relative flex-1">
                                        <select
                                            value={currentVariantId}
                                            onChange={e => {
                                                const nextId = parseInt(e.target.value);
                                                onUpdateEntry(product.id, index, { variantId: Number.isNaN(nextId) ? '' : nextId });
                                            }}
                                            disabled={!hasVariants}
                                            className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 transition-colors focus:border-[#C5A572] focus:outline-none focus:ring-1 focus:ring-[#C5A572]"
                                        >
                                            {variants.length === 0 && <option value="">无规格</option>}
                                            {variants.map(v => (
                                                <option key={v.id} value={v.id} disabled={selectedIds.has(v.id) && v.id !== currentVariantId}>
                                                    {v.display_name_zh} ({containerLabels[v.container] || v.container})
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    </div>

                                    {/* Qty & Actions */}
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50/50 p-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const current = parseFloat(entry.qty) || 0;
                                                    const next = Math.max(0, current - 1);
                                                    onUpdateEntry(product.id, index, { qty: String(next) });
                                                }}
                                                disabled={!hasVariants}
                                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-gray-600 shadow-sm transition-transform active:scale-95 disabled:opacity-50 hover:text-[#C5A572]"
                                            >
                                                <Minus className="h-3.5 w-3.5" />
                                            </button>
                                            <input
                                                type="number"
                                                className="w-16 bg-transparent text-center text-sm font-semibold text-gray-900 focus:outline-none"
                                                placeholder="0"
                                                value={qtyValue}
                                                onChange={e => onUpdateEntry(product.id, index, { qty: e.target.value })}
                                                disabled={!hasVariants}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const current = parseFloat(entry.qty) || 0;
                                                    const next = current + 1;
                                                    onUpdateEntry(product.id, index, { qty: String(next) });
                                                }}
                                                disabled={!hasVariants}
                                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-gray-600 shadow-sm transition-transform active:scale-95 disabled:opacity-50 hover:text-[#C5A572]"
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                            </button>
                                        </div>

                                        {entries.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => onRemoveEntry(product.id, index)}
                                                className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>

                {/* Footer Action */}
                <div className="border-t border-gray-50 bg-gray-50/30 px-4 py-2">
                    <button
                        type="button"
                        onClick={() => onAddEntry(product.id, variants, selectedIds)}
                        disabled={!hasVariants}
                        className="text-xs font-semibold text-[#bfa070] transition-colors hover:text-[#a0845a] disabled:opacity-50"
                    >
                        + 添加规格
                    </button>
                </div>
            </div>
        </div>
    );
}


function DailyCount() {
    // --- State ---
    const [products, setProducts] = useState([]);
    const [selections, setSelections] = useState({});
    const [search, setSearch] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState('');

    // --- Refs / Local Logic ---
    const [lastVariantMap, setLastVariantMap] = useState(() => {
        try {
            const stored = localStorage.getItem('m2go:lastVariantByProduct');
            return stored ? JSON.parse(stored) : {};
        } catch { return {}; }
    });

    // Use stable IDs for category order logic from local storage
    const defaultCategoryOrder = ['protein', 'veg', 'frozen'];

    // --- Constants ---
    const categoryLabels = { protein: '蛋白', veg: '蔬菜', frozen: '冷冻' };
    const containerLabels = { case: '整箱', bag: '袋子', box_2inch: '2寸盒', box_4inch: '4寸盒' };

    // --- Dnd Base Configuration ---
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // Prevent accidental drags
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // --- Effects ---
    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const data = await getProducts();
            setProducts(Array.isArray(data) ? data : []);
        } catch (err) {
            setError('加载失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    // --- Derived State ---
    const filteredProducts = useMemo(() => {
        if (!search.trim()) return products;
        const q = search.toLowerCase();
        return products.filter(p =>
            (p.name_zh || '').toLowerCase().includes(q) ||
            (p.name_en || '').toLowerCase().includes(q)
        );
    }, [products, search]);

    const groupedProducts = useMemo(() => {
        const groups = {};
        // Initialize groups based on default order + extras
        const cats = new Set([...defaultCategoryOrder, ...filteredProducts.map(p => p.category)]);

        cats.forEach(c => groups[c] = []);
        filteredProducts.forEach(p => {
            if (!groups[p.category]) groups[p.category] = [];
            groups[p.category].push(p);
        });

        // Ensure internal sort within groups (by sort_order)
        Object.keys(groups).forEach(cat => {
            groups[cat].sort((a, b) => {
                const aOrder = a.sort_order ?? 9999;
                const bOrder = b.sort_order ?? 9999;
                return aOrder - bOrder || (a.name_zh || '').localeCompare(b.name_zh || '');
            });
        });

        return groups;
    }, [filteredProducts]);

    // --- Business Logic Helpers ---
    const getVariantOptions = (product) => {
        const variants = Array.isArray(product.variants) ? product.variants : [];
        return [...variants].sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999));
    };

    const getEntries = (productId, variants) => {
        if (selections[productId] && selections[productId].length > 0) return selections[productId];

        // Logic to pre-fill based on history or defaults
        const rememberedId = lastVariantMap[productId];
        const validRemembered = variants.find(v => v.id === rememberedId);
        if (validRemembered) return [{ variantId: validRemembered.id, qty: '' }];

        const rawVariant = variants.find(v => v.form === 'RAW') || variants[0];
        const cookedVariant = variants.find(v => v.form === 'COOKED_CHILL' && v.container === 'case');

        const defaults = [];
        if (rawVariant) defaults.push({ variantId: rawVariant.id, qty: '' });
        if (cookedVariant && cookedVariant.id !== rawVariant?.id) defaults.push({ variantId: cookedVariant.id, qty: '' });

        return defaults.length ? defaults : [{ variantId: '', qty: '' }];
    };

    // --- Event Handlers ---
    const handleUpdateEntry = (productId, index, patch) => {
        const product = products.find(p => p.id === productId);
        const variants = getVariantOptions(product);
        const fallback = variants[0]?.id || '';

        setSelections(prev => {
            const list = prev[productId] ? [...prev[productId]] : getEntries(productId, variants);
            // Ensure we are working with a valid list even if state was empty (first interaction)
            if (!prev[productId] && list.length === 0) {
                // Should not happen due to getEntries logic but safe guard
                list.push({ variantId: fallback, qty: '' });
            }
            list[index] = { ...list[index], ...patch };
            return { ...prev, [productId]: list };
        });
    };

    const handleAddEntry = (productId, variants, selectedIds) => {
        const fallback = variants.find(v => !selectedIds.has(v.id)) || variants[0];
        if (!fallback) return;

        setSelections(prev => {
            const list = prev[productId] ? [...prev[productId]] : getEntries(productId, variants);
            list.push({ variantId: fallback.id, qty: '' });
            return { ...prev, [productId]: list };
        });
    };

    const handleRemoveEntry = (productId, index) => {
        const product = products.find(p => p.id === productId);
        const variants = getVariantOptions(product);
        const fallback = variants[0]?.id || '';

        setSelections(prev => {
            const list = prev[productId] ? [...prev[productId]] : getEntries(productId, variants);
            list.splice(index, 1);
            if (list.length === 0) return { ...prev, [productId]: [{ variantId: fallback, qty: '' }] };
            return { ...prev, [productId]: list };
        });
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const activeProduct = products.find(p => p.id === active.id);
        const overProduct = products.find(p => p.id === over.id);

        if (!activeProduct || !overProduct || activeProduct.category !== overProduct.category) return;

        const category = activeProduct.category;
        const currentGroup = groupedProducts[category];
        const oldIndex = currentGroup.findIndex(p => p.id === active.id);
        const newIndex = currentGroup.findIndex(p => p.id === over.id);

        const newGroupOrder = arrayMove(currentGroup, oldIndex, newIndex);

        // Optimistic Update
        const newProducts = [...products];
        // We need to update existing items with their new sort order
        // Map ID -> new Order
        const orderMap = new Map(newGroupOrder.map((p, idx) => [p.id, idx + 1]));

        setProducts(prev => prev.map(p => {
            if (p.category === category && orderMap.has(p.id)) {
                return { ...p, sort_order: orderMap.get(p.id) };
            }
            return p;
        }));

        // Send to backend
        try {
            await Promise.all(newGroupOrder.map((p, idx) =>
                updateProduct(p.id, { sort_order: idx + 1 })
            ));
        } catch (err) {
            console.error("Failed to reorder:", err);
            setError("排序保存失败");
            // Revert would go here in a full robust app
        }
    };

    const handleSubmit = async () => {
        setSaveLoading(true);
        setMessage('');
        try {
            // Flatten selections logic
            const promises = [];

            // We need to iterate all products to include those that might not be in 'selections' state 
            // but have default entries visible. Wait, the state `selections` only populates on interaction.
            // If user didn't touch a product, no entry is saved? Correct.
            // "getEntries" returns UI state, but if it's not in `selections`, it means user touched nothing.
            // HOWEVER: If user "sees" defaults and wants to save them as 0, they usually type 0.
            // Requirement logic: "entered qty". Empty string = ignore.

            Object.keys(selections).forEach(productId => {
                const entries = selections[productId];
                entries.forEach(entry => {
                    const qty = parseFloat(entry.qty);
                    if (!entry.variantId || isNaN(qty)) return;
                    promises.push(saveDailyCount({
                        date: date,
                        variant_id: parseInt(entry.variantId),
                        counted_qty: qty
                    }));
                });
            });

            if (promises.length === 0) {
                setMessage('没有填写任何数量');
                setSaveLoading(false);
                return;
            }

            await Promise.all(promises);

            // Update "last used" map
            const newMap = { ...lastVariantMap };
            Object.entries(selections).forEach(([pid, entries]) => {
                const valid = entries.filter(e => !isNaN(parseFloat(e.qty)));
                if (valid.length === 1) newMap[pid] = valid[0].variantId;
                else if (valid.length > 1) delete newMap[pid];
            });
            localStorage.setItem('m2go:lastVariantByProduct', JSON.stringify(newMap));
            setLastVariantMap(newMap);

            setMessage('盘点提交成功！');
            setSelections({});

            // Auto hide success message
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            console.error(err);
            setError('保存失败，请重试');
        } finally {
            setSaveLoading(false);
        }
    };


    // --- Render ---
    if (loading && products.length === 0) {
        return <div className="flex h-64 items-center justify-center text-gray-400"><Loader2 className="animate-spin" /></div>;
    }

    const orderedCategories = ['protein', 'veg', 'frozen'].filter(c => groupedProducts[c]?.length > 0);
    // Add any other categories that might exist
    Object.keys(groupedProducts).forEach(c => {
        if (!orderedCategories.includes(c) && groupedProducts[c]?.length > 0) orderedCategories.push(c);
    });

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <div className="mx-auto max-w-3xl space-y-8 pb-20">
                {/* Header Section */}
                <div className="sticky top-0 z-40 -mx-6 bg-[#FDFBF7]/95 px-6 py-4 backdrop-blur-md transition-all">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-gray-900">每日盘点</h2>
                            <p className="text-xs text-gray-500">记得定期保存哦</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="date"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm font-medium text-gray-700 shadow-sm focus:border-[#C5A572] focus:outline-none focus:ring-1 focus:ring-[#C5A572]"
                                />
                            </div>
                            <button
                                onClick={handleSubmit}
                                disabled={saveLoading}
                                className={cn(
                                    "flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:bg-gray-800 hover:shadow-lg active:scale-95 disabled:opacity-70",
                                    message && "bg-green-600 hover:bg-green-700"
                                )}
                            >
                                {saveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                {message ? '已保存！' : '保存'}
                            </button>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="mt-4 relative">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="搜索商品..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm shadow-sm transition-all placeholder:text-gray-400 focus:border-[#C5A572] focus:outline-none focus:ring-1 focus:ring-[#C5A572]"
                        />
                    </div>
                    {error && <div className="mt-2 text-xs font-semibold text-red-500">{error}</div>}
                </div>


                {/* Categories List */}
                <div className="space-y-8">
                    {orderedCategories.map(cat => (
                        <div key={cat} className="space-y-3">
                            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-400">
                                <span className="h-px flex-1 bg-gray-200"></span>
                                {categoryLabels[cat] || cat}
                                <span className="h-px flex-1 bg-gray-200"></span>
                            </h3>

                            <SortableContext
                                items={groupedProducts[cat].map(p => p.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {groupedProducts[cat].map(product => (
                                    <SortableProductCard
                                        key={product.id}
                                        product={product}
                                        variants={getVariantOptions(product)}
                                        selections={selections}
                                        entries={getEntries(product.id, getVariantOptions(product))}
                                        onUpdateEntry={handleUpdateEntry}
                                        onAddEntry={handleAddEntry}
                                        onRemoveEntry={handleRemoveEntry}
                                        containerLabels={containerLabels}
                                    />
                                ))}
                            </SortableContext>
                        </div>
                    ))}

                    {orderedCategories.length === 0 && (
                        <div className="py-20 text-center text-gray-400">
                            <p>没有找到相关商品</p>
                        </div>
                    )}
                </div>
            </div>
        </DndContext>
    );
}

export default DailyCount;
