const BASE = import.meta.env.DEV
  ? 'http://localhost:3000/api/admin'
  : '/api/admin';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  method: HttpMethod = 'GET',
  body?: unknown,
): Promise<T> {
  const token = localStorage.getItem('diwanAdminToken')
    ?? sessionStorage.getItem('diwanAdminToken');

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token ?? ''}`,
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${endpoint}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data: unknown;
  try { data = await res.json(); } catch { data = {}; }

  if (res.status === 401) {
    // Let the auth hook handle the redirect
    window.dispatchEvent(new CustomEvent('diwan:unauthorized'));
    throw new ApiError(401, 'Session expired');
  }

  if (!res.ok) {
    const msg = (data as { error?: string })?.error ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, msg);
  }

  return data as T;
}

// ── Auth ──────────────────────────────────────────────────
export const authApi = {
  login: (username: string, password: string) =>
    request<{ token: string; id: string; username: string; email?: string; role: string; displayName?: string; mustChangePassword?: boolean }>(
      '/login', 'POST', { username, password },
    ),
  me: () =>
    request<import('@/types').AdminUser & { isActive: boolean }>('/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>('/change-password', 'POST', { currentPassword, newPassword }),
  forgotPassword: (identifier: string) =>
    request<{ success: boolean }>('/forgot-password', 'POST', { identifier }),
  resetPassword: (token: string, newPassword: string) =>
    request<{ success: boolean }>('/reset-password', 'POST', { token, newPassword }),
};

// ── Tables ────────────────────────────────────────────────
export const tablesApi = {
  list:      ()         => request<import('@/types').Table[]>('/tables'),
  updateStatus: (id: string, status: string) =>
    request<import('@/types').Table>(`/tables/${id}/status`, 'PATCH', { status }),
  updateLabel: (id: string, label: string) =>
    request<import('@/types').Table>(`/tables/${id}/label`, 'PATCH', { label }),
  regenerateToken: (id: string) =>
    request<import('@/types').Table>(`/tables/${id}/regenerate-token`, 'POST'),
  qrUrl: (id: string) => `${BASE}/tables/${id}/qr`,
  qrOrderUrl: (id: string) => `${BASE}/tables/${id}/qr-order`,
};

// ── Orders ────────────────────────────────────────────────
export const ordersApi = {
  list:   ()             => request<import('@/types').Order[]>('/orders'),
  byTable: (tableId: string) => request<import('@/types').Order[]>(`/orders/table/${tableId}`),
  create: (payload: unknown) => request<import('@/types').Order>('/orders', 'POST', payload),
  updateStatus: (id: string, status: string) =>
    request<import('@/types').Order>(`/orders/${id}/status`, 'PATCH', { status }),
  pay: (id: string, discountCode?: string) =>
    request<import('@/types').Order>(`/orders/${id}/pay`, 'POST', { discountCode }),
};

// ── Menu ──────────────────────────────────────────────────
export const menuApi = {
  categories:   ()             => request<import('@/types').MenuCategory[]>('/menu/categories'),
  createCategory: (data: unknown) => request<import('@/types').MenuCategory>('/menu/categories', 'POST', data),
  updateCategory: (id: string, data: unknown) => request<import('@/types').MenuCategory>(`/menu/categories/${id}`, 'PUT', data),
  deleteCategory: (id: string) => request<void>(`/menu/categories/${id}`, 'DELETE'),
  createItem:   (data: unknown) => request<import('@/types').MenuItem>('/menu/items', 'POST', data),
  updateItem:   (id: string, data: unknown) => request<import('@/types').MenuItem>(`/menu/items/${id}`, 'PUT', data),
  deleteItem:   (id: string)    => request<void>(`/menu/items/${id}`, 'DELETE'),
  toggleItem:   (id: string, isAvailable: boolean) =>
    request<import('@/types').MenuItem>(`/menu/items/${id}/availability`, 'PATCH', { isAvailable }),
};

// ── Reservations ──────────────────────────────────────────
export const reservationsApi = {
  list:   ()                   => request<import('@/types').Reservation[]>('/reservations'),
  update: (id: string, data: unknown) => request<import('@/types').Reservation>(`/reservations/${id}`, 'PUT', data),
  updateStatus: (id: string, status: string) =>
    request<import('@/types').Reservation>(`/reservations/${id}/status`, 'PATCH', { status }),
};

// ── Events ────────────────────────────────────────────────
export const eventsApi = {
  inquiries:    ()               => request<import('@/types').EventInquiry[]>('/events'),
  updateStatus: (id: string, status: string) =>
    request<import('@/types').EventInquiry>(`/events/${id}/status`, 'PATCH', { status }),
  listings:     ()               => request<import('@/types').EventListing[]>('/event-listings'),
  createListing: (data: unknown) => request<import('@/types').EventListing>('/event-listings', 'POST', data),
  updateListing: (id: string, data: unknown) =>
    request<import('@/types').EventListing>(`/event-listings/${id}`, 'PUT', data),
  deleteListing: (id: string)    => request<void>(`/event-listings/${id}`, 'DELETE'),
  registrations: (id: string) =>
    request<import('@/types').EventRegistration[]>(`/events/${id}/registrations`),
  updateRegistration: (id: string, status: string) =>
    request<import('@/types').EventRegistration>(`/events/registrations/${id}`, 'PATCH', { status }),
};

// ── Customers ─────────────────────────────────────────────
export const customersApi = {
  list:   ()               => request<import('@/types').Customer[]>('/customers'),
  create: (data: unknown)  => request<import('@/types').Customer>('/customers', 'POST', data),
  update: (id: string, data: unknown) => request<import('@/types').Customer>(`/customers/${id}`, 'PUT', data),
  discounts: ()            => request<import('@/types').Discount[]>('/discounts'),
  createDiscount: (data: unknown) => request<import('@/types').Discount>('/discounts', 'POST', data),
  updateDiscount: (id: string, data: unknown) =>
    request<import('@/types').Discount>(`/discounts/${id}`, 'PUT', data),
};

// ── Team ──────────────────────────────────────────────────
export const teamApi = {
  list:     ()               => request<import('@/types').TeamMember[]>('/users'),
  create:   (data: unknown)  => request<import('@/types').TeamMember>('/users', 'POST', data),
  update:   (id: string, data: unknown) => request<import('@/types').TeamMember>(`/users/${id}`, 'PUT', data),
  deactivate: (id: string)   => request<void>(`/users/${id}/deactivate`, 'POST'),
  resetPassword: (id: string) =>
    request<{ tempPassword: string }>(`/users/${id}/reset-password`, 'POST'),
};

// ── Dashboard ─────────────────────────────────────────────
export const dashboardApi = {
  metrics: () => request<import('@/types').DashboardMetrics>('/dashboard'),
};

// ── Push notifications ──────────────────────────────────
export const pushApi = {
  publicKey: () => request<{ publicKey: string }>('/push/public-key'),
  subscribe: (subscription: PushSubscriptionJSON) =>
    request<{ id: string }>('/push/subscribe', 'POST', subscription),
  unsubscribe: (endpoint?: string) =>
    request<{ success: boolean }>('/push/subscribe', 'DELETE', { endpoint }),
};

// ── Site content ──────────────────────────────────────────
export const siteApi = {
  list:   ()               => request<unknown[]>('/site-content'),
  update: (id: string, data: unknown) => request<unknown>(`/site-content/${id}`, 'PUT', data),
  create: (data: unknown)  => request<unknown>('/site-content', 'POST', data),
};
