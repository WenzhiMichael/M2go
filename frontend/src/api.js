const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function getProducts() {
  const res = await fetch(`${API_URL}/products`);
  return res.json();
}

export async function createProduct(data) {
  const res = await fetch(`${API_URL}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateProduct(id, data) {
  const res = await fetch(`${API_URL}/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteProduct(id) {
  const res = await fetch(`${API_URL}/products/${id}`, {
    method: "DELETE",
  });
  return res.json();
}

export async function saveDailyCount(data) {
  const res = await fetch(`${API_URL}/daily_counts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function createVariant(data) {
  const res = await fetch(`${API_URL}/variants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateVariant(id, data) {
  const res = await fetch(`${API_URL}/variants/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
    return res.json();
}

export async function deleteVariant(id) {
  const res = await fetch(`${API_URL}/variants/${id}`, {
    method: "DELETE",
  });
  return res.json();
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
