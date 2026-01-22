import React, { useEffect, useMemo, useState } from 'react';
import { createOrder, exportOrder, getOrderSuggestions } from '../api';

const PROTEINS = new Set(['白鸡', '鸡球', '柠檬鸡', '黑鸡', '牛肉', '鸡翅', '猪肉']);

const unitLabel = (unit) => {
    if (!unit) return '';
    if (unit.includes('箱')) return '箱';
    if (unit.includes('袋')) return '袋';
    if (unit.includes('包')) return '包';
    if (unit.includes('基准单位')) return '包';
    return unit;
};

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

const OrderRow = ({
    item,
    isExpanded,
    onToggle,
    onQtyChange,
    onStep,
    isEdited,
    disabled
}) => {
    const rowMuted = item.suggested_qty === 0;
    const displayUnit = unitLabel(item.unit);
    return (
        <div className={`order-row ${rowMuted ? 'muted' : ''}`} onClick={() => onToggle(item.row_id)}>
            <div className="order-row-main">
                <div className="order-name">
                    <div className="order-name-text">{item.product_name_zh}</div>
                    {isEdited && <span className="order-edited">已手动修改</span>}
                </div>
                <div className="order-qty">
                    <button
                        className="qty-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onStep(item.row_id, -1);
                        }}
                        disabled={disabled}
                        aria-label="减少数量"
                    >
                        –
                    </button>
                    <input
                        className="qty-input"
                        type="number"
                        value={item.final_qty}
                        onChange={(e) => onQtyChange(item.row_id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        disabled={disabled}
                    />
                    <button
                        className="qty-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onStep(item.row_id, 1);
                        }}
                        disabled={disabled}
                        aria-label="增加数量"
                    >
                        +
                    </button>
                </div>
                <div className="order-unit">{displayUnit}</div>
            </div>
            {isExpanded && (
                <div className="order-row-detail" onClick={(e) => e.stopPropagation()}>
                    <div>覆盖天数：{formatNumber(item.reason_json?.cover_days)}</div>
                    <div>日消耗：{formatNumber(item.reason_json?.daily_demand)}</div>
                    <div>当前库存：{formatNumber(item.reason_json?.current_inventory)}</div>
                    <div>安全缓冲：{formatNumber(item.reason_json?.safety_buffer)}</div>
                    {item.loading_risk && <div className="order-risk">可能撑不到下次到货</div>}
                </div>
            )}
        </div>
    );
};

function OrderSuggestions() {
    const today = new Date();
    const day = today.getDay();
    const orderTypeToday = day === 1 ? 'MONDAY' : day === 5 ? 'FRIDAY' : null;
    const isOrderDay = Boolean(orderTypeToday);
    const nextOrderType = day === 1 ? 'MONDAY' : day === 5 ? 'FRIDAY' : (day === 2 || day === 3 || day === 4) ? 'FRIDAY' : 'MONDAY';
    const nextOrderLabel = nextOrderType === 'MONDAY' ? '周一' : '周五';
    const defaultViewType = orderTypeToday || nextOrderType;
    const [viewType, setViewType] = useState(defaultViewType);
    const orderType = isOrderDay ? orderTypeToday : viewType;
    const subtitle = isOrderDay
        ? (orderTypeToday === 'MONDAY' ? '今天是周一（周二到货）' : '今天是周五（周六到货）')
        : (viewType === 'MONDAY' ? '查看周一预测（周二到货）' : '查看周五预测（周六到货）');
    const orderDate = today.toISOString().split('T')[0];
    const [suggestions, setSuggestions] = useState([]);
    const [expandedId, setExpandedId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savedOrderId, setSavedOrderId] = useState(null);
    const [message, setMessage] = useState('');

    useEffect(() => {
        setViewType(defaultViewType);
    }, [defaultViewType]);

    // 自动加载订货建议，移除“生成建议”按钮以加快单屏操作
    useEffect(() => {
        let mounted = true;
        const fetchSuggestions = async () => {
            setLoading(true);
            try {
                const data = await getOrderSuggestions(orderType);
                if (!mounted) return;
                // 移除多余表格/筛选，仅保留核心清单数据
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
            const aProtein = PROTEINS.has(a.product_name_zh) ? 0 : 1;
            const bProtein = PROTEINS.has(b.product_name_zh) ? 0 : 1;
            if (aProtein !== bProtein) return aProtein - bProtein;
            return a.product_name_zh.localeCompare(b.product_name_zh, 'zh');
        });
    }, [suggestions]);

    const hasPositive = suggestions.some((item) => (parseFloat(item.final_qty) || 0) > 0);
    const actionsDisabled = !isOrderDay || !hasPositive;

    return (
        <div className="card order-page">
            <div className="order-header">
                <h2>订货建议</h2>
                {subtitle && <div className="order-subtitle">{subtitle}</div>}
            </div>

            {!isOrderDay && (
                <div className="order-warning">
                    今天不是订货日，下一个订货日是{nextOrderLabel}（可查看预测，不能保存/导出）
                </div>
            )}

            {!isOrderDay && (
                <div className="order-view-toggle-wrap">
                    <span>查看预测：</span>
                    <div className="order-view-toggle" role="group" aria-label="查看预测">
                        <button
                            type="button"
                            className={viewType === 'MONDAY' ? 'active' : ''}
                            onClick={() => setViewType('MONDAY')}
                        >
                            周一
                        </button>
                        <button
                            type="button"
                            className={viewType === 'FRIDAY' ? 'active' : ''}
                            onClick={() => setViewType('FRIDAY')}
                        >
                            周五
                        </button>
                    </div>
                </div>
            )}

            {loading && <div className="text-center">加载中...</div>}

            {!loading && sortedSuggestions.length === 0 && (
                <div className="text-center">没有订货建议</div>
            )}

            {!loading && sortedSuggestions.length > 0 && (
                <div className="order-list">
                    {/* 仅保留一张扁平清单，移除表头/多表格/解释区以降低认知负担 */}
                    {sortedSuggestions.map((item) => {
                        const isEdited = String(item.final_qty) !== String(item.original_suggested);
                        return (
                            <OrderRow
                                key={item.row_id}
                                item={item}
                                isExpanded={expandedId === item.row_id}
                                onToggle={(id) => setExpandedId((prev) => prev === id ? null : id)}
                                onQtyChange={handleQtyChange}
                                onStep={handleStep}
                                isEdited={isEdited}
                                disabled={!isOrderDay}
                            />
                        );
                    })}
                </div>
            )}

            <div className="order-footer">
                <button
                    className="primary"
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
                            setMessage('订货单已保存');
                        } catch (err) {
                            console.error(err);
                            setMessage('保存失败');
                        }
                        setSaving(false);
                    }}
                >
                    {saving ? '保存中...' : '保存为订货单'}
                </button>
                <button
                    className="secondary"
                    disabled={actionsDisabled || !savedOrderId}
                    onClick={async () => {
                        if (!savedOrderId || actionsDisabled) return;
                        const blob = await exportOrder(savedOrderId);
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `订单_${orderType}_${orderDate}.csv`;
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                        window.URL.revokeObjectURL(url);
                    }}
                >
                    导出 CSV
                </button>
                {message && (
                    <span className={`order-footer-message ${message.includes('失败') ? 'error' : ''}`}>
                        {message}
                    </span>
                )}
            </div>
        </div>
    );
}

export default OrderSuggestions;
