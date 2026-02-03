import React, { useMemo, useState } from 'react';
import { useLang } from '../i18n';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

function Analytics() {
    const { t } = useLang();
    const [range, setRange] = useState('30d');

    const kpis = useMemo(() => ([
        {
            label: t('订货准确率', 'Order Accuracy'),
            value: '92%',
            delta: '+3%',
            note: t('预测 vs 实际', 'Forecast vs actual'),
            tone: 'text-emerald-600'
        },
        {
            label: t('盘点偏差', 'Count Variance'),
            value: '3.1%',
            delta: '-0.4%',
            note: t('全库平均', 'Portfolio avg'),
            tone: 'text-emerald-600'
        },
        {
            label: t('损耗率', 'Waste Rate'),
            value: '2.4%',
            delta: '-0.6%',
            note: t('本月', 'This month'),
            tone: 'text-emerald-600'
        },
        {
            label: t('准时到货', 'On-time Delivery'),
            value: '96%',
            delta: '+1%',
            note: t('供应商表现', 'Supplier performance'),
            tone: 'text-brand-red'
        }
    ]), [t]);

    const axisLabels = useMemo(() => {
        if (range === '7d') {
            return [
                t('周一', 'Mon'),
                t('周二', 'Tue'),
                t('周三', 'Wed'),
                t('周四', 'Thu'),
                t('周五', 'Fri'),
                t('周六', 'Sat'),
                t('周日', 'Sun')
            ];
        }
        if (range === '30d') {
            return [t('第1周', 'Week 1'), t('第2周', 'Week 2'), t('第3周', 'Week 3'), t('第4周', 'Week 4')];
        }
        return [t('一月', 'Month 1'), t('二月', 'Month 2'), t('三月', 'Month 3')];
    }, [range, t]);

    const supplierStats = useMemo(() => ([
        { name: t('金龙批发', 'Golden Dragon'), onTime: '98%', fill: '94%', issues: t('无', 'None') },
        { name: t('鲜品直供', 'Fresh Farm'), onTime: '93%', fill: '89%', issues: t('延迟 1 次', '1 delay') },
        { name: t('海鲜仓', 'Ocean Depot'), onTime: '90%', fill: '86%', issues: t('缺货 2 次', '2 shortages') },
        { name: t('干货供应', 'Dry Goods Co.'), onTime: '97%', fill: '92%', issues: t('无', 'None') }
    ]), [t]);

    const varianceItems = useMemo(() => ([
        { name: t('鸡球', 'Chicken Ball'), variance: '-8%', note: t('盘点少于系统库存', 'Count lower than system') },
        { name: t('青椒', 'Green Pepper'), variance: '+6%', note: t('加工损耗偏高', 'Prep loss higher') },
        { name: t('饺子', 'Dumpling'), variance: '-5%', note: t('出库记录缺失', 'Missing outbound record') },
        { name: t('牛肉', 'Beef'), variance: '+4%', note: t('入库未同步', 'Inbound not synced') }
    ]), [t]);

    const costMix = useMemo(() => ([
        { label: t('蛋白', 'Protein'), value: 44, tone: 'bg-brand-red' },
        { label: t('蔬菜', 'Vegetables'), value: 22, tone: 'bg-emerald-500' },
        { label: t('冷冻', 'Frozen'), value: 18, tone: 'bg-sky-500' },
        { label: t('干货', 'Dry Goods'), value: 16, tone: 'bg-amber-400' }
    ]), [t]);

    const insights = useMemo(() => ([
        t('周五订货偏高 8%，建议调整订货系数。', 'Friday orders are 8% higher than actual; reduce multiplier.'),
        t('海鲜类缺货率偏高，考虑备份供应商。', 'Seafood fill rate is low; consider a backup supplier.'),
        t('盘点偏差集中在蛋白类，建议加强流程检查。', 'Variance clusters in proteins; tighten count workflow.')
    ]), [t]);

    const rangeOptions = [
        { key: '7d', label: t('7天', '7 Days') },
        { key: '30d', label: t('30天', '30 Days') },
        { key: '90d', label: t('90天', '90 Days') }
    ];

    return (
        <div className="space-y-8 animate-fade-up">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-[10px] font-mono font-bold tracking-[0.3em] text-brand-red uppercase">
                        {t('复盘与决策', 'Review & Decisions')}
                    </p>
                    <h2 className="text-4xl lg:text-5xl font-black text-gray-900 uppercase tracking-tight">
                        {t('分析', 'Analytics')}
                    </h2>
                    <p className="mt-2 text-gray-500 font-serif italic">
                        {t('追踪预测偏差、成本与供应商表现。', 'Track accuracy, cost, and supplier performance.')}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="bg-white border border-gray-200 rounded-full px-4 py-2 text-xs font-bold text-gray-600">
                        {t('门店', 'Location')}: {t('市中心店', 'Downtown')}
                    </div>
                    <div className="bg-white border border-gray-200 rounded-full px-4 py-2 text-xs font-bold text-gray-600">
                        {t('品类', 'Category')}: {t('全部', 'All')}
                    </div>
                    <div className="flex gap-2">
                        {rangeOptions.map((opt) => (
                            <button
                                key={opt.key}
                                onClick={() => setRange(opt.key)}
                                className={cn(
                                    "px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest",
                                    range === opt.key ? "bg-brand-red text-white shadow-lg" : "bg-white text-gray-500 border border-gray-200"
                                )}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {kpis.map((kpi) => (
                    <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-lg transition-all">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{kpi.label}</p>
                        <div className="mt-3 flex items-end justify-between">
                            <div className="text-3xl font-black text-gray-900">{kpi.value}</div>
                            <div className={cn("text-sm font-bold", kpi.tone)}>{kpi.delta}</div>
                        </div>
                        <p className="mt-2 text-xs text-gray-400">{kpi.note}</p>
                    </div>
                ))}
            </section>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">
                                {t('预测 vs 实际', 'Forecast vs Actual')}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                                {t('监控订货预测偏差', 'Monitor forecast accuracy')}
                            </p>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-gray-500 uppercase tracking-widest">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-red"></span>{t('实际', 'Actual')}</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full border border-brand-red"></span>{t('预测', 'Forecast')}</span>
                        </div>
                    </div>
                    <div className="relative h-60 mt-4">
                        <svg className="w-full h-full" viewBox="0 0 800 240" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="analyticsGradient" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="#A31D36" stopOpacity="0.25" />
                                    <stop offset="100%" stopColor="#A31D36" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <path d="M0,170 C120,130 240,190 360,150 C480,110 620,90 800,120 V240 H0 Z" fill="url(#analyticsGradient)" />
                            <path d="M0,170 C120,130 240,190 360,150 C480,110 620,90 800,120" fill="none" stroke="#A31D36" strokeWidth="3" />
                            <path d="M0,150 C160,150 320,150 480,150 C640,150 720,150 800,150" fill="none" stroke="#A31D36" strokeDasharray="6 6" strokeOpacity="0.4" />
                        </svg>
                        <div className="absolute bottom-3 left-0 right-0 flex justify-between text-[10px] text-gray-400 uppercase tracking-widest px-4">
                            {axisLabels.map((label) => (
                                <span key={label}>{label}</span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-6">
                        <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">{t('成本结构', 'Cost Mix')}</h3>
                        <div className="mt-4 space-y-4">
                            {costMix.map((item) => (
                                <div key={item.label}>
                                    <div className="flex justify-between text-xs font-bold text-gray-600">
                                        <span>{item.label}</span>
                                        <span>{item.value}%</span>
                                    </div>
                                    <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className={cn('h-full rounded-full', item.tone)} style={{ width: `${item.value}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-brand-red text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:14px_14px]"></div>
                        <h3 className="text-sm font-black uppercase tracking-widest">{t('复盘结论', 'Insights')}</h3>
                        <ul className="mt-4 space-y-3 text-sm">
                            {insights.map((item) => (
                                <li key={item} className="flex items-start gap-2">
                                    <span className="mt-1 size-2 rounded-full bg-white"></span>
                                    <span className="opacity-90">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">{t('供应商表现', 'Supplier Performance')}</h3>
                            <p className="text-xs text-gray-500 mt-1">{t('按准时率与缺货率评估', 'Measured by on-time and fill rate')}</p>
                        </div>
                        <button className="text-[10px] font-bold uppercase tracking-widest text-brand-red">{t('导出', 'Export')}</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-400">
                                <tr>
                                    <th className="px-6 py-4">{t('供应商', 'Supplier')}</th>
                                    <th className="px-6 py-4 text-center">{t('准时率', 'On-time')}</th>
                                    <th className="px-6 py-4 text-center">{t('满货率', 'Fill Rate')}</th>
                                    <th className="px-6 py-4 text-right">{t('问题记录', 'Issues')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {supplierStats.map((row) => (
                                    <tr key={row.name} className="hover:bg-brand-cream/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-800">{row.name}</td>
                                        <td className="px-6 py-4 text-center font-mono font-bold text-gray-600">{row.onTime}</td>
                                        <td className="px-6 py-4 text-center font-mono font-bold text-gray-600">{row.fill}</td>
                                        <td className="px-6 py-4 text-right text-xs text-gray-500">{row.issues}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">{t('偏差热点', 'Variance Hotspots')}</h3>
                    <p className="text-xs text-gray-500 mt-1">{t('盘点偏差最高的商品', 'Items with highest variance')}</p>
                    <div className="mt-4 space-y-4">
                        {varianceItems.map((item) => (
                            <div key={item.name} className="rounded-xl border border-gray-100 p-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-bold text-gray-800">{item.name}</p>
                                    <span className="text-xs font-bold text-brand-red">{item.variance}</span>
                                </div>
                                <p className="text-[10px] uppercase tracking-widest text-gray-400 mt-2">{item.note}</p>
                            </div>
                        ))}
                    </div>
                    <button className="btn-gradient mt-6 w-full py-3 rounded-xl text-white text-xs font-black uppercase tracking-widest shadow-lg">
                        {t('生成整改任务', 'Create Action Plan')}
                    </button>
                </div>
            </section>
        </div>
    );
}

export default Analytics;
