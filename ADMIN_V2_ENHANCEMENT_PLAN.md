# Diwan Berlin Admin-v2 Enhancement Plan

## Executive Summary

This document outlines all changes and enhancements needed for **admin-v2** (React/TypeScript/Vite) to achieve feature parity with admin-v1 and add necessary improvements for a production-ready Persian-German café management system.

**Current State**: admin-v2 is missing several key features that exist in admin-v1.
**Goal**: Complete feature parity + UI/UX improvements, then deprecate admin-v1.

---

## Part 1: Feature Parity - What admin-v2 is Missing

### 1.1 HR/Staff Management (HIGH PRIORITY)

| Feature | admin-v1 | admin-v2 HR.tsx | Status |
|---------|----------|-----------------|--------|
| Weekly shift grid | ✅ | ✅ | Done |
| Availability proposals | ✅ | ❌ Missing | **TODO** |
| Manual shift entry form | ✅ | ❌ Missing | **TODO** |
| Clock in/out system | ✅ | ❌ Missing | **TODO** |
| Staff profile management | ✅ | Partial | **TODO** |
| Coverage warnings | ✅ | ❌ Missing | **TODO** |
| Time proposal system | ✅ | ❌ Missing | **TODO** |

**Backend API exists** at `/api/admin/hr/*`:
- `GET /hr/staff` - List staff
- `PUT /hr/staff/:id/profile` - Update profile
- `GET /hr/availability` - Get availability
- `POST /hr/availability` - Submit availability
- `PATCH /hr/availability/:id` - Approve/reject
- `GET /hr/shifts` - Get shifts
- `POST /hr/shifts` - Create shift
- `PATCH /hr/shifts/:id` - Update shift
- `GET /hr/time-entries` - Get time entries
- `POST /hr/clock-in` - Clock in
- `POST /hr/clock-out/:id` - Clock out

### 1.2 Dashboard (MEDIUM PRIORITY)

| Feature | admin-v1 | admin-v2 Dashboard.tsx | Status |
|---------|----------|------------------------|--------|
| Metric cards | ✅ | ✅ | Done |
| Quick actions | ✅ | ✅ | Done |
| **Busy hours chart** | ✅ | ❌ Missing | **TODO** |

**Backend endpoint**: `/api/admin/dashboard/busy-hours`

### 1.3 Settings Page (HIGH PRIORITY)

| Feature | admin-v1 | admin-v2 | Status |
|---------|----------|----------|--------|
| Site settings UI | ✅ | ❌ Missing | **TODO** |
| Capacity configuration | ✅ | ❌ Missing | **TODO** |
| Public settings API | ✅ (exists) | ❌ (not connected) | **TODO** |

**Backend endpoints exist**:
- `GET /api/admin/settings`
- `PUT /api/admin/settings/:key`
- `GET /api/public/settings/capacities`

### 1.4 Menu Management

| Feature | admin-v1 | admin-v2 Menu.tsx | Status |
|---------|----------|-------------------|--------|
| Categories CRUD | ✅ | ✅ | Done |
| Menu items CRUD | ✅ | ✅ | Done |
| **EN fields (nameEn, descriptionEn)** | ✅ | ❌ Missing | **TODO** |
| **Image upload** | ✅ | ❌ Missing | **TODO** |

---

## Part 2: UI/UX Improvements

### 2.1 Accessibility (CRITICAL)

| Issue | Priority | Fix |
|-------|----------|-----|
| No skip-to-content link | High | Add skip link component |
| No aria-live for dynamic badges | High | Add aria-live regions |
| No focus trapping in modals | Medium | Add focus trap to BottomSheet |
| Form inputs missing error states | High | Add validation UI |
| No keyboard nav for table grids | Medium | Add keyboard handlers |

### 2.2 Component Enhancements

| Component | Enhancement | Priority |
|-----------|-------------|----------|
| Toast notifications | Global toast system | High |
| Forms | Inline validation | High |
| Loading states | Skeleton screens | Medium |
| Tables | Sort/filter UI | Low |
| Data export | CSV export buttons | Low |

### 2.3 Mobile Experience

- Ensure all touch targets ≥44px
- Test horizontal scroll in HR grid
- Verify bottom navigation works on all pages

---

## Part 3: Implementation Roadmap

### Phase 1: HR Features (Week 1)

