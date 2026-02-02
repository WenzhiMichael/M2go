import React, { useEffect, useMemo, useState } from 'react';
import DailyCount from './pages/DailyCount';
import ConversionSetup from './pages/ConversionSetup';
import OrderSuggestions from './pages/OrderSuggestions';
import Products from './pages/Products';
import { supabase } from './supabase';

function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [now, setNow] = useState(() => new Date());

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
      setMessage('登录失败，请检查邮箱或密码');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen text-slate-900 relative">
      <div className="crt-subtle"></div>
      <header className="w-full bg-white/80 text-slate-900 px-6 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl border-b border-slate-200/60 relative z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-[#0f766e] text-3xl">inventory_2</span>
            <div>
              <div className="text-[11px] font-mono tracking-[0.3em] text-slate-500">M2GO OPS</div>
              <div className="text-base font-semibold text-slate-900">订货与库存中台</div>
            </div>
          </div>
          <div className="flex items-center gap-4 font-mono text-[10px] text-slate-600">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="opacity-70">在线</span>
            </div>
            <div className="bg-slate-900/5 px-3 py-1 rounded-full border border-slate-200/70">{timeLabel}</div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl items-center justify-center px-6 py-16 relative z-10">
        <div className="neumorphic-inset w-full max-w-md rounded-[2rem] p-8 border border-white/60">
          <div className="mb-6">
            <span className="text-[10px] font-mono font-bold text-[#0f766e] tracking-[0.3em] uppercase">Secure Access</span>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">登录控制台</h2>
            <p className="mt-2 text-sm text-slate-500">请使用管理员提供的账号登录系统。</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-600">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="mt-2"
                placeholder="name@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-600">密码</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="mt-2"
                placeholder="请输入密码"
              />
            </div>
          </div>

          <button
            className="primary mt-6 w-full rounded-xl font-semibold uppercase tracking-[0.2em]"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? '登录中...' : '进入系统'}
          </button>

          {message && (
            <div className="mt-4 text-center text-sm font-semibold text-red-600">{message}</div>
          )}
        </div>
      </main>
    </div>
  );
}

function App() {
  const [page, setPage] = useState('daily');
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session || null);
      setChecking(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeLabel = useMemo(() => {
    const date = now.toLocaleDateString('zh-CN');
    const time = now.toLocaleTimeString('zh-CN', { hour12: false });
    return `${date} // ${time}`;
  }, [now]);

  const tabClass = (key) =>
    `text-xs font-mono uppercase tracking-widest transition ${
      page === key
        ? 'text-[#0f766e] opacity-100'
        : 'text-slate-500 hover:text-slate-800'
    }`;

  if (checking) {
    return (
      <div className="min-h-screen text-slate-700 flex items-center justify-center">
        <div className="neumorphic-inset rounded-2xl px-6 py-4 text-sm font-mono tracking-widest text-slate-500">
          系统启动中...
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen text-slate-900 relative">
      <div className="crt-subtle"></div>
      <header className="w-full bg-white/80 text-slate-900 px-6 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl border-b border-slate-200/60 relative z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#0f766e] text-3xl">inventory_2</span>
              <div>
                <div className="text-[11px] font-mono tracking-[0.3em] text-slate-500">M2GO OPS</div>
                <div className="text-sm md:text-base font-semibold text-slate-900">订货与库存中台</div>
              </div>
            </div>
            <div className="hidden h-7 w-px bg-slate-200 md:block"></div>
            <nav className="hidden md:flex items-center gap-6">
              <button className={tabClass('daily')} onClick={() => setPage('daily')}>每日盘点</button>
              <button className={tabClass('conversion')} onClick={() => setPage('conversion')}>换算设置</button>
              <button className={tabClass('order')} onClick={() => setPage('order')}>订货建议</button>
              <button className={tabClass('products')} onClick={() => setPage('products')}>商品与规格</button>
            </nav>
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px] text-slate-600">
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 border border-emerald-100">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="opacity-80">同步中</span>
            </div>
            <div className="bg-slate-900/5 px-3 py-1 rounded-full border border-slate-200/70">{timeLabel}</div>
            <button
              className="secondary px-3 py-1 rounded-full text-[10px] uppercase tracking-widest text-slate-600 hover:text-slate-900"
              onClick={() => supabase.auth.signOut()}
            >
              退出登录
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 md:hidden font-mono text-[10px] uppercase tracking-widest text-slate-500">
          <button className={tabClass('daily')} onClick={() => setPage('daily')}>每日盘点</button>
          <button className={tabClass('conversion')} onClick={() => setPage('conversion')}>换算设置</button>
          <button className={tabClass('order')} onClick={() => setPage('order')}>订货建议</button>
          <button className={tabClass('products')} onClick={() => setPage('products')}>商品与规格</button>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-1 flex-col px-6 py-8 relative z-10">
        {page === 'daily' && <DailyCount />}
        {page === 'conversion' && <ConversionSetup />}
        {page === 'order' && <OrderSuggestions />}
        {page === 'products' && <Products />}
      </main>
    </div>
  );
}

export default App;

