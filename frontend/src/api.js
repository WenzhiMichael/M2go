import { supabase } from './supabase';

const ensureSupabase = () => {
  if (!supabase) {
    const err = new Error('Supabase 未配置，请先设置 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY。');
    err.code = 'SUPABASE_NOT_READY';
    throw err;
  }
};

const DEFAULT_SETTINGS = {
  lookback_days_for_usage: '14',
  safety_buffer_days: '0.8',
  cover_days_monday: '4',
  cover_days_friday: '4',
  cutoff_time: '17:00'
};

const SHRED_MIX_RATIOS = {
  '胡萝卜': 2.0,
  '洋葱': 1.0,
  '青葱': 1.0
};
const SHRED_FORMS = new Set(['PREP_shred', 'PREP_切丝']);

const CATEGORY_ZH = {
  protein: '蛋白',
  veg: '蔬菜',
  frozen: '冷冻'
};

const csvHeaders = ['供应商', '类别', '商品', '建议数量', '最终下单', '单位', '备注'];

const toNumber = (val, fallback = 0) => {
  const num = Number(val);
  return Number.isNaN(num) ? fallback : num;
};

const estimateUsage = (counts) => {
  if (!counts || counts.length < 3) {
    return { rate: 0, msg: '数据不足，日消耗按0估算；可手动设置或先积累盘点数据。' };
  }
  const usages = [];
  for (let i = 1; i < counts.length; i += 1) {
    const prev = toNumber(counts[i - 1].counted_qty, 0);
    const curr = toNumber(counts[i].counted_qty, 0);
    usages.push(Math.max(0, prev - curr));
  }
  if (usages.length === 0) {
    return { rate: 0, msg: '无消耗数据' };
  }
  const avg = usages.reduce((sum, v) => sum + v, 0) / usages.length;
  return { rate: avg, msg: `基于${usages.length}天记录` };
};

const getSettingsMap = async () => {
  ensureSupabase();
  const { data, error } = await supabase.from('settings').select('key,value');
  if (error) throw error;
  const map = { ...DEFAULT_SETTINGS };
  (data || []).forEach((row) => {
    map[row.key] = row.value;
  });
  return map;
};

const escapeCsv = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const buildCsv = (rows) => {
  const lines = [];
  lines.push(csvHeaders.map(escapeCsv).join(','));
  let lastGroup = null;
  rows.forEach((row) => {
    const group = `${row[0]}||${row[1]}`;
    if (lastGroup && group !== lastGroup) {
      lines.push('');
    }
    lines.push(row.map(escapeCsv).join(','));
    lastGroup = group;
  });
  return lines.join('\n');
};

export async function getProducts() {
  ensureSupabase();
  const { data, error } = await supabase
    .from('products')
    .select('*, variants(*)')
    .eq('is_active', true);
  if (error) throw error;
  return data || [];
}

export async function createProduct(data) {
  ensureSupabase();
  const { data: created, error } = await supabase
    .from('products')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return created;
}

export async function updateProduct(id, data) {
  ensureSupabase();
  const { data: updated, error } = await supabase
    .from('products')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return updated;
}

export async function deleteProduct(id) {
  ensureSupabase();
  const { data: updated, error } = await supabase
    .from('products')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return updated;
}

export async function saveDailyCount(data) {
  ensureSupabase();
  const { error } = await supabase.rpc('apply_daily_count', {
    p_date: data.date,
    p_variant_id: data.variant_id,
    p_counted_qty: data.counted_qty
  });
  if (error) throw error;
  return { status: 'ok' };
}

export async function createVariant(data) {
  ensureSupabase();
  const { data: created, error } = await supabase
    .from('variants')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return created;
}

export async function updateVariant(id, data) {
  ensureSupabase();
  const { data: updated, error } = await supabase
    .from('variants')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return updated;
}

export async function deleteVariant(id) {
  ensureSupabase();
  const { error } = await supabase
    .from('variants')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return { status: 'ok' };
}

