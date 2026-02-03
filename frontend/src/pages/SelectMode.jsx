import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '../context/UserRoleContext';
import { useLang } from '../i18n';

export default function SelectMode() {
    const { role, setMode } = useUserRole();
    const navigate = useNavigate();
    const { t } = useLang();

    const handleSelectManager = () => {
        if (role === 'manager') {
            setMode('manager');
            navigate('/dashboard');
        }
    };

    const handleSelectStaff = () => {
        setMode('staff');
        navigate('/daily-count');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-cream text-slate-900 p-6 relative overflow-hidden">
            <div className="bg-gradient-premium"></div>

            <div className="relative z-10 max-w-4xl w-full">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">
                        {t('选择操作模式', 'Select Mode')}
                    </h1>
                    <p className="text-slate-500 font-serif italic text-lg">
                        {t('请根据当前工作内容选择入口', 'Choose your workspace based on your role.')}
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Manager Card */}
                    <button
                        onClick={handleSelectManager}
                        disabled={role !== 'manager'}
                        className={`group relative flex flex-col items-center p-10 rounded-[2rem] border transition-all duration-300 text-left w-full
                            ${role === 'manager'
                                ? 'bg-white/80 hover:bg-white border-white shadow-xl hover:shadow-2xl hover:-translate-y-1 cursor-pointer'
                                : 'bg-slate-100/50 border-slate-200 opacity-60 cursor-not-allowed grayscale'}
                        `}
                    >
                        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 text-4xl shadow-lg transition-transform group-hover:scale-110
                            ${role === 'manager' ? 'bg-brand-red text-white' : 'bg-slate-300 text-slate-500'}
                        `}>
                            <span className="material-symbols-outlined">admin_panel_settings</span>
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2">{t('经理', 'Manager')}</h3>
                        <p className="text-sm text-slate-500 font-medium uppercase tracking-widest mb-4">{t('管理与设置', 'Management')}</p>
                        <p className="text-slate-600 text-center leading-relaxed">
                            {t('完整权限：仪表盘、商品管理、分析报表、人员设置等。', 'Full access: Dashboard, Products, Analytics, Settings.')}
                        </p>
                        {role !== 'manager' && (
                            <div className="absolute top-6 right-6 px-3 py-1 bg-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded-full">
                                {t('无权限', 'No Access')}
                            </div>
                        )}
                    </button>

                    {/* Staff Card */}
                    <button
                        onClick={handleSelectStaff}
                        className="group relative flex flex-col items-center p-10 rounded-[2rem] border bg-white/80 hover:bg-white border-white shadow-xl hover:shadow-2xl hover:-translate-y-1 cursor-pointer transition-all duration-300 w-full"
                    >
                        <div className="w-20 h-20 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mb-6 text-4xl shadow-lg transition-transform group-hover:scale-110">
                            <span className="material-symbols-outlined">inventory_2</span>
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2">{t('员工', 'Staff')}</h3>
                        <p className="text-sm text-slate-500 font-medium uppercase tracking-widest mb-4">{t('记录与操作', 'Recording')}</p>
                        <p className="text-slate-600 text-center leading-relaxed">
                            {t('专注于每日盘点与基础设置。', 'Focus on Daily Counts and basic settings.')}
                        </p>
                    </button>
                </div>
            </div>
        </div>
    );
}
