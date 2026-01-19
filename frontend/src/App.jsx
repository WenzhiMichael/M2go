import React, { useState } from 'react';
import DailyCount from './pages/DailyCount';
import ConversionSetup from './pages/ConversionSetup';
import OrderSuggestions from './pages/OrderSuggestions';
import Products from './pages/Products';

function App() {
  const [page, setPage] = useState('daily');

  return (
    <div>
      <header>
        <h1>M2GO 订货助手</h1>
      </header>
      <nav>
        <a href="#" className={page === 'daily' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setPage('daily'); }}>每日盘点</a>
        <a href="#" className={page === 'conversion' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setPage('conversion'); }}>换算设置</a>
        <a href="#" className={page === 'order' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setPage('order'); }}>订货建议</a>
        <a href="#" className={page === 'products' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setPage('products'); }}>商品与规格</a>
      </nav>
      <main>
        {page === 'daily' && <DailyCount />}
        {page === 'conversion' && <ConversionSetup />}
        {page === 'order' && <OrderSuggestions />}
        {page === 'products' && <Products />}
      </main>
    </div>
  );
}

export default App;
