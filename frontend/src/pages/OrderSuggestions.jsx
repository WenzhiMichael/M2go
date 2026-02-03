import React, { useEffect, useMemo, useState } from 'react';
import { createOrder, exportOrder, getOrderSuggestions } from '../api';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLang } from '../i18n';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

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

const formatNumber = (val) => {
    if (val === null || val === undefined || Number.isNaN(val)) return '-';
    return Number(val).toFixed(1);
};

const OrderCard = ({
    item,
    isExpanded,
    onToggle,
    onQtyChange,
    onStep,
    isEdited,
    disabled,
    t,
    categoryLabelMap,
    unitLabel
}) => {
    const rowMuted = item.suggested_qty === 0 && item.final_qty === 0;
    const displayUnit = unitLabel(item.unit);
    const categoryLabel = categoryLabelMap[item.product_category] || item.product_category || t('综合', 'General');

    return (
        <div
            className={cn(
                "group relative bg-white rounded-2xl border transition-all duration-300 overflow-hidden",
                rowMuted ? "border-gray-100 opacity-60" : "border-gray-200 hover:border-brand-red/30 hover:shadow-lg hover:shadow-brand-red/5"
            )}
            onClick={() => onToggle(item.row_id)}
        >
            <div className="p-5 flex flex-col sm:flex-row items-center gap-4">
                <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0 transition-colors",
                    rowMuted ? "bg-gray-100 text-gray-400" : "bg-brand-red/5 text-brand-red group-hover:bg-brand-red group-hover:text-white"
                )}>
                    {item.product_name_zh?.charAt(0) || '?'}
                </div>

                <div className="flex-grow text-center sm:text-left">
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                        <h4 className="font-black text-gray-800 text-base">{item.product_name_zh}</h4>
                        {isEdited && (
                            <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                                {t('已修改', 'Modified')}
                            </span>
                        )}
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                        {categoryLabel}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-200">
                        <button
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-brand-red hover:bg-white transition-all disabled:opacity-50"
                            onClick={(e) => {
                                e.stopPropagation();
                                onStep(item.row_id, -1);
                            }}
                            disabled={disabled}
                        >
                            <span className="material-symbols-outlined text-sm">remove</span>
                        </button>
                        <input
                            className="w-16 bg-transparent text-center font-black text-gray-800 focus:outline-none"
                            type="number"
                            value={item.final_qty}
                            onChange={(e) => onQtyChange(item.row_id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            disabled={disabled}
                            placeholder="0"
                        />
                        <button
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-brand-red hover:bg-white transition-all disabled:opacity-50"
                            onClick={(e) => {
                                e.stopPropagation();
                                onStep(item.row_id, 1);
                            }}
                            disabled={disabled}
                        >
                            <span className="material-symbols-outlined text-sm">add</span>
                        </button>
                    </div>
                    <span className="text-xs font-bold text-gray-400 w-16 text-right">{displayUnit}</span>
                </div>
            </div>

            <div className={cn(
                "bg-gray-50/50 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4 px-6 py-4 text-xs transition-all duration-300",
                isExpanded ? "block" : "hidden"
            )}>
                <div>
                    <span className="block text-gray-400 font-bold uppercase tracking-wider text-[10px]">{t('覆盖天数', 'Coverage')}</span>
                    <span className="font-mono font-bold text-gray-700">{formatNumber(item.reason_json?.cover_days)} {t('天', 'Days')}</span>
                </div>
                <div>
                    <span className="block text-gray-400 font-bold uppercase tracking-wider text-[10px]">{t('日消耗', 'Daily Usage')}</span>
                    <span className="font-mono font-bold text-gray-700">{formatNumber(item.reason_json?.daily_demand)}</span>
                </div>
                <div>
                    <span className="block text-gray-400 font-bold uppercase tracking-wider text-[10px]">{t('当前库存', 'In Stock')}</span>
                    <span className="font-mono font-bold text-gray-700">{formatNumber(item.reason_json?.current_inventory)}</span>
                </div>
                <div>
                    <span className="block text-gray-400 font-bold uppercase tracking-wider text-[10px]">{t('安全缓冲', 'Safety')}</span>
                    <span className="font-mono font-bold text-gray-700">{formatNumber(item.reason_json?.safety_buffer)}</span>
                </div>
                {item.loading_risk && (
                    <div className="col-span-full flex items-center gap-2 text-brand-red font-bold">
                        <span className="material-symbols-outlined text-sm">warning</span>
                        <span>{t('风险：可能撑不到下次到货', 'Risk: may not last until next delivery')}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

function OrderSuggestions() {
    const today = new Date();
    const day = today.getDay();
    const orderTypeToday = day === 1 ? 'MONDAY' : day === 5 ? 'FRIDAY' : null;
    const isOrderDay = Boolean(orderTypeToday);
    const nextOrderType = day === 1 ? 'MONDAY' : day === 5 ? 'FRIDAY' : (day === 2 || day === 3 || day === 4) ? 'FRIDAY' : 'MONDAY';
    const nextOrderLabel = nextOrderType === 'MONDAY' ? 'Mon' : 'Fri';
    const defaultViewType = orderTypeToday || nextOrderType;
    const [viewType, setViewType] = useState(defaultViewType);
    const orderType = isOrderDay ? orderTypeToday : viewType;
    const orderDate = today.toISOString().split('T')[0];
    const [suggestions, setSuggestions] = useState([]);
    const [expandedId, setExpandedId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savedOrderId, setSavedOrderId] = useState(null);
    const [message, setMessage] = useState('');
    const { t } = useLang();

    const categoryLabelMap = useMemo(() => ({
        protein: t('蛋白', 'Protein'),
        veg: t('蔬菜', 'Veg'),
        frozen: t('冷冻', 'Frozen'),
        dry: t('干货', 'Dry'),
        sauce: t('酱料', 'Sauce'),
        other: t('其他', 'Other')
    }), [t]);

    const unitLabel = (unit) => {
        if (!unit) return '';
        const text = String(unit);
        if (text.includes('箱') || /case/i.test(text)) return t('箱', 'Case');
        if (text.includes('袋') || /bag/i.test(text)) return t('袋', 'Bag');
        if (text.includes('包') || /pack|pkg/i.test(text)) return t('包', 'Pack');
        if (text.includes('基准单位') || /base/i.test(text)) return t('基准', 'Base');
        return text;
    };

    const subtitle = isOrderDay
        ? (orderTypeToday === 'MONDAY'
            ? t('今天是周一（周二到货）', 'Ordering for Tuesday delivery')
            : t('今天是周五（周六到货）', 'Ordering for Saturday delivery'))
        : (viewType === 'MONDAY'
            ? t('查看周一预测（周二到货）', 'Preview Monday order (Tue delivery)')
            : t('查看周五预测（周六到货）', 'Preview Friday order (Sat delivery)'));

    useEffect(() => {
        setViewType(defaultViewType);
    }, [defaultViewType]);

    useEffect(() => {
        let mounted = true;
        const fetchSuggestions = async () => {
            setLoading(true);
            try {
                const data = await getOrderSuggestions(orderType);
                if (!mounted) return;
                const withFinal = data.map((item, idx) => ({
                    ...item,
                    final_qty: item.suggested_qty,
                    original_suggested: item.suggested_qty,
                    row_id: item.product_id || idx
                }));
                setSuggestions(withFinal);
            } catch (err) {
                console.error(err);
            }
            if (mounted) setLoading(false);
        };
        fetchSuggestions();
        return () => {
            mounted = false;
        };
    }, [orderType]);

    const handleQtyChange = (rowId, val) => {
        setSuggestions((prev) =>
            prev.map((item) => {
                if (item.row_id !== rowId) return item;
                return { ...item, final_qty: val };
            })
        );
    };

    const handleStep = (rowId, step) => {
        setSuggestions((prev) =>
            prev.map((item) => {
                if (item.row_id !== rowId) return item;
                const current = parseFloat(item.final_qty) || 0;
                const next = Math.max(0, current + step);
                return { ...item, final_qty: next };
            })
        );
    };

    const sortedSuggestions = useMemo(() => {
        const list = [...suggestions];
        return list.sort((a, b) => {
            const aZero = a.suggested_qty === 0 ? 1 : 0;
            const bZero = b.suggested_qty === 0 ? 1 : 0;
            if (aZero !== bZero) return aZero - bZero;
            const categoryOrder = getCategoryOrder();
            const aCatIndex = a.product_category ? categoryOrder.indexOf(a.product_category) : -1;
            const bCatIndex = b.product_category ? categoryOrder.indexOf(b.product_category) : -1;
            const aCatRank = aCatIndex === -1 ? 999 : aCatIndex;
            const bCatRank = bCatIndex === -1 ? 999 : bCatIndex;
            if (aCatRank !== bCatRank) return aCatRank - bCatRank;

            const aOrder = Number.isFinite(a.product_sort_order) ? a.product_sort_order : 9999;
            const bOrder = Number.isFinite(b.product_sort_order) ? b.product_sort_order : 9999;
            if (aOrder !== bOrder) return aOrder - bOrder;

            return a.product_name_zh.localeCompare(b.product_name_zh, 'zh');
        });
    }, [suggestions]);

    const hasPositive = suggestions.some((item) => (parseFloat(item.final_qty) || 0) > 0);
    const actionsDisabled = !isOrderDay || !hasPositive;
    const totalItems = suggestions.filter(i => (parseFloat(i.final_qty) || 0) > 0).length;

    return (
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="neumorphic-inset rounded-[2.5rem] p-6 space-y-6">
                <div className="flex flex-col gap-3">
                    <span className="text-[10px] font-mono font-bold text-brand-red tracking-[0.3em] uppercase">
                        {t('智能计划', 'AI Planning')}
                    </span>
                    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                        <div>
                            <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tight">{t('订货建议', 'Order Suggestions')}</h2>
                            <p className="text-gray-500 font-serif italic mt-1">{subtitle}</p>
                        </div>

                        {!isOrderDay && (
                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                <button
                                    className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all", viewType === 'MONDAY' ? "bg-white shadow-sm text-brand-red" : "text-gray-500 hover:text-gray-700")}
                                    onClick={() => setViewType('MONDAY')}
                                >
                                    {t('周一', 'Mon')}
                                </button>
                                <button
                                    className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all", viewType === 'FRIDAY' ? "bg-white shadow-sm text-brand-red" : "text-gray-500 hover:text-gray-700")}
                                    onClick={() => setViewType('FRIDAY')}
                                >
                                    {t('周五', 'Fri')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {!isOrderDay && (
                    <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 flex items-start gap-3 text-yellow-800">
                        <span className="material-symbols-outlined text-yellow-600">info</span>
                        <div className="text-sm">
                            <strong className="block font-bold">{t('仅预览', 'Preview Only')}</strong>
                            {t(`今天不是订货日，下一个订货日是周${nextOrderLabel === 'Mon' ? '一' : '五'}`, `Today is not an ordering day. Next order day is ${nextOrderLabel}.`)}
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex h-64 items-center justify-center text-gray-400 flex-col gap-2">
                        <span className="material-symbols-outlined animate-spin text-3xl">refresh</span>
                        <span className="text-xs font-bold">{t('加载中', 'Loading')}</span>
                    </div>
                ) : sortedSuggestions.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">{t('暂无订货建议', 'No suggestions available.')}</div>
                ) : (
                    <div className="space-y-3">
                        {sortedSuggestions.map((item) => {
                            const isEdited = String(item.final_qty) !== String(item.original_suggested);
                            return (
                                <OrderCard
                                    key={item.row_id}
                                    item={item}
                                    isExpanded={expandedId === item.row_id}
                                    onToggle={(id) => setExpandedId((prev) => prev === id ? null : id)}
                                    onQtyChange={handleQtyChange}
                                    onStep={handleStep}
                                    isEdited={isEdited}
                                    disabled={!isOrderDay}
                                    t={t}
                                    categoryLabelMap={categoryLabelMap}
                                    unitLabel={unitLabel}
                                />
                            );
                        })}
                    </div>
                )}
            </div>

            <aside className="flex flex-col gap-6">
                <div className="bg-brand-red text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>

                    <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4 backdrop-blur-sm border border-white/20">
                            <span className="material-symbols-outlined text-3xl">shopping_cart</span>
                        </div>
                        <h3 className="font-black uppercase tracking-widest text-lg">{t('当前订货', 'Current Order')}</h3>
                        <div className="mt-4 mb-6">
                            <span className="text-5xl font-black">{totalItems}</span>
                            <span className="text-sm font-bold opacity-70 uppercase tracking-wider block mt-1">{t('项', 'Items')}</span>
                        </div>

                        <button
                            className="w-full bg-white text-brand-red py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-gray-50 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            disabled={actionsDisabled || saving}
                            onClick={async () => {
                                if (actionsDisabled) return;
                                setSaving(true);
                                setMessage('');
                                try {
                                    const payload = {
                                        order: {
                                            order_date: orderDate,
                                            order_type: orderType,
                                            status: "DRAFT"
                                        },
                                        lines: suggestions.map(item => ({
                                            product_id: item.product_id,
                                            suggested_qty: item.suggested_qty,
                                            final_qty: parseFloat(item.final_qty) || 0,
                                            unit: item.unit,
                                            reason_json: item.reason_json,
                                            notes: item.notes || ''
                                        }))
                                    };
                                    const res = await createOrder(payload);
                                    setSavedOrderId(res.id);
                                    setMessage(t('订货单已保存', 'Order saved'));
                                } catch (err) {
                                    console.error(err);
                                    setMessage(t('保存失败', 'Save failed'));
                                }
                                setSaving(false);
                            }}
                        >
                            {saving ? t('保存中...', 'Saving...') : t('提交订货', 'Submit Order')}
                        </button>

                        {message && (
                            <div className="mt-4 font-bold text-xs bg-black/20 px-3 py-1 rounded-full">
                                {message}
                            </div>
                        )}
                    </div>
                </div>

                <div className="neumorphic-flat rounded-3xl p-6 flex flex-col gap-4">
                    <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-400 font-bold text-center mb-2">
                        {t('导出', 'Export Options')}
                    </div>
                    <button
                        className="neumorphic-button w-full py-3 rounded-xl text-gray-600 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-3 disabled:opacity-50"
                        disabled={actionsDisabled || !savedOrderId}
                        onClick={async () => {
                            if (!savedOrderId || actionsDisabled) return;
                            const blob = await exportOrder(savedOrderId);
                            const url = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `Order_${orderType}_${orderDate}.csv`;
                            document.body.appendChild(link);
                            link.click();
                            link.remove();
                            window.URL.revokeObjectURL(url);
                        }}
                    >
                        <span className="material-symbols-outlined text-sm">download</span>
                        {t('下载 CSV', 'Download CSV')}
                    </button>
                </div>
            </aside>
        </div>
    );
}

export default OrderSuggestions;

