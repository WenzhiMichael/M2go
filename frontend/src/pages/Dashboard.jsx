import React, { useMemo, useState } from 'react';
import { useLang } from '../i18n';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

function Dashboard() {
    const { t } = useLang();
    const [range, setRange] = useState('7d');
    const today = new Date();
    const dateZh = today.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
    const dateEn = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const kpis = useMemo(() => ([
        {
            id: 'inventory',
            label: t('活跃商品', 'Active Items'),
            value: '142',
            delta: '+8',
            note: t('近30天', 'Last 30 days'),
            tone: 'text-emerald-600'
        },
        {
            id: 'low',
            label: t('低库存', 'Low Stock'),
            value: '12',
            delta: '-3',
            note: t('需关注', 'Needs attention'),
            tone: 'text-rose-600'
        },
        {
            id: 'orders',
            label: t('待下单', 'Pending Orders'),
            value: '4',
            delta: '+1',
            note: t('本周', 'This week'),
            tone: 'text-amber-600'
        },
        {
            id: 'count',
            label: t('盘点完成率', 'Count Completion'),
            value: '68%',
            delta: '+12%',
            note: t('今日', 'Today'),
            tone: 'text-brand-red'
        }
    ]), [t]);

    const quickStats = useMemo(() => ([
        {
            title: t('盘点中', 'Counts in progress'),
            value: '3',
            sub: t('班次进行中', 'Active shifts')
        },
        {
            title: t('最近同步', 'Last Sync'),
            value: '2m',
            sub: t('系统在线', 'System online')
        },
        {
            title: t('供应商', 'Suppliers'),
            value: '8',
            sub: t('活跃合作方', 'Active partners')
        }
    ]), [t]);

    const criticalItems = useMemo(() => ([
        { name: t('鸡球', 'Chicken Ball'), level: t('紧急', 'Critical'), value: '12%', tone: 'bg-rose-500' },
        { name: t('牛肉', 'Beef'), level: t('偏低', 'Low'), value: '22%', tone: 'bg-amber-500' },
        { name: t('青椒', 'Green Pepper'), level: t('偏低', 'Low'), value: '28%', tone: 'bg-amber-500' },
        { name: t('饺子', 'Dumpling'), level: t('正常', 'OK'), value: '62%', tone: 'bg-emerald-500' }
    ]), [t]);

    const recentActivity = useMemo(() => ([
        {
            title: t('完成盘点', 'Daily count submitted'),
            meta: t('今日 17:20', 'Today 5:20 PM'),
            by: t('盘点组', 'Inventory team')
        },
        {
            title: t('生成订货单', 'Order draft created'),
            meta: t('今日 16:05', 'Today 4:05 PM'),
            by: t('系统自动', 'Auto generated')
        },
        {
            title: t('更新规格', 'Updated conversions'),
            meta: t('昨日 19:44', 'Yesterday 7:44 PM'),
            by: t('运营管理员', 'Ops admin')
        }
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
                        {t('运营中心', 'Ops Control')}
                    </p>
                    <h2 className="text-4xl lg:text-5xl font-black text-gray-900 uppercase tracking-tight">
                        {t('仪表盘', 'Dashboard')}
                    </h2>
                    <p className="mt-2 text-gray-500 font-serif italic">
                        {t('今天', 'Today')}: {t(dateZh, dateEn)}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-white/80 border border-gray-100 rounded-full px-4 py-2 text-xs font-bold text-gray-600">
                        {t('系统状态', 'System Status')}: <span className="text-emerald-600">{t('在线', 'Online')}</span>
                    </div>
                    <button className="btn-gradient px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest text-white shadow-lg hover:shadow-xl transition">
                        {t('刷新', 'Refresh')}
                    </button>
                </div>
            </header>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {kpis.map((kpi, idx) => (
                    <div
                        key={kpi.id}
                        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-lg transition-all"
                        style={{ animationDelay: `${idx * 80}ms` }}
                    >
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{kpi.label}</p>
                        <div className="mt-3 flex items-end justify-between">
                            <div className="text-3xl font-black text-gray-900">{kpi.value}</div>
                            <div className={cn("text-sm font-bold", kpi.tone)}>{kpi.delta}</div>
                        </div>
                        <p className="mt-2 text-xs text-gray-400">{kpi.note}</p>
                    </div>
                ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">{t('消耗趋势', 'Usage Trend')}</h3>
                            <p className="text-xs text-gray-500 mt-1">{t('近一段时间的消耗波动', 'Recent consumption fluctuations')}</p>
                        </div>
                        <div className="flex gap-2">
                            {rangeOptions.map((opt) => (
                                <button
                                    key={opt.key}
                                    onClick={() => setRange(opt.key)}
                                    className={cn(
                                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                                        range === opt.key ? "bg-brand-red text-white" : "bg-gray-100 text-gray-500"
                                    )}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="relative h-56">
                        <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="dashGradient" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="#A31D36" stopOpacity="0.25" />
                                    <stop offset="100%" stopColor="#A31D36" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <path d="M0,140 C150,120 260,80 400,120 C540,160 640,90 800,110 V200 H0 Z" fill="url(#dashGradient)" />
                            <path d="M0,140 C150,120 260,80 400,120 C540,160 640,90 800,110" fill="none" stroke="#A31D36" strokeWidth="3" />
                        </svg>
                        <div className="absolute bottom-3 left-0 right-0 flex justify-between text-[10px] text-gray-400 uppercase tracking-widest px-4">
                            {(range === '7d'
                                ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                                : range === '30d'
                                    ? ['Week 1', 'Week 2', 'Week 3', 'Week 4']
                                    : ['M1', 'M2', 'M3']
                            ).map((label) => (
                                <span key={label}>{label}</span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-6">
                        <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">{t('关键事项', 'Critical Items')}</h3>
                        <p className="text-xs text-gray-500 mt-1">{t('需要优先处理的库存', 'Stock that needs attention')}</p>
                        <div className="mt-4 space-y-3">
                            {criticalItems.map((item) => (
                                <div key={item.name} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2">
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">{item.name}</p>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">{item.level}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-gray-600">{item.value}</span>
                                        <span className={cn("w-2.5 h-2.5 rounded-full", item.tone)}></span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-brand-red text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:14px_14px]"></div>
                        <h3 className="text-sm font-black uppercase tracking-widest">{t('盘点进度', 'Count Progress')}</h3>
                        <div className="mt-4">
                            <div className="flex justify-between items-end">
                                <span className="text-4xl font-black">68%</span>
                                <span className="text-xs font-bold opacity-80">{t('完成 96 / 142 项', '96 / 142 items completed')}</span>
                            </div>
                            <div className="mt-2 w-full bg-white/20 h-2 rounded-full overflow-hidden">
                                <div className="bg-white h-full rounded-full" style={{ width: '68%' }}></div>
                            </div>
                            <div className="mt-4 grid grid-cols-3 gap-3 text-[10px] uppercase tracking-widest">
                                {quickStats.map((stat) => (
                                    <div key={stat.title}>
                                        <p className="opacity-70">{stat.title}</p>
                                        <p className="text-lg font-black">{stat.value}</p>
                                        <p className="opacity-60">{stat.sub}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">{t('最近动态', 'Recent Activity')}</h3>
                    <div className="mt-4 space-y-4">
                        {recentActivity.map((item, idx) => (
                            <div key={`${item.title}-${idx}`} className="flex items-start gap-3">
                                <span className="w-2.5 h-2.5 rounded-full bg-brand-red mt-2"></span>
                                <div>
                                    <p className="text-sm font-bold text-gray-800">{item.title}</p>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">{item.meta} · {item.by}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">{t('快捷动作', 'Quick Actions')}</h3>
                    <div className="mt-4 grid gap-3">
                        {[
                            t('开始盘点', 'Start Daily Count'),
                            t('生成订货建议', 'Generate Orders'),
                            t('查看低库存', 'Review Low Stock')
                        ].map((action) => (
                            <button
                                key={action}
                                className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-left text-sm font-bold text-gray-700 hover:bg-brand-red/10 hover:text-brand-red transition"
                            >
                                {action}
                            </button>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}

export default Dashboard;

