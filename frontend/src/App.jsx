import React, { useEffect, useState, useMemo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DailyCount from './pages/DailyCount';
import ConversionSetup from './pages/ConversionSetup';
import OrderSuggestions from './pages/OrderSuggestions';
import Products from './pages/Products';
import Settings from './pages/Settings';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import SelectMode from './pages/SelectMode';
import Layout from './components/Layout';
import { supabase } from './supabase';
import { useLang } from './i18n';
import { useUserRole } from './context/UserRoleContext';

function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [now, setNow] = useState(() => new Date());
  const { t } = useLang();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeLabel = useMemo(() => {
    const date = now.toLocaleDateString('zh-CN');
    const time = now.toLocaleTimeString('zh-CN', { hour12: false });
    return `${date} // ${time}`;
  }, [now]);

  const handleLogin = async () => {
    setLoading(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(t('登录失败，请检查邮箱或密码', 'Login failed. Please check email or password.'));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen text-slate-900 relative">
      <div className="crt-subtle"></div>
      <header className="w-full bg-white/80 text-slate-900 px-6 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl border-b border-slate-200/60 relative z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-brand-red text-3xl">inventory_2</span>
            <div>
              <div className="text-[11px] font-mono tracking-[0.3em] text-slate-500">M2GO OPS</div>
              <div className="text-base font-semibold text-slate-900">{t('订货与库存', 'Procurement & Inventory')}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 font-mono text-[10px] text-slate-600">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="opacity-70">{t('在线', 'Online')}</span>
            </div>
            <div className="bg-slate-900/5 px-3 py-1 rounded-full border border-slate-200/70">{timeLabel}</div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl items-center justify-center px-6 py-16 relative z-10">
        <div className="glass-panel w-full max-w-md rounded-[2rem] p-8 border border-white/60 shadow-xl">
          <div className="mb-6">
            <span className="text-[10px] font-mono font-bold text-brand-red tracking-[0.3em] uppercase">{t('安全登录', 'Secure Access')}</span>
            <h2 className="mt-2 text-2xl font-black text-slate-900 font-sans">{t('登录控制台', 'Sign in')}</h2>
            <p className="mt-2 text-sm text-slate-500 font-serif italic">{t('请使用管理员账号登录系统', 'Use admin account to sign in.')}</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-slate-600 uppercase tracking-widest text-[10px]">{t('邮箱', 'Email')}</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none transition-all"
                placeholder="name@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-600 uppercase tracking-widest text-[10px]">{t('密码', 'Password')}</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none transition-all"
                placeholder={t('请输入密码', 'Enter password')}
              />
            </div>
          </div>

          <button
            className="btn-gradient mt-8 w-full py-4 rounded-xl font-black uppercase tracking-[0.2em] text-white shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? t('登录中...', 'Signing in...') : t('进入系统', 'Enter System')}
          </button>

          {message && (
            <div className="mt-4 text-center text-sm font-bold text-brand-red">{message}</div>
          )}
        </div>
      </main>
    </div>
  );
}

function RequireManager({ children }) {
    const { mode, role } = useUserRole();
    // If not manager mode (or not manager role), redirect to daily count
    // But allow if we are just switching (maybe loading?)
    // Actually loading is handled in App.

    if (mode !== 'manager' || role !== 'manager') {
        return <Navigate to="/daily-count" replace />;
    }
    return children;
}

function App() {
  const { user, loading, mode } = useUserRole();
  const { t } = useLang();

  if (loading) {
    return (
      <div className="min-h-screen text-slate-700 flex items-center justify-center bg-brand-cream">
        <div className="bg-white rounded-2xl px-6 py-4 text-sm font-mono tracking-widest text-slate-500 shadow-xl border border-white/50">
          {t('系统启动中', 'Loading...')}
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <Routes>
      <Route path="/select-mode" element={<SelectMode />} />

      <Route path="/*" element={
        !mode ? <Navigate to="/select-mode" replace /> : (
          <Layout>
            <Routes>
              <Route path="/" element={<Navigate to={mode === 'manager' ? "/dashboard" : "/daily-count"} replace />} />

              {/* Shared Routes */}
              <Route path="/daily-count" element={<DailyCount />} />
              <Route path="/settings" element={<Settings />} />

              {/* Manager Only Routes */}
              <Route path="/dashboard" element={<RequireManager><Dashboard /></RequireManager>} />
              <Route path="/conversion-setup" element={<RequireManager><ConversionSetup /></RequireManager>} />
              <Route path="/order-suggestions" element={<RequireManager><OrderSuggestions /></RequireManager>} />
              <Route path="/products" element={<RequireManager><Products /></RequireManager>} />
              <Route path="/analytics" element={<RequireManager><Analytics /></RequireManager>} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        )
      } />
    </Routes>
  );
}

export default App;
