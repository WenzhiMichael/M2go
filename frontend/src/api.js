import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*, variants(*)')
    .eq('is_active', true);
  if (error) throw error;
  return data || [];
}

export async function createProduct(data) {
  const { data: created, error } = await supabase
    .from('products')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return created;
}

export async function updateProduct(id, data) {
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
  const { error } = await supabase.rpc('apply_daily_count', {
    p_date: data.date,
    p_variant_id: data.variant_id,
    p_counted_qty: data.counted_qty
  });
  if (error) throw error;
  return { status: "ok" };
}

export async function createVariant(data) {
  const { data: created, error } = await supabase
    .from('variants')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return created;
}

export async function updateVariant(id, data) {
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
  const { error } = await supabase
    .from('variants')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return { status: "ok" };
}

export async function getOrderSuggestions(type) {
  const res = await fetch(`${API_URL}/orders/suggestion?order_type=${type}`);
  return res.json();
}

export async function createOrder(payload) {
  const res = await fetch(`${API_URL}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function exportOrder(orderId) {
  const res = await fetch(`${API_URL}/orders/${orderId}/export`);
  return res.blob();
}

export async function getSettings() {
  const res = await fetch(`${API_URL}/settings`);
  return res.json();
}

export async function updateSettings(data) {
  const res = await fetch(`${API_URL}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}
