import React, { useState, useEffect, useCallback } from 'react';
import { useLang } from '../i18n';
import { useUserRole } from '../context/UserRoleContext';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';

function TeamManagement() {
    const { t } = useLang();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user: currentUser } = useUserRole();

    const fetchUsers = useCallback(async () => {
        const { data, error } = await supabase
            .from('user_roles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
        } else if (data) {
            setUsers(data);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchUsers();
    }, [fetchUsers]);

    const toggleRole = async (targetUser) => {
        // Prevent changing own role (safety)
        if (targetUser.user_id === currentUser.id) {
            alert(t('不能更改自己的权限', 'Cannot change your own role.'));
            return;
        }

        const newRole = targetUser.role === 'manager' ? 'staff' : 'manager';
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

    return (
        <section className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-black uppercase tracking-wide text-gray-900">
                        {t('团队管理', 'Team Management')}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                        {t('管理成员权限（经理/员工）', 'Manage member roles (Manager/Staff)')}
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                {users.map(u => (
                    <div key={u.user_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white
                                ${u.role === 'manager' ? 'bg-brand-red' : 'bg-emerald-500'}
                            `}>
                                {u.role === 'manager' ? 'M' : 'S'}
                            </div>
                            <div>
                                <div className="font-bold text-slate-800 text-sm">{u.email || 'User'}</div>
                                <div className="text-[10px] text-slate-400 uppercase tracking-widest">{u.role}</div>
                            </div>
                        </div>
                        {u.user_id !== currentUser.id && (
                            <button
                                onClick={() => toggleRole(u)}
                                className="px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-brand-red transition-colors"
                            >
                                {u.role === 'manager' ? t('设为员工', 'Set as Staff') : t('设为经理', 'Set as Manager')}
                            </button>
                        )}
                         {u.user_id === currentUser.id && (
                            <span className="text-[10px] text-slate-400 italic px-3">{t('（你）', '(You)')}</span>
                        )}
                    </div>
                ))}
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
