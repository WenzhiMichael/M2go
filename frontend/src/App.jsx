import React, { useEffect, useState } from 'react';
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
    <div className="min-h-screen bg-[#FDFBF7] text-gray-800">
      <header className="w-full bg-gray-900 text-white">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <h1 className="text-xl font-semibold tracking-wide">M2GO 订货助手</h1>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-2xl border border-[#C5A572] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">登录</h2>
          <p className="mt-2 text-sm text-gray-600">请使用管理员提供的账号登录</p>

          <div className="mt-5 space-y-3">
            <div>
              <label className="text-sm font-semibold text-gray-700">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#C5A572] bg-white px-4 py-2 text-sm text-gray-900"
                placeholder="name@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">密码</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#C5A572] bg-white px-4 py-2 text-sm text-gray-900"
                placeholder="请输入密码"
              />
            </div>
          </div>

          <button
            className="mt-6 w-full rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? '登录中...' : '登录'}
          </button>

          {message && (
            <div className="mt-3 text-center text-sm font-semibold text-red-700">{message}</div>
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

  const tabClass = (key) =>
    `px-4 py-2 text-sm font-semibold border-b-2 transition ${
      page === key ? 'border-[#C5A572] text-gray-900' : 'border-transparent text-gray-500'
    }`;

  if (checking) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] text-gray-800">
        <div className="mx-auto flex max-w-6xl items-center justify-center px-6 py-12 text-sm text-gray-600">
          正在加载...
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-gray-800">
      <header className="w-full bg-gray-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <h1 className="text-xl font-semibold tracking-wide">M2GO 订货助手</h1>
          <button
            className="rounded-xl border border-white/40 px-3 py-1 text-xs font-semibold text-white/90 hover:bg-white/10"
            onClick={() => supabase.auth.signOut()}
          >
            退出登录
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6">
        <nav className="mt-4 inline-flex rounded-full bg-white/90 px-3 py-2 shadow-sm">
          <button className={tabClass('daily')} onClick={() => setPage('daily')}>每日盘点</button>
          <button className={tabClass('conversion')} onClick={() => setPage('conversion')}>换算设置</button>
          <button className={tabClass('order')} onClick={() => setPage('order')}>订货建议</button>
          <button className={tabClass('products')} onClick={() => setPage('products')}>商品与规格</button>
        </nav>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-6">
        {page === 'daily' && <DailyCount />}
        {page === 'conversion' && <ConversionSetup />}
        {page === 'order' && <OrderSuggestions />}
        {page === 'products' && <Products />}
      </main>
    </div>
  );
}

export default App;
