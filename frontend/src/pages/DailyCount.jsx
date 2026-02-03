import React, { useEffect, useState, useMemo } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { getProducts, saveDailyCount, updateProduct } from '../api';
import { useLang } from '../i18n';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

function SortableProductCard({
    product,
    variants,
    selections,
    onUpdateEntry,
    isActive,
    onFocus,
    containerLabelMap,
    t
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

    const imageUrl = product.image_url || null;
    const productId = product.id;
    const entries = selections[productId] && selections[productId].length > 0
        ? selections[productId]
        : [{ variantId: variants[0]?.id || '', qty: '' }];

    const primaryContainer = variants[0]?.container;
    const containerLabel = primaryContainer
        ? (containerLabelMap[primaryContainer] || primaryContainer)
        : t('单位', 'Unit');

    return (
        <div ref={setNodeRef} style={style} className={cn("group transition-transform", isDragging && "z-50 opacity-80")}>
            <div
                className={cn(
                    "p-6 flex flex-col sm:flex-row items-center gap-6 transition-all border border-transparent rounded-2xl",
                    isActive ? "bg-white shadow-lg border-brand-red/10 ring-1 ring-brand-red/20" : "hover:bg-white/80 bg-white/40 shadow-sm"
                )}
                onClick={() => onFocus(product.id)}
            >
                <div
                    {...attributes}
                    {...listeners}
                    className="w-16 h-16 rounded-full border-2 border-white shadow-sm overflow-hidden flex-shrink-0 relative cursor-grab active:cursor-grabbing"
                >
                    {imageUrl ? (
                        <img src={imageUrl} alt={product.name_zh} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400">
                            {t('无图', 'No image')}
                        </div>
                    )}
                </div>

                <div className="flex-grow text-center sm:text-left space-y-1">
                    <h4 className="font-black text-gray-800 text-lg leading-tight">{product.name_zh}</h4>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">
                        {containerLabel} / ID: {product.id.toString().padStart(3, '0')}
                    </p>
                </div>

                <div className="flex flex-col gap-2 w-full sm:w-auto">
                    {entries.map((entry, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-white p-1 rounded-full border border-gray-200 shadow-sm">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const next = Math.max(0, (parseFloat(entry.qty) || 0) - 1);
                                    onUpdateEntry(product.id, idx, { qty: String(next) });
                                }}
                                className="w-10 h-10 rounded-full bg-gray-50 hover:bg-brand-red hover:text-white text-gray-600 transition-colors flex items-center justify-center"
                                aria-label={t('减少数量', 'Decrease quantity')}
                            >
                                <span className="material-symbols-outlined text-lg">remove</span>
                            </button>

                            <input
                                type="number"
                                value={entry.qty}
                                placeholder={isActive ? "|" : "0"}
                                onChange={(e) => onUpdateEntry(product.id, idx, { qty: e.target.value })}
                                onFocus={() => onFocus(product.id)}
                                className="w-20 text-center border-none bg-transparent font-black text-xl text-brand-red focus:ring-0 p-0 placeholder-gray-300"
                                inputMode="decimal"
                                min="0"
                                aria-label={`${product.name_zh} ${containerLabel}`}
                            />

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const next = (parseFloat(entry.qty) || 0) + 1;
                                    onUpdateEntry(product.id, idx, { qty: String(next) });
                                }}
                                className="w-10 h-10 rounded-full bg-gray-50 hover:bg-brand-red hover:text-white text-gray-600 transition-colors flex items-center justify-center"
                                aria-label={t('增加数量', 'Increase quantity')}
                            >
                                <span className="material-symbols-outlined text-lg">add</span>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function DailyCount() {
    const [products, setProducts] = useState([]);
    const [selections, setSelections] = useState({});
    const [search, setSearch] = useState('');
    const [activeProductId, setActiveProductId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [message, setMessage] = useState('');
    const { t } = useLang();

    const containerLabelMap = useMemo(() => ({
        case: t('箱', 'Case'),
        bag: t('袋', 'Bag'),
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

    const handleKeypad = (key) => {
        if (!activeProductId) return;

        const product = products.find(p => p.id === activeProductId);
        if (!product) return;

        const currentEntries = selections[activeProductId] || [{ variantId: product.variants?.[0]?.id, qty: '' }];
        const currentQty = String(currentEntries[0].qty || '');

        let newQty = currentQty;
        if (key === 'backspace') {
            newQty = currentQty.slice(0, -1);
        } else if (key === '.') {
            if (!currentQty.includes('.')) newQty = currentQty + '.';
        } else {
            newQty = currentQty + key;
        }

        const newEntries = [...currentEntries];
        newEntries[0] = { ...newEntries[0], qty: newQty };

        setSelections(prev => ({
            ...prev,
            [activeProductId]: newEntries
        }));
    };

    const handleNextItem = () => {
        if (!activeProductId) return;
        setActiveProductId(null);
    };

    useEffect(() => {
        setLoading(true);
        getProducts().then(data => {
            setProducts(Array.isArray(data) ? data : []);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const filteredProducts = useMemo(() => {
        if (!search.trim()) return products;
        const q = search.toLowerCase();
        return products.filter(p => (p.name_zh || '').toLowerCase().includes(q));
    }, [products, search]);

    const groupedProducts = useMemo(() => {
        const groups = {};
        filteredProducts.forEach(p => {
            if (!groups[p.category]) groups[p.category] = [];
            groups[p.category].push(p);
        });
        Object.keys(groups).forEach(k => {
            groups[k].sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999));
        });
        return groups;
    }, [filteredProducts]);

    const categories = ['protein', 'veg', 'frozen', 'dry', 'sauce', 'other'];
    const orderedCategories = [...new Set([...categories, ...Object.keys(groupedProducts)])].filter(c => groupedProducts[c]?.length > 0);

    const activeProduct = products.find(p => p.id === activeProductId);
    const activeQty = activeProduct && selections[activeProduct.id] ? selections[activeProduct.id][0]?.qty : '';

    const totalItems = filteredProducts.length;
    const itemsCounted = Object.keys(selections).filter(pid => selections[pid].some(e => e.qty !== '')).length;
    const progressPercent = totalItems > 0 ? Math.round((itemsCounted / totalItems) * 100) : 0;

    const handleUpdateEntry = (pid, idx, patch) => {
        setSelections(prev => {
            const product = products.find(p => p.id === pid);
            const current = prev[pid] ? [...prev[pid]] : [{ variantId: product.variants?.[0]?.id, qty: '' }];
            current[idx] = { ...current[idx], ...patch };
            return { ...prev, [pid]: current };
        });
        setActiveProductId(pid);
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const activeItem = products.find(p => p.id === active.id);
        const overItem = products.find(p => p.id === over.id);

        if (activeItem && overItem && activeItem.category === overItem.category) {
            const category = activeItem.category;
            const items = groupedProducts[category];
            const oldIndex = items.findIndex(p => p.id === active.id);
            const newIndex = items.findIndex(p => p.id === over.id);

            const newOrder = arrayMove(items, oldIndex, newIndex);
            const newMap = new Map(newOrder.map((p, i) => [p.id, i + 1]));
            setProducts(prev => prev.map(p => newMap.has(p.id) ? { ...p, sort_order: newMap.get(p.id) } : p));

            await Promise.all(newOrder.map((p, i) => updateProduct(p.id, { sort_order: i + 1 })));
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleSubmit = async () => {
        setSaveLoading(true);
        try {
            const promises = [];
            Object.entries(selections).forEach(([pid, entries]) => {
                entries.forEach(e => {
                    const val = parseFloat(e.qty);
                    if (!isNaN(val)) {
                        promises.push(saveDailyCount({
                            date: new Date().toISOString().split('T')[0],
                            variant_id: e.variantId,
                            counted_qty: val
                        }));
                    }
                });
            });

            if (promises.length > 0) {
                await Promise.all(promises);
                setMessage(t('已保存', 'Saved'));
                setTimeout(() => setMessage(''), 3000);
                setSelections({});
                setActiveProductId(null);
            } else {
                setMessage(t('没有可保存的数量', 'No counts to save'));
                setTimeout(() => setMessage(''), 2000);
            }
        } catch (e) {
            console.error(e);
            setMessage(t('保存失败', 'Save failed'));
        } finally {
            setSaveLoading(false);
        }
    };

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="flex flex-col md:flex-row justify-between items-end border-b-2 border-brand-red/10 pb-6 mb-8">
                <div>
                    <h2 className="text-4xl lg:text-5xl font-black text-brand-red uppercase tracking-tight">{t('每日盘点', 'Daily Count')}</h2>
                    <p className="mt-2 text-gray-500 font-serif italic text-lg">{t('请在交班前核对实物库存', 'Please verify physical inventory before shift end.')}</p>
                </div>
                <div className="mt-4 md:mt-0 flex items-center space-x-4">
                    <div className="bg-white/60 backdrop-blur px-4 py-2 rounded-lg border border-brand-red/10 text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('日期', 'Date')}</p>
                        <p className="font-bold text-gray-800">{new Date().toLocaleDateString()}</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start">
                <div className="flex-1 space-y-8 w-full">
                    <div className="relative group">
                        <span className="material-symbols-outlined absolute left-4 top-3.5 text-gray-400 group-focus-within:text-brand-red transition-colors">search</span>
                        <input
                            type="text"
                            className="w-full pl-12 pr-4 py-3 rounded-xl border-none shadow-sm focus:ring-2 focus:ring-brand-red/20 bg-white placeholder-gray-400 text-sm font-bold"
                            placeholder={t('搜索食材', 'Search items')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            aria-label={t('搜索食材', 'Search items')}
                        />
                    </div>

                    {orderedCategories.map(cat => (
                        <section key={cat} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 relative group">
                            <div className="bg-brand-red/5 px-6 py-4 flex items-center justify-between border-b border-brand-red/10">
                                <h3 className="text-brand-red font-black uppercase tracking-wider flex items-center gap-3 text-lg">
                                    <span className="material-symbols-outlined">
                                        {cat === 'protein' ? 'restaurant' : cat === 'veg' ? 'eco' : 'inventory_2'}
                                    </span>
                                    {categoryLabelMap[cat] || cat}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('项', 'Items')}</span>
                                    <span className="bg-brand-red text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                        {groupedProducts[cat].length}
                                    </span>
                                </div>
                            </div>
                            <div className="divide-y divide-gray-50 bg-gray-50/50">
                                <SortableContext items={groupedProducts[cat].map(p => p.id)} strategy={verticalListSortingStrategy}>
                                    {groupedProducts[cat].map(product => (
                                        <SortableProductCard
                                            key={product.id}
                                            product={product}
                                            variants={product.variants || []}
                                            selections={selections}
                                            onUpdateEntry={handleUpdateEntry}
                                            onFocus={setActiveProductId}
                                            isActive={activeProductId === product.id}
                                            containerLabelMap={containerLabelMap}
                                            t={t}
                                        />
                                    ))}
                                </SortableContext>
                            </div>
                        </section>
                    ))}
                </div>

                <div className="lg:w-80 w-full lg:sticky lg:top-8 space-y-6">
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 p-6">
                        <div className="text-center mb-6 border-b border-gray-100 pb-4">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{t('快捷输入', 'Quick Input')}</p>
                            <div className="h-16 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200 mb-2">
                                <span className="text-4xl font-black text-brand-red">{activeQty || '--'}</span>
                                {activeProductId && <span className="animate-pulse text-brand-red ml-1">|</span>}
                            </div>
                            <p className="text-[10px] text-gray-400 truncate px-4">
                                {activeProductId
                                    ? t(`正在编辑：${activeProduct?.name_zh}`, `Editing: ${activeProduct?.name_zh}`)
                                    : t('请选择要编辑的项目', 'Select an item to edit')}
                            </p>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0].map(k => (
                                <button
                                    key={k}
                                    onClick={() => handleKeypad(String(k))}
                                    className="aspect-square rounded-xl bg-gray-50 hover:bg-gray-100 text-xl font-bold text-gray-700 transition-colors shadow-sm border border-gray-200 active:scale-95"
                                >
                                    {k}
                                </button>
                            ))}
                            <button
                                onClick={() => handleKeypad('backspace')}
                                className="aspect-square rounded-xl bg-red-50 hover:bg-red-100 text-xl font-bold text-brand-red transition-colors shadow-sm border border-red-100 active:scale-95 flex items-center justify-center"
                                aria-label={t('退格', 'Backspace')}
                            >
                                <span className="material-symbols-outlined">backspace</span>
                            </button>
                        </div>
                        <button
                            onClick={handleNextItem}
                            className="w-full btn-gradient py-4 rounded-xl text-white font-black uppercase tracking-widest shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 transform hover:-translate-y-1"
                        >
                            <span className="material-symbols-outlined">check</span>
                            {t('完成', 'Done')}
                        </button>
                    </div>

                    <div className="bg-brand-red text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
                        <h4 className="font-black uppercase tracking-widest text-sm relative z-10">{t('盘点进度', 'Count Progress')}</h4>
                        <div className="mt-4 relative z-10">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-4xl font-black">{progressPercent}%</span>
                                <span className="text-xs font-bold opacity-80 mb-1">{itemsCounted} / {totalItems} {t('项', 'Items')}</span>
                            </div>
                            <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden">
                                <div
                                    className="bg-white h-full rounded-full transition-all duration-500"
                                    style={{ width: `${progressPercent}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="mt-6 relative z-10">
                            <button
                                onClick={handleSubmit}
                                disabled={saveLoading}
                                className="w-full bg-white/10 hover:bg-white/20 py-3 rounded-lg text-xs font-bold uppercase tracking-wide border border-white/20 transition-colors flex items-center justify-center gap-2"
                            >
                                {saveLoading
                                    ? <span className="animate-spin material-symbols-outlined text-sm">refresh</span>
                                    : <span className="material-symbols-outlined text-sm">save</span>
                                }
                                {message || t('提交盘点', 'Submit Count')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </DndContext>
    );
}

export default DailyCount;

