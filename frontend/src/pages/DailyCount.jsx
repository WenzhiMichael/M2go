import React, { useEffect, useState } from 'react';
import { getProducts, saveDailyCount } from '../api';

function DailyCount() {
    const [products, setProducts] = useState([]);
    const [counts, setCounts] = useState({});
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const categoryLabels = { protein: '蛋白', veg: '蔬菜', frozen: '冷冻' };
    const containerLabels = { case: '整箱', bag: '袋子', box_2inch: '2寸盒', box_4inch: '4寸盒' };
    const categoryOrder = ['protein', 'veg', 'frozen'];

    useEffect(() => {
        loadProducts();
    }, []);

    async function loadProducts() {
        try {
            const data = await getProducts();
            setProducts(data);
        } catch (err) {
            console.error(err);
        }
    }

    const handleCountChange = (variantId, val) => {
        setCounts({ ...counts, [variantId]: val });
    };

    const handleSubmit = async () => {
        setLoading(true);
        setMessage('');
        try {
            const promises = Object.keys(counts).map(variantId => {
                const qty = parseFloat(counts[variantId]);
                if (isNaN(qty)) return null;
                return saveDailyCount({
                    date: date,
                    variant_id: parseInt(variantId),
                    counted_qty: qty
                });
            }).filter(p => p !== null);

            await Promise.all(promises);
            setMessage('盘点已保存');
            setCounts({}); // Clear inputs or keep them? Usually keep to see what was entered. Let's clear for next day or success indication.
            // Actually better to just show success.
        } catch (err) {
            console.error(err);
            setMessage('保存失败');
        }
        setLoading(false);
    };

    // Group products by category
    const grouped = products.reduce((acc, p) => {
        acc[p.category] = acc[p.category] || [];
        acc[p.category].push(p);
        return acc;
    }, {});

    return (
        <div className="card">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', color: 'black', padding: 0, boxShadow: 'none', marginBottom: '1rem' }}>
                <h2>每日盘点</h2>
                <div>
                    <label>日期: </label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: 'auto' }} />
                </div>
            </header>

            {[...categoryOrder.filter(cat => grouped[cat]), ...Object.keys(grouped).filter(cat => !categoryOrder.includes(cat))].map(cat => (
                <div key={cat}>
                    <div className="category-header">{categoryLabels[cat] || cat}</div>
                    {grouped[cat].map(p => (
                        <div key={p.id}>
                            {p.variants.map(v => (
                                <div key={v.id} className="variant-row">
                                    <div>
                                        <strong>{v.display_name_zh}</strong> <small style={{ color: '#666' }}>{containerLabels[v.container] || v.container}</small>
                                    </div>
                                    <input
                                        type="number"
                                        className="variant-input"
                                        placeholder="0"
                                        value={counts[v.id] || ''}
                                        onChange={e => handleCountChange(v.id, e.target.value)}
                                    />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            ))}

            <div style={{ marginTop: '2rem' }}>
                <button className="primary" onClick={handleSubmit} disabled={loading}>
                    {loading ? '保存中...' : '保存盘点'}
                </button>
                {message && <div style={{ marginTop: '1rem', textAlign: 'center', fontWeight: 'bold' }}>{message}</div>}
            </div>
        </div>
    );
}

export default DailyCount;
