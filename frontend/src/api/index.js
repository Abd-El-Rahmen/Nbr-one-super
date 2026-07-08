/**
 * API Service Layer
 * Connects to Node.js backend at http://localhost:5000/api
 * Covers 100% of all backend endpoints
 */

const BASE_URL = import.meta.env.VITE_API_URL;

// ─── Request timeout (ms) ─────────────────────────────────────────────────────
const REQUEST_TIMEOUT_MS = 15_000; // 15 seconds

// ─── Token Helpers ────────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem('admin_token');

const authHeaders = () => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
});

// ─── Core Request Helper ──────────────────────────────────────────────────────
const request = async (method, path, body = null, isFormData = false) => {
  const headers = isFormData
    ? { ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) }
    : authHeaders();

  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  const options = {
    method,
    headers,
    ...(body ? { body: isFormData ? body : JSON.stringify(body) } : {}),
    signal: controller.signal,
  };

  let res;

  try {
    res = await fetch(`${BASE_URL}${path}`, options);
    clearTimeout(timeoutId);
  } catch (networkErr) {
    clearTimeout(timeoutId);

    if (networkErr.name === 'AbortError') {
      throw new Error('انتهت مهلة الاتصال بالخادم — يرجى المحاولة مرة أخرى.');
    }

    throw new Error('تعذّر الوصول إلى الخادم — يرجى التحقق من الاتصال.');
  }

  let data;

  try {
    data = await res.json();
  } catch {
    throw new Error(`خطأ في قراءة الاستجابة (${res.status} ${res.statusText})`);
  }

  if (!res.ok) {
    throw new Error(data.message || `خطأ في الخادم (${res.status})`);
  }

  return data;
};
// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (credentials) => request('POST', '/auth/login', credentials),
  me: () => request('GET', '/auth/me'),
};

// ─── CATEGORIES ───────────────────────────────────────────────────────────────
export const categoriesAPI = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/categories${q ? '?' + q : ''}`);
  },
  getOne: (id) => request('GET', `/categories/${id}`),
  create: (data) => request('POST', '/categories', data, true),
  update: (id, data) => request('PUT', `/categories/${id}`, data, true),
  delete: (id) => request('DELETE', `/categories/${id}`),
};

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────
export const productsAPI = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/products${q ? '?' + q : ''}`);
  },
  getOne: (id) => request('GET', `/products/${id}`),
  create: (formData) => request('POST', '/products', formData, true),
  update: (id, formData) => request('PUT', `/products/${id}`, formData, true),
  delete: (id) => request('DELETE', `/products/${id}`),

  // Variants
  createVariant: (productId, data) => request('POST', `/products/${productId}/variants`, data),
  updateVariant: (variantId, data) => request('PUT', `/products/variants/${variantId}`, data),
  deleteVariant: (variantId) => request('DELETE', `/products/variants/${variantId}`),

  // Bundle Items
  setBundleItems: (productId, items) => request('PUT', `/products/${productId}/bundle-items`, { items }),
  deleteBundleItem: (itemId) => request('DELETE', `/products/bundle-items/${itemId}`),
};

// ─── ORDERS ───────────────────────────────────────────────────────────────────
export const ordersAPI = {
  // Public — guest checkout (no auth needed)
  create: (orderData) => request('POST', '/orders', orderData),
  // Public — track order by id and phone (no auth needed)
  track: (id, phone) => request('GET', `/orders/track?id=${encodeURIComponent(id)}&phone=${encodeURIComponent(phone)}`),

  // Admin
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/orders${q ? '?' + q : ''}`);
  },
  getOne: (id) => request('GET', `/orders/${id}`),
  updateStatus: (id, status) => request('PATCH', `/orders/${id}/status`, { status }),
};

// ─── CUSTOMERS ────────────────────────────────────────────────────────────────
export const customersAPI = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/customers${q ? '?' + q : ''}`);
  },
  getOne: (id) => request('GET', `/customers/${id}`),
};

// ─── INVENTORY ────────────────────────────────────────────────────────────────
export const inventoryAPI = {
  getLogs: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/inventory/logs${q ? '?' + q : ''}`);
  },
  restock: (variantId, quantity, note) =>
    request('POST', '/inventory/restock', { variant_id: variantId, quantity, note }),
  bulkRestock: (items) => request('POST', '/inventory/bulk-restock', { items }),
};

// ─── MESSAGES ─────────────────────────────────────────────────────────────────
export const messagesAPI = {
  // Public — customers can send
  create: (data) => request('POST', '/messages', data),

  // Admin — read
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/messages${q ? '?' + q : ''}`);
  },
};

// ─── COMPLAINTS ───────────────────────────────────────────────────────────────
export const complaintsAPI = {
  // Public — anyone can submit
  create: (data) => request('POST', '/complaints', data),

  // Admin
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/complaints${q ? '?' + q : ''}`);
  },
  getOne: (id) => request('GET', `/complaints/${id}`),
  updateStatus: (id, status) => request('PATCH', `/complaints/${id}/status`, { status }),
};

// ─── DELIVERY PRICING ─────────────────────────────────────────────────────────
export const deliveryPricingAPI = {
  getAll: () => request('GET', '/delivery-pricing'),
  update: (tier_id, data) => request('PUT', `/delivery-pricing/${tier_id}`, data)
};

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
export const dashboardAPI = {
  getStats: () => request('GET', '/dashboard/stats'),
  getAnalytics: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/dashboard/analytics${q ? '?' + q : ''}`);
  },
};

// ─── USERS (super_admin only) ─────────────────────────────────────────────────
export const usersAPI = {
  getAll: () => request('GET', '/users'),
  getOne: (id) => request('GET', `/users/${id}`),
  create: (data) => request('POST', '/users', data),
  update: (id, data) => request('PUT', `/users/${id}`, data),
  delete: (id) => request('DELETE', `/users/${id}`),
};

export const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('data:')) return url;

  return `${import.meta.env.VITE_API_URL.replace('/api', '')}${url.startsWith('/') ? '' : '/'}${url}`;
};
