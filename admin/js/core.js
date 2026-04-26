import { apiFetch, loginRequest } from './api.js';

export function decodeToken(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch (_) {
    return null;
  }
}

export function getSession() {
  const token = localStorage.getItem('diwanAdminToken');
  if (!token) return null;
  try {
    const stored = JSON.parse(localStorage.getItem('diwanAdminUser') || '{}');
    if (stored.role) return { token, ...stored };
  } catch (_) {}
  const decoded = decodeToken(token);
  return decoded?.role ? { token, ...decoded } : null;
}

export function saveSession(session) {
  localStorage.setItem('diwanAdminToken', session.token);
  localStorage.setItem('diwanAdminUser', JSON.stringify({
    id: session.id,
    username: session.username,
    role: session.role
  }));
}

export function clearSession() {
  localStorage.removeItem('diwanAdminToken');
  localStorage.removeItem('diwanAdminUser');
}

export async function login(credentials) {
  return loginRequest(credentials);
}

export function routeForSession(session) {
  const width = window.innerWidth || 1024;
  if (session.role === 'KITCHEN') return '/admin/kitchen.html';
  if (session.role === 'WAITER') return width <= 900 ? '/admin/service.html' : '/admin/manage.html';
  if (width <= 700) return '/admin/service.html';
  return '/admin/manage.html';
}

export function requireSession(allowedRoles = []) {
  const session = getSession();
  if (!session?.token) {
    location.replace('/admin.html');
    return null;
  }
  if (allowedRoles.length && !allowedRoles.includes(session.role)) {
    location.replace(routeForSession(session));
    return null;
  }
  document.body.classList.remove('auth-pending');
  return session;
}

export async function verifySession(allowedRoles = []) {
  const session = getSession();
  if (!session?.token) {
    location.replace('/admin.html');
    return null;
  }

  let verified;
  try {
    verified = await apiFetch('/me');
  } catch (_) {
    return null;
  }

  const nextSession = { token: session.token, ...verified };
  saveSession(nextSession);

  if (allowedRoles.length && !allowedRoles.includes(nextSession.role)) {
    location.replace(routeForSession(nextSession));
    return null;
  }

  document.body.classList.remove('auth-pending');
  return nextSession;
}

export function logout() {
  clearSession();
  location.replace('/admin.html');
}
