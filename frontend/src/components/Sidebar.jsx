import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { useLang } from '../i18n';
import { useUserRole } from '../context/UserRoleContext';
import { supabase } from '../supabase';

export default function Sidebar() {
    const location = useLocation();
    const { t } = useLang();
    const { mode } = useUserRole();
    const handleLogout = async () => {
        sessionStorage.removeItem('m2go_auth_ok');
        await supabase.auth.signOut();
    };

    const isActive = (path) => {
        return location.pathname === path;
    };

    const navItemClass = (path) => clsx(
        "flex items-center px-3 py-3 lg:px-6 lg:py-4 rounded-xl lg:rounded-r-full lg:rounded-l-xl transition-all group",
        isActive(path)
            ? "bg-white/10 text-white font-bold"
            : "hover:bg-white/5 text-white/70 hover:text-white"
    );

    // Filter logic: Only show full menu if mode is manager
    const showAll = mode === 'manager';

    return (
        <aside className="hidden md:flex flex-col w-24 lg:w-72 bg-brand-red text-white h-full shadow-2xl z-50 transition-all duration-300">
            <Link to={showAll ? "/dashboard" : "/daily-count"} className="p-6 flex items-center justify-center lg:justify-start border-b border-white/10 hover:bg-white/5 transition-colors">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-brand-red font-black text-2xl flex-shrink-0 shadow-lg">m</div>
                <div className="ml-4 hidden lg:block">
                    <h1 className="font-black text-xl tracking-tighter leading-none">M2GO</h1>
                    <p className="text-[10px] font-bold tracking-[0.2em] opacity-80">
                        {showAll ? t('厨房系统', 'KITCHEN OS') : t('员工入口', 'STAFF MODE')}
                    </p>
                </div>
            </Link>

            <nav className="flex-1 py-8 space-y-2 overflow-y-auto custom-scrollbar px-3">
                {showAll && (
                    <Link to="/dashboard" className={navItemClass('/dashboard')}>
                        <span className="material-symbols-outlined text-2xl">dashboard</span>
                        <span className="ml-4 hidden lg:block tracking-wide">{t('仪表盘', 'Dashboard')}</span>
                    </Link>
                )}

                <Link to="/daily-count" className={navItemClass('/daily-count')}>
                    <span className="material-symbols-outlined text-2xl">inventory_2</span>
                    <span className="ml-4 hidden lg:block tracking-wide">{t('每日盘点', 'Daily Count')}</span>
                </Link>

                {showAll && (
                    <>
                        <Link to="/conversion-setup" className={navItemClass('/conversion-setup')}>
                            <span className="material-symbols-outlined text-2xl">tune</span>
                            <span className="ml-4 hidden lg:block tracking-wide">{t('换算设置', 'Conversions')}</span>
                        </Link>
                        <Link to="/order-suggestions" className={navItemClass('/order-suggestions')}>
                            <span className="material-symbols-outlined text-2xl">receipt_long</span>
                            <span className="ml-4 hidden lg:block tracking-wide">{t('订货建议', 'Orders')}</span>
                        </Link>
                        <Link to="/products" className={navItemClass('/products')}>
                            <span className="material-symbols-outlined text-2xl">soup_kitchen</span>
                            <span className="ml-4 hidden lg:block tracking-wide">{t('商品与规格', 'Products')}</span>
                        </Link>
                        <Link to="/analytics" className={navItemClass('/analytics')}>
                            <span className="material-symbols-outlined text-2xl">trending_up</span>
                            <span className="ml-4 hidden lg:block tracking-wide">{t('分析', 'Analytics')}</span>
                        </Link>
                    </>
                )}
            </nav>

            <div className="p-6 border-t border-white/10">
                <Link to="/settings" className={clsx(
                    "flex items-center justify-center lg:justify-start transition-colors",
                    isActive('/settings') ? "text-white" : "text-white/60 hover:text-white"
                )}>
                    <span className="material-symbols-outlined">settings</span>
                    <span className="ml-4 hidden lg:block text-sm font-bold uppercase tracking-widest">{t('设置', 'Settings')}</span>
                </Link>
                <button
                    onClick={handleLogout}
                    className="mt-4 w-full flex items-center justify-center lg:justify-start text-white/60 hover:text-white transition-colors"
                >
                    <span className="material-symbols-outlined">logout</span>
                    <span className="ml-4 hidden lg:block text-sm font-bold uppercase tracking-widest">{t('登出', 'Sign Out')}</span>
                </button>
            </div>
        </aside>
    );
}
