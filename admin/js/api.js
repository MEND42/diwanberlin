export const API_BASE = '/api/admin';

export function getToken() {
  return localStorage.getItem('diwanAdminToken');
}

export async function apiFetch(endpoint, options = {}) {
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${getToken()}`
  };
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  let body = {};
  try {
    body = await response.json();
  } catch (_) {}

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('diwanAdminToken');
    localStorage.removeItem('diwanAdminUser');
    if (!location.pathname.endsWith('/admin.html')) location.replace('/admin.html');
    throw new Error(body.error || 'Session expired');
  }

  if (!response.ok) throw new Error(body.error || `Request failed: ${response.status}`);
  return body;
}

export async function loginRequest({ username, password }) {
  const response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Login failed');
  return body;
}