export async function getOrderSuggestions(orderType) {
  ensureSupabase();
  const settings = await getSettingsMap();
  const lookbackDays = parseInt(settings.lookback_days_for_usage || DEFAULT_SETTINGS.lookback_days_for_usage, 10) || 14;
  const safetyBuffer = toNumber(settings.safety_buffer_days, toNumber(DEFAULT_SETTINGS.safety_buffer_days, 0.8));
  const coverKey = `cover_days_${(orderType || 'monday').toLowerCase()}`;
  const coverDays = toNumber(settings[coverKey], toNumber(DEFAULT_SETTINGS[coverKey], 4));

  const cutoffDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const [productsRes, countsRes, inventoryRes] = await Promise.all([
    supabase.from('products').select('*, variants(*)').eq('is_active', true),
    supabase.from('daily_counts').select('variant_id,date,counted_qty').gte('date', cutoffDate).order('date', { ascending: true }),
    supabase.from('inventory_balances').select('variant_id,on_hand')
  ]);

  if (productsRes.error) throw productsRes.error;
  if (countsRes.error) throw countsRes.error;
  if (inventoryRes.error) throw inventoryRes.error;

  const products = productsRes.data || [];
  const counts = countsRes.data || [];
  const balances = inventoryRes.data || [];

  const countsByVariant = new Map();
  counts.forEach((row) => {
    const list = countsByVariant.get(row.variant_id) || [];
    list.push(row);
    countsByVariant.set(row.variant_id, list);
  });
  countsByVariant.forEach((list) => {
    list.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  });

  const balanceMap = new Map(balances.map((row) => [row.variant_id, toNumber(row.on_hand, 0)]));

  const variantStats = new Map();
  let shredMixUsageBase = 0;
  let shredMixInventoryBase = 0;
  let shredMixMissingConversion = false;
  let shredMixInsufficient = false;
  const shredMixTotalRatio = Object.values(SHRED_MIX_RATIOS).reduce((sum, v) => sum + v, 0);

  products.forEach((product) => {
    (product.variants || []).forEach((variant) => {
      const list = countsByVariant.get(variant.id) || [];
      const { rate, msg } = estimateUsage(list);
      const onHand = balanceMap.get(variant.id) ?? 0;
      variantStats.set(variant.id, { rate, msg, onHand });

      if (SHRED_MIX_RATIOS[product.name_zh] && SHRED_FORMS.has(variant.form)) {
        if (variant.conversion_to_base !== null && variant.conversion_to_base !== undefined) {
          shredMixUsageBase += rate * variant.conversion_to_base;
          shredMixInventoryBase += onHand * variant.conversion_to_base;
        } else {
          shredMixMissingConversion = true;
        }
        if (msg.startsWith('数据不足')) {
          shredMixInsufficient = true;
        }
      }
    });
  });

  const suggestions = [];

  products.forEach((product) => {
    let dailyDemandBase = 0;
    let currentInventoryBase = 0;
    let missingConversion = false;
    let dataInsufficient = false;
    const details = [];

    (product.variants || []).forEach((variant) => {
      if (SHRED_MIX_RATIOS[product.name_zh] && SHRED_FORMS.has(variant.form)) {
        return;
      }
      const stats = variantStats.get(variant.id) || { rate: 0, msg: '数据不足，日消耗按0估算；可手动设置或先积累盘点数据。', onHand: 0 };
      if (stats.msg.startsWith('数据不足')) {
        dataInsufficient = true;
      }
      if (variant.conversion_to_base !== null && variant.conversion_to_base !== undefined) {
        dailyDemandBase += stats.rate * variant.conversion_to_base;
        currentInventoryBase += stats.onHand * variant.conversion_to_base;
        details.push(`${variant.display_name_zh}: rate=${stats.rate.toFixed(2)}, stock=${stats.onHand}`);
      } else {
        missingConversion = true;
        details.push(`${variant.display_name_zh}: [无换算] rate=${stats.rate.toFixed(2)}, stock=${stats.onHand}`);
      }
    });

    if (SHRED_MIX_RATIOS[product.name_zh]) {
      const ratio = shredMixTotalRatio > 0 ? SHRED_MIX_RATIOS[product.name_zh] / shredMixTotalRatio : 0;
      dailyDemandBase += shredMixUsageBase * ratio;
      currentInventoryBase += shredMixInventoryBase * ratio;
      details.push(`丝混合池(2:1:1) 分配系数=${ratio.toFixed(2)}`);

      if (shredMixMissingConversion) missingConversion = true;
      if (shredMixInsufficient) dataInsufficient = true;
    }

    const targetStock = dailyDemandBase * coverDays + safetyBuffer * dailyDemandBase;
    const qRaw = Math.max(0, targetStock - currentInventoryBase);

    let finalQty = qRaw;
    let unit = '基准单位(份)';
    const notes = [];
    let loadingRisk = false;

    if (missingConversion) {
      notes.push('警告: 缺少换算，订货可能不准，请先补全换算。');
    }
    if (dataInsufficient) {
      notes.push('数据不足，日消耗按0估算；可手动设置或先积累盘点数据。');
    }
    if (dailyDemandBase > 0 && currentInventoryBase / dailyDemandBase < coverDays) {
      loadingRisk = true;
      notes.push('风险: 可能撑不到下次到货');
    }

    if (product.category === 'protein') {
      const pack = toNumber(product.case_pack, 0);
      if (pack > 0) {
        const cases = Math.ceil(qRaw / pack);
        finalQty = cases;
        unit = '箱';
        notes.push(`整箱取整: ${qRaw.toFixed(2)}->${cases}箱 (规格${pack})`);
      } else {
        notes.push('错误: 缺少整箱规格 (case_pack)');
      }
    } else if (product.min_order_qty && finalQty > 0 && finalQty < product.min_order_qty) {
      finalQty = product.min_order_qty;
      notes.push(`满足起订量: ${product.min_order_qty}`);
    }

    const reason = {
      cover_days: coverDays,
      daily_demand: dailyDemandBase,
      safety_buffer: safetyBuffer,
      target_stock: targetStock,
      current_inventory: currentInventoryBase,
      q_raw: qRaw,
      details
    };

    if (finalQty > 0 || missingConversion) {
      suggestions.push({
        product_id: product.id,
        product_name_zh: product.name_zh,
        product_category: product.category,
        product_sort_order: product.sort_order,
        suggested_qty: finalQty,
        final_qty: finalQty,
        unit,
        reason_json: reason,
        notes: notes.join('; '),
        loading_risk: loadingRisk
      });
    }
  });

  return suggestions;
}

