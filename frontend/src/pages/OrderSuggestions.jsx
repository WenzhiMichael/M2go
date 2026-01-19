import React, { useState } from 'react';
import { createOrder, exportOrder, getOrderSuggestions } from '../api';

function OrderSuggestions() {
    const today = new Date();
    const defaultType = today.getDay() === 1 ? 'MONDAY' : today.getDay() === 5 ? 'FRIDAY' : 'MONDAY';
    const isOrderDay = [1, 5].includes(today.getDay());
    const [orderType, setOrderType] = useState(defaultType);
    const [orderDate, setOrderDate] = useState(today.toISOString().split('T')[0]);
    const [suggestions, setSuggestions] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savedOrderId, setSavedOrderId] = useState(null);
    const [message, setMessage] = useState('');

    const handleGenerate = async () => {
        setLoading(true);
        setMessage('');
        setSavedOrderId(null);
        try {
            const data = await getOrderSuggestions(orderType);
            // Initialize final_qty with suggested_qty
            const withFinal = data.map(item => ({ ...item, final_qty: item.suggested_qty, user_note: '' }));
            setSuggestions(withFinal);
            setLoaded(true);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const handleQtyChange = (index, val) => {
        const newSugg = [...suggestions];
        newSugg[index].final_qty = val;
        setSuggestions(newSugg);
    };

    const handleNoteChange = (index, val) => {
        const newSugg = [...suggestions];
        newSugg[index].user_note = val;
        setSuggestions(newSugg);
    };

    return (
        <div className="card">
            <h2>订货建议</h2>

            <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <label>订货类型:</label>
                <select value={orderType} onChange={e => setOrderType(e.target.value)} style={{ width: 'auto' }}>
                    <option value="MONDAY">周一订货</option>
                    <option value="FRIDAY">周五订货</option>
                </select>
                <label>订货日期:</label>
                <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} style={{ width: 'auto' }} />
                <button className="primary" onClick={handleGenerate} disabled={loading} style={{ width: 'auto' }}>
                    {loading ? '生成中...' : '生成建议'}
                </button>
            </div>
            {!isOrderDay && <div style={{ marginBottom: '0.5rem', color: '#b45309' }}>今天不是固定订货日，可手动选择周一或周五模式。</div>}

            {loaded && (
                <>
                    <table style={{ fontSize: '0.85rem' }}>
                        <thead>
                            <tr>
                                <th>商品</th>
                                <th>建议</th>
                                <th>单位</th>
                                <th style={{ width: '80px' }}>实订</th>
                                <th>原因</th>
                                <th>备注</th>
                            </tr>
                        </thead>
                        <tbody>
                            {suggestions.map((item, idx) => (
                                <tr key={idx} style={{ background: item.loading_risk ? '#fff0f0' : 'transparent' }}>
                                    <td>{item.product_name_zh}</td>
                                    <td>{item.suggested_qty}</td>
                                    <td>{item.unit}</td>
                                    <td>
                                        <input
                                            type="number"
                                            value={item.final_qty}
                                            onChange={e => handleQtyChange(idx, e.target.value)}
                                            style={{ width: '60px', padding: '0.2rem' }}
                                        />
                                    </td>
                                    <td style={{ color: '#666' }}>
                                        {item.notes}
                                        {item.reason_json && item.reason_json.details && (
                                            <div style={{ fontSize: '0.75rem', marginTop: '0.2rem', color: '#999' }}>
                                                {item.reason_json.details.join('; ')}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            value={item.user_note || ''}
                                            onChange={e => handleNoteChange(idx, e.target.value)}
                                            placeholder="可选"
                                            style={{ width: '120px' }}
                                        />
                                    </td>
                                </tr>
                            ))}
                            {suggestions.length === 0 && (
                                <tr><td colSpan="6" className="text-center">没有订货建议</td></tr>
                            )}
                        </tbody>
                    </table>

                    {suggestions.length > 0 && (
                        <div style={{ textAlign: 'right' }}>
                            <button
                                className="secondary"
                                onClick={async () => {
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
                                                notes: item.user_note || item.notes || ''
                                            }))
                                        };
                                        const res = await createOrder(payload);
                                        setSavedOrderId(res.id);
                                        setMessage('订单已保存');
                                    } catch (err) {
                                        console.error(err);
                                        setMessage('保存失败');
                                    }
                                    setSaving(false);
                                }}
                                style={{ width: 'auto', marginRight: '0.5rem' }}
                            >
                                {saving ? '保存中...' : '保存订单'}
                            </button>
                            <button
                                className="primary"
                                disabled={!savedOrderId}
                                onClick={async () => {
                                    if (!savedOrderId) return;
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
                                style={{ width: 'auto' }}
                            >
                                导出CSV
                            </button>
                        </div>
                    )}
                    {message && (
                        <div style={{ marginTop: '0.75rem', textAlign: 'right', color: message.includes('失败') ? '#b91c1c' : '#2e7d32' }}>
                            {message}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default OrderSuggestions;
