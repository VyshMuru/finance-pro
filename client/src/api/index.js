const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// ── Overview ──────────────────────────────────────────────────
export const api = {
  overview: {
    get: (year, month) => request(`/overview?year=${year}${month ? `&month=${month}` : ''}`),
    networthTrend: (year) => request(`/overview/networth-trend?year=${year}`),
  },

  // ── Transactions ───────────────────────────────────────────
  transactions: {
    list: (year, month, type) => request(`/transactions?year=${year}${month ? `&month=${month}` : ''}${type ? `&type=${type}` : ''}`),
    summary: (year, month, type) => request(`/transactions/summary?year=${year}${month ? `&month=${month}` : ''}${type ? `&type=${type}` : ''}`),
    categories: () => request('/transactions/categories'),
    create: (data) => request('/transactions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),
  },

  // ── Accounts ───────────────────────────────────────────────
  accounts: {
    list: () => request('/accounts'),
    summary: () => request('/accounts/summary'),
    debtTracker: () => request('/accounts/debt-tracker'),
    portfolioGrowth: (year) => request(`/accounts/portfolio-growth?year=${year}`),
    create: (data) => request('/accounts', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/accounts/${id}`, { method: 'DELETE' }),
  },

  // ── Budget ─────────────────────────────────────────────────
  budget: {
    list: (year, month) => request(`/budget?year=${year}${month ? `&month=${month}` : ''}`),
    summary: (year, month) => request(`/budget/summary?year=${year}${month ? `&month=${month}` : ''}`),
    create: (data) => request('/budget', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/budget/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/budget/${id}`, { method: 'DELETE' }),
  },
};