export async function createOrder(payload) {
  ensureSupabase();
  const orderPayload = payload?.order || payload;
  const { data: order, error } = await supabase
    .from('orders')
    .insert(orderPayload)
    .select()
    .single();
  if (error) throw error;

  const lines = payload?.lines || [];
  if (lines.length > 0) {
    const { error: lineError } = await supabase
      .from('order_lines')
      .insert(lines.map((line) => ({ ...line, order_id: order.id })));
    if (lineError) throw lineError;
  }
  return order;
}

export async function exportOrder(orderId) {
  ensureSupabase();
  let { data: lines, error } = await supabase
    .from('order_lines')
    .select('*, product:products(*)')
    .eq('order_id', orderId);

  if (error) {
    const fallback = await supabase.from('order_lines').select('*').eq('order_id', orderId);
    if (fallback.error) throw fallback.error;
    const productsRes = await supabase.from('products').select('id,name_zh,category,supplier');
    if (productsRes.error) throw productsRes.error;
    const productMap = new Map((productsRes.data || []).map((p) => [p.id, p]));
    lines = (fallback.data || []).map((line) => ({
      ...line,
      product: productMap.get(line.product_id) || null
    }));
  }

  const rows = (lines || []).map((line) => {
    const product = line.product || {};
    return [
      product.supplier || '',
      CATEGORY_ZH[product.category] || product.category || '',
      product.name_zh || '',
      line.suggested_qty ?? 0,
      line.final_qty ?? 0,
      line.unit || '',
      line.notes || ''
    ];
  });

  rows.sort((a, b) => {
    if (a[0] !== b[0]) return a[0].localeCompare(b[0], 'zh');
    if (a[1] !== b[1]) return a[1].localeCompare(b[1], 'zh');
    return a[2].localeCompare(b[2], 'zh');
  });

  const csvContent = buildCsv(rows);
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
}

export async function getSettings() {
  ensureSupabase();
  const { data, error } = await supabase.from('settings').select('key,value');
  if (error) throw error;
  return data || [];
}

export async function updateSettings(data) {
  ensureSupabase();
  const entries = Object.entries(data || {}).map(([key, value]) => ({
    key,
    value: String(value)
  }));
  if (entries.length === 0) return { status: 'ok' };
  const { error } = await supabase.from('settings').upsert(entries, { onConflict: 'key' });
  if (error) throw error;
  return { status: 'ok' };
}
