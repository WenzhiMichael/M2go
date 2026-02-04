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
import { supabase, supabaseReady } from './supabase';
import { useLang } from './i18n';
import { useUserRole } from './context/UserRoleContext';

function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
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

  const handleAuth = async () => {
    setLoading(true);
    setMessage('');
    const withTimeout = (promise, ms) => new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), ms);
      promise.then((val) => {
        clearTimeout(timer);
        resolve(val);
      }).catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    try {
      if (authMode === 'login') {
        if (!email || !password) {
          setMessage(t('请输入邮箱和密码', 'Please enter email and password.'));
          return;
        }
        const { data, error } = await withTimeout(
          supabase.auth.signInWithPassword({ email, password }),
          8000
        );
        if (error) {
          setMessage(`${t('登录失败：', 'Login failed: ')}${error.message}`);
        } else if (data?.session) {
          sessionStorage.setItem('m2go_auth_ok', '1');
        }
      } else if (authMode === 'signup') {
        // Client-side password checks (match current Supabase settings)
        const pw = password || '';
        const hasLetter = /[A-Za-z]/.test(pw);
        const hasDigit = /\d/.test(pw);
        if (!email) {
          setMessage(t('请输入邮箱', 'Please enter email.'));
          return;
        }
        if (pw.length < 10) {
          setMessage(t('密码太短：至少 10 位', 'Password too short: minimum 10 characters.'));
          return;
        }
        if (!hasLetter || !hasDigit) {
          setMessage(t('密码必须包含字母和数字', 'Password must include letters and digits.'));
          return;
        }
        const { data, error } = await withTimeout(
          supabase.auth.signUp({ email, password }),
          8000
        );
        if (error) {
          setMessage(`${t('注册失败：', 'Sign up failed: ')}${error.message}`);
        } else {
          setMessage(t('注册成功，请到邮箱完成验证后再登录', 'Account created. Verify email, then sign in.'));
          setAuthMode('login');
          if (data?.session) {
            sessionStorage.setItem('m2go_auth_ok', '1');
          }
        }
      }
    } catch (err) {
      if (err?.message === 'timeout') {
        setMessage(t('登录超时，请检查网络或稍后重试', 'Login timed out. Check network and retry.'));
      } else {
        setMessage(t('登录失败，请稍后重试', 'Login failed. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
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
              <div className="mt-2 text-[11px] text-slate-500">
                {t('密码要求：至少 10 位，包含字母和数字', 'Password: at least 10 characters, must include letters and digits.')}
              </div>
            </div>
          </div>

          <button
            className="btn-gradient mt-8 w-full py-4 rounded-xl font-black uppercase tracking-[0.2em] text-white shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
            onClick={handleAuth}
            disabled={loading}
          >
            {loading
              ? t('处理中...', 'Processing...')
              : authMode === 'login'
                ? t('进入系统', 'Enter System')
                : t('创建账号', 'Create Account')}
          </button>

          {message && (
            <div className="mt-4 text-center text-sm font-bold text-brand-red">{message}</div>
          )}

          <div className="mt-4 text-center text-xs text-slate-500 space-y-2">
            {authMode === 'login' ? (
              <button
                type="button"
                className="underline hover:text-brand-red"
                onClick={() => setAuthMode('signup')}
              >
                {t('没有账号？创建新账号', 'No account? Create one')}
              </button>
            ) : (
              <button
                type="button"
                className="underline hover:text-brand-red"
                onClick={() => setAuthMode('login')}
              >
                {t('已有账号？返回登录', 'Already have an account? Sign in')}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function EnvMissingScreen() {
  const { t } = useLang();
  return (
    <div className="min-h-screen bg-brand-cream text-slate-900 flex items-center justify-center px-6">
      <div className="max-w-xl w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-8 space-y-4">
        <div className="text-xs font-mono uppercase tracking-[0.3em] text-slate-400">{t('配置缺失', 'Config Missing')}</div>
        <h1 className="text-2xl font-black">{t('缺少 Supabase 环境变量', 'Supabase env vars missing')}</h1>
        <p className="text-sm text-slate-600">
          {t('请在 frontend/.env.local 中配置以下内容，然后重启 npm run dev。', 'Add the following to frontend/.env.local and restart npm run dev.')}
        </p>
        <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 text-xs overflow-auto">
{`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key`}
        </pre>
        <p className="text-xs text-slate-500">
          {t('配置完成后刷新页面即可进入登录界面。', 'Refresh after saving the env file.')}
        </p>
      </div>
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

  if (!supabaseReady) {
    return <EnvMissingScreen />;
  }

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
