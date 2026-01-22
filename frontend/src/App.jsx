import React, { useState } from 'react';
import DailyCount from './pages/DailyCount';
import ConversionSetup from './pages/ConversionSetup';
import OrderSuggestions from './pages/OrderSuggestions';
import Products from './pages/Products';

function App() {
  const [page, setPage] = useState('daily');

  const tabClass = (key) =>
    `px-4 py-2 text-sm font-semibold border-b-2 transition ${
      page === key ? 'border-[#C5A572] text-gray-900' : 'border-transparent text-gray-500'
    }`;

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-gray-800">
      <header className="w-full bg-gray-900 text-white">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <h1 className="text-xl font-semibold tracking-wide">M2GO 订货助手</h1>
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
