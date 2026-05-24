const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function buildUrl(path, params) {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  let url = path.startsWith('http') ? path : `${base}${path}`;
  if (params && Object.keys(params).length) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
    }
    const qs = q.toString();
    if (qs) url += (url.includes('?') ? '&' : '?') + qs;
  }
  return url;
}

export async function api(path, options = {}) {
  const { body, headers, params, ...rest } = options;
  const token = getToken();
  let res;
  try {
    res = await fetch(buildUrl(path, params), {
      ...rest,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers || {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    const hint = import.meta.env.DEV
      ? ' Comprueba Docker (docker compose up -d) y VITE_DEV_API_PROXY.'
      : '';
    throw new Error(`No se pudo conectar con la API.${hint}`);
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function login(username, password) {
  return api('/api/auth/login', { method: 'POST', body: { username, password } });
}

export function getUsers() {
  return api('/api/users');
}

export function createUser(payload) {
  return api('/api/users', { method: 'POST', body: payload });
}

export function updateUser(id, payload) {
  return api(`/api/users/${id}`, { method: 'PUT', body: payload });
}

export function deleteUser(id) {
  return api(`/api/users/${id}`, { method: 'DELETE' });
}

export function resetUserPassword(id, password) {
  return api(`/api/users/${id}/password`, { method: 'POST', body: { password } });
}

export function getProducts(search) {
  return api('/api/products', { params: search ? { search } : {} });
}

export function createProduct(data) {
  return api('/api/products', { method: 'POST', body: data });
}

export function updateProduct(id, data) {
  return api(`/api/products/${id}`, { method: 'PUT', body: data });
}

export function deleteProduct(id) {
  return api(`/api/products/${id}`, { method: 'DELETE' });
}

export function importProducts(products) {
  return api('/api/products/import', { method: 'POST', body: { products } });
}

export function createSale(data) {
  return api('/api/sales', { method: 'POST', body: data });
}

export function getSales(params) {
  return api('/api/sales', { params });
}

export function getSaleDetail(id) {
  return api(`/api/sales/${id}`);
}

export function cancelSale(id) {
  return api(`/api/sales/${id}/cancel`, { method: 'POST', body: {} });
}

export function getReportTotals(params) {
  return api('/api/reports/total', { params });
}

export function getReportDaily(params) {
  return api('/api/reports/daily', { params });
}

export function getReportByProduct(params) {
  return api('/api/reports/products', { params });
}

export function getReportByPaymentMethod(params) {
  return api('/api/reports/payment-methods', { params });
}
