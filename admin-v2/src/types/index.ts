export type Role = 'OWNER' | 'MANAGER' | 'WAITER' | 'KITCHEN';

export interface AdminUser {
  id: string;
  username: string;
  displayName?: string;
  role: Role;
  avatarUrl?: string;
  mustChangePassword?: boolean;
}

export interface NavItem {
  view: string;
  path: string;
  title: string;
  meta: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  roles: Role[];
  badgeKey?: 'reservations' | 'events';
  section: 'service' | 'planning' | 'management';
}

// ── Tables ──────────────────────────────────────────────
export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';

export interface Table {
  id: string;
  number: number;
  label?: string;
  seats: number;
  status: TableStatus;
  qrToken?: string;
}

// ── Menu ────────────────────────────────────────────────
export interface MenuItem {
  id: string;
  categoryId: string;
  nameDe: string;
  nameFa: string;
  descriptionDe: string;
  descriptionFa?: string;
  price: number;
  isAvailable: boolean;
  sortOrder: number;
  imageUrl?: string;
}

export interface MenuCategory {
  id: string;
  nameDe: string;
  nameFa: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  items: MenuItem[];
}

// ── Orders ──────────────────────────────────────────────
export type OrderStatus = 'NEW' | 'PREPARING' | 'READY' | 'SERVED' | 'PAID';

export interface OrderItem {
  id: string;
  menuItemId: string;
  menuItem: MenuItem;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: number;
  tableId: string;
  table?: Table;
  status: OrderStatus;
  totalAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

// ── Reservations ────────────────────────────────────────
export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface Reservation {
  id: string;
  name: string;
  email: string;
  phone?: string;
  date: string;
  time: string;
  guests: number;
  tableId?: string;
  table?: Table;
  specialRequests?: string;
  status: ReservationStatus;
  createdAt: string;
}

// ── Events ──────────────────────────────────────────────
export type EventStatus = 'PENDING' | 'REVIEWED' | 'QUOTED' | 'CONFIRMED' | 'CANCELLED';

export interface EventInquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  eventDate: string;
  eventTiming: string;
  numberOfPeople: number;
  eventType: string;
  drinks?: string;
  cakes?: string;
  food?: string;
  equipment?: string;
  decor?: string;
  otherNotes?: string;
  status: EventStatus;
  createdAt: string;
}

export interface EventListing {
  id: string;
  titleDe: string;
  titleFa?: string;
  description?: string;
  eventDate: string;
  eventTime: string;
  isPublished: boolean;
  sortOrder: number;
  imageUrl?: string;
  registrationOpen?: boolean;
  maxAttendees?: number;
  price?: number;
}

// ── Customers ────────────────────────────────────────────
export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  points: number;
  totalSpend: number;
  notes?: string;
  createdAt: string;
}

export interface Discount {
  id: string;
  code: string;
  description?: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  minSpend?: number;
  pointsCost?: number;
  isActive: boolean;
  expiresAt?: string;
}

// ── Team ─────────────────────────────────────────────────
export interface TeamMember {
  id: string;
  username: string;
  displayName?: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  mustChangePassword?: boolean;
}

// ── Dashboard metrics ────────────────────────────────────
export interface DashboardMetrics {
  activeOrders: number;
  occupiedTables: number;
  totalTables: number;
  pendingReservations: number;
  pendingEvents: number;
  todayRevenue: number;
  staffClockedIn: number;
}

// ── Socket events ─────────────────────────────────────────
export interface SocketEvents {
  'order:new': Order;
  'order:updated': Order;
  'table:updated': Table;
  'reservation:new': Reservation;
}