- [ ] **1.1** Connect HR.tsx to backend API (use existing `/api/admin/hr/*` endpoints)
- [ ] **1.2** Add availability proposal form
- [ ] **1.3** Add manual shift entry with form modal
- [ ] **1.4** Add clock in/out buttons + time entries list
- [ ] **1.5** Add coverage warnings (morning/afternoon/evening staffing alerts)
- [ ] **1.6** Integrate staff profile from TeamAccounts

### Phase 2: Dashboard & Settings (Week 2)

- [ ] **2.1** Add busy hours bar chart to Dashboard
- [ ] **2.2** Create Settings page with capacity config
- [ ] **2.3** Connect public settings API

### Phase 3: Menu EN Fields (Week 2)

- [ ] **3.1** Update MenuItem type to include EN fields
- [ ] **3.2** Update Menu.tsx forms for nameEn, descriptionEn
- [ ] **3.3** Add image upload endpoint (if not exists)
- [ ] **3.4** Add image upload UI to Menu.tsx

### Phase 4: UI/UX Polish (Week 3)

- [ ] **4.1** Add global toast notification system
- [ ] **4.2** Add form validation with error states
- [ ] **4.3** Add skip-to-content link
- [ ] **4.4** Add skeleton loading states
- [ ] **4.5** Add ARIA labels throughout

### Phase 5: Migration (Week 4)

- [ ] **5.1** Redirect /admin/manage.html → /admin-v2/
- [ ] **5.2** Update all internal links
- [ ] **5.3** Test all features in production-like env
- [ ] **5.4** Archive/remove admin-v1 files
- [ ] **5.5** Update documentation

---

## Part 4: Technical Details

### Backend API Reference

All these endpoints already exist:

```
GET    /api/admin/hr/staff                     → List staff with profiles
PUT    /api/admin/hr/staff/:id/profile         → Update staff profile
GET    /api/admin/hr/availability?weekStart=   → Get availability requests
POST   /api/admin/hr/availability              → Submit availability
PATCH  /api/admin/hr/availability/:id          → Approve/reject
GET    /api/admin/hr/shifts?weekStart=         → Get shifts
POST   /api/admin/hr/shifts                    → Create shift
PATCH  /api/admin/hr/shifts/:id                → Update shift
DELETE /api/admin/hr/shifts/:id                → Delete shift
GET    /api/admin/hr/time-entries?weekStart=   → Get time entries
POST   /api/admin/hr/clock-in                  → Clock in
POST   /api/admin/hr/clock-out/:id             → Clock out

GET    /api/admin/dashboard/busy-hours         → Hourly reservation data
GET    /api/admin/settings                     → All settings
PUT    /api/admin/settings/:key                → Update setting

GET    /api/public/settings/capacities         → Public capacity info
```

### Database Models (Prisma)

Already include:
- `AdminUser` with role (OWNER, MANAGER, WAITER, KITCHEN)
- `StaffProfile` (fullName, phone, email, position)
- `StaffAvailability` (weekStart, dayOfWeek, startTime, endTime, status)
- `ShiftAssignment` (weekStart, dayOfWeek, startTime, endTime)
- `TimeEntry` (clockIn, clockOut, breakMinutes, status)
- `SiteSettings` (key, value, type, category)

### Key Files to Modify

| File | Changes |
|------|---------|
| `src/pages/management/HR.tsx` | Connect to API, add forms |
| `src/pages/management/Dashboard.tsx` | Add busy hours chart |
| `src/pages/management/Settings.tsx` | Create new page |
| `src/pages/management/Menu.tsx` | Add EN fields, image upload |
| `src/types/index.ts` | Add missing types |
| `src/lib/api.ts` | Add missing API functions |
| `src/store/appStore.ts` | Add HR state if needed |
| `src/router/index.tsx` | Add Settings route |

---

## Part 5: Quick Wins Checklist

Run this first to verify the basics:

- [ ] Check if HR API endpoints return data correctly
- [ ] Verify Dashboard busy-hours endpoint works
- [ ] Test Settings endpoints
- [ ] Confirm Menu API supports EN fields (may need migration)

---

## Notes

- **Phase 7, 8, 9 from earlier discussion**: These were implemented in admin-v1 (vanilla). Need to recreate in admin-v2.
- **Database**: Schema already has all needed fields. Run `npx prisma migrate dev` when DB is accessible.
- **Multilingual**: admin-v2 should support DE/FA/EN like admin-v1 does.

---

*Generated: 2026-04-26*
*Project: Diwan Berlin Café Management*