import React, { useState, useEffect, useCallback } from 'react';
import { useLang } from '../i18n';
import { useUserRole } from '../context/UserRoleContext';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';

function TeamManagement() {
    const { t } = useLang();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const { user: currentUser } = useUserRole();

    const fetchUsers = useCallback(async () => {
        const { data, error } = await supabase
            .from('user_roles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
            setErrorMsg(t('加载成员失败，请检查权限或稍后重试', 'Failed to load team. Check permissions or try again.'));
        } else if (data) {
            setUsers(data);
            setErrorMsg('');
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchUsers();
    }, [fetchUsers]);

    const promoteToManager = async (targetUser) => {
        // Prevent changing own role (safety)
        if (targetUser.user_id === currentUser.id) {
            alert(t('不能更改自己的权限', 'Cannot change your own role.'));
            return;
        }

        if (targetUser.role === 'manager') {
            alert(t('经理不能降级为员工', 'Managers cannot be downgraded.'));
            return;
        }

        const newRole = 'manager';
        const { error } = await supabase
            .from('user_roles')
            .update({ role: newRole })
            .eq('user_id', targetUser.user_id);

        if (!error) {
            fetchUsers();
        } else {
            alert('Error updating role');
        }
    };

    if (loading) return <div className="p-4 text-center text-slate-400">Loading team...</div>;

    const managers = users.filter(u => u.role === 'manager');
    const staff = users.filter(u => u.role !== 'manager');

    return (
        <section className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-black uppercase tracking-wide text-gray-900">
                        {t('团队管理', 'Team Management')}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                        {t('仅支持升级为经理（不可降级）', 'Only promote to Manager (no demotion)')}
                    </p>
                </div>
            </div>

            {errorMsg && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                    {errorMsg}
                </div>
            )}

            <div className="space-y-6">
                <div className="space-y-3">
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        {t('经理', 'Managers')}
                    </div>
                    {managers.length === 0 && (
                        <div className="text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-xl p-4">
                            {t('暂无经理', 'No managers yet')}
                        </div>
                    )}
                    {managers.map(u => (
                        <div key={u.user_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white bg-brand-red">
                                    M
                                </div>
                                <div>
                                    <div className="font-bold text-slate-800 text-sm">{u.email || 'User'}</div>
                                    <div className="text-[10px] text-slate-400 uppercase tracking-widest">manager</div>
                                </div>
                            </div>
                            {u.user_id === currentUser.id && (
                                <span className="text-[10px] text-slate-400 italic px-3">{t('（你）', '(You)')}</span>
                            )}
                        </div>
                    ))}
                </div>

                <div className="space-y-3">
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        {t('员工', 'Staff')}
                    </div>
                    {staff.length === 0 && (
                        <div className="text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-xl p-4">
                            {t('暂无员工', 'No staff yet')}
                        </div>
                    )}
                    {staff.map(u => (
                        <div key={u.user_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white bg-emerald-500">
                                    S
                                </div>
                                <div>
                                    <div className="font-bold text-slate-800 text-sm">{u.email || 'User'}</div>
                                    <div className="text-[10px] text-slate-400 uppercase tracking-widest">staff</div>
                                </div>
                            </div>
                            {u.user_id !== currentUser.id && (
                                <button
                                    onClick={() => promoteToManager(u)}
                                    className="px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-brand-red transition-colors"
                                >
                                    {t('升级为经理', 'Upgrade')}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function Settings() {
    const { mode: langMode, setMode: setLangMode, t } = useLang();
    const { mode: appMode, setMode: setAppMode, role } = useUserRole();
    const navigate = useNavigate();

    const handleSwitchMode = () => {
        // Clear mode and go to select screen
        setAppMode(null);
        navigate('/select-mode');
    };

    const handleLogout = async () => {
        sessionStorage.removeItem('m2go_auth_ok');
        await supabase.auth.signOut();
        // Redirect handled by App/UserRoleContext
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <div className="border-b-2 border-brand-red/10 pb-6 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-brand-red uppercase tracking-tight">
                        {t('设置', 'Settings')}
                    </h2>
                    <p className="mt-2 text-gray-500 font-serif italic">
                        {t('配置系统显示与偏好', 'Configure display and preferences')}
                    </p>
                </div>
                <div className="flex gap-4">
                     <button
                        onClick={handleSwitchMode}
                        className="text-sm font-bold text-slate-500 hover:text-brand-red underline"
                    >
                        {t('切换模式', 'Switch Mode')}
                    </button>
                     <button
                        onClick={handleLogout}
                        className="text-sm font-bold text-slate-500 hover:text-brand-red underline"
                    >
                        {t('登出', 'Sign Out')}
                    </button>
                </div>
            </div>

            {/* Language Settings - Visible to Everyone */}
            <section className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-wide text-gray-900">
                            {t('语言模式', 'Language Mode')}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                            {t('选择显示双语或仅英文', 'Choose bilingual or English-only display')}
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 cursor-pointer">
                        <div className="flex items-center gap-3">
                            <input
                                type="radio"
                                name="langMode"
                                value="bilingual"
                                checked={langMode === 'bilingual'}
                                onChange={() => setLangMode('bilingual')}
                                className="h-4 w-4 text-brand-red border-gray-300 focus:ring-brand-red"
                            />
                            <div>
                                <div className="text-sm font-bold text-gray-800">
                                    {t('双语（中文 / English）', 'Bilingual (中文 / English)')}
                                </div>
                                <div className="text-[10px] text-gray-400 uppercase tracking-widest">
                                    {t('推荐', 'Recommended')}
                                </div>
                            </div>
                        </div>
                    </label>

                    <label className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 cursor-pointer">
                        <div className="flex items-center gap-3">
                            <input
                                type="radio"
                                name="langMode"
                                value="en"
                                checked={langMode === 'en'}
                                onChange={() => setLangMode('en')}
                                className="h-4 w-4 text-brand-red border-gray-300 focus:ring-brand-red"
                            />
                            <div>
                                <div className="text-sm font-bold text-gray-800">
                                    {t('仅英文', 'English only')}
                                </div>
                                <div className="text-[10px] text-gray-400 uppercase tracking-widest">
                                    {t('简洁', 'Minimal')}
                                </div>
                            </div>
                        </div>
                    </label>
                </div>
            </section>

            {/* Manager Only Settings */}
            {appMode === 'manager' && role === 'manager' && (
                <TeamManagement />
            )}

             {/* Info for Staff */}
             {appMode === 'staff' && (
                 <div className="text-center text-slate-400 text-xs mt-8">
                     {t('您当前处于员工模式。如需更多权限请联系经理。', 'You are in Staff Mode. Contact a manager for more permissions.')}
                 </div>
             )}
        </div>
    );
}

export default Settings;
