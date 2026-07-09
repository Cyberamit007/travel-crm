# Travel CRM — Project Context

> Feed this file to Claude to get full project understanding without exploring the codebase.

---

## 1. What This Is

A **multi-tenant SaaS CRM** built specifically for **trek and pilgrimage travel companies** (e.g., Kedarnath, Manaslu Circuit tours). It manages the full sales pipeline from lead capture (WhatsApp, Instagram, Website, Manual) through employee assignment, follow-ups, campaigns, and analytics.

**Live URL:** `https://crm.bhatko.in`  
**EC2 Instance:** `i-013aa7a7dabebee0b` at `13.207.29.130`  
**Branding:** "Travel CRM — Trek & Pilgrimage"

---

## 2. Tech Stack

### Backend
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (ESM, `.js` extensions in imports) |
| Framework | Express 5 |
| Language | TypeScript (compiled, not ts-node) |
| ORM | Prisma 5 + PostgreSQL |
| Auth | JWT (access, 15min) + rotating refresh tokens (7d, httpOnly cookie) |
| Password | bcrypt, cost factor 12 |
| Real-time | Socket.IO |
| File uploads | Multer (disk storage, `/app/uploads`) |
| Logging | Winston (JSON) + Morgan (HTTP) |
| Rate limiting | express-rate-limit (300/15min general, 20/15min on `/auth/login`) |
| Security headers | Helmet + CSP |
| Cron | node-cron (follow-up reminders every 30min) |
| Containerized | Docker (`linux-musl-openssl-3.0.x` binary target for Alpine) |

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite |
| Language | TypeScript |
| Routing | React Router v6 (nested routes) |
| State (server) | TanStack Query v5 (`useQuery`, `useMutation`, `useQueryClient`) |
| State (client) | Zustand (`useAuthStore`) |
| Forms | React Hook Form + `Controller` for non-standard inputs |
| HTTP client | Axios (with silent 401→refresh interceptor) |
| Styling | Tailwind CSS (custom `primary` and `mountain` color palettes) |
| Charts | Recharts 2.12+ (BarChart, PieChart, ResponsiveContainer) |
| Icons | Lucide React |
| Notifications | react-hot-toast |
| Real-time | Socket.IO client |

---

## 3. Repository Layout

```
C:\Travel_CRM\
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Single source of truth for DB
│   └── src/
│       ├── index.ts               # Express app, CORS, Helmet, rate limits, Socket.IO, cron
│       ├── lib/prisma.ts          # Singleton PrismaClient
│       ├── middleware/
│       │   ├── auth.ts            # authenticate, requireAdmin, requireAdminOrSelf
│       │   └── upload.ts          # Multer config, MIME allowlist, 20MB limit
│       ├── controllers/           # One file per resource
│       │   ├── auth.controller.ts
│       │   ├── lead.controller.ts
│       │   ├── campaign.controller.ts
│       │   ├── user.controller.ts
│       │   ├── comment.controller.ts
│       │   ├── tag.controller.ts
│       │   ├── settings.controller.ts
│       │   ├── activity.controller.ts
│       │   ├── notification.controller.ts
│       │   ├── feedback.controller.ts
│       │   ├── webhook.controller.ts
│       │   └── report.controller.ts
│       ├── routes/
│       │   └── index.ts           # Mounts all sub-routers under /api
│       ├── services/
│       │   ├── lead.service.ts    # createLead() used by both manual + webhook
│       │   └── notification.service.ts # Socket.IO emit + follow-up cron
│       ├── types/index.ts         # AuthenticatedRequest, JWTPayload, webhook types
│       └── utils/
│           ├── logger.ts          # Winston config
│           └── seed.ts            # DB seeder
└── frontend/
    └── src/
        ├── App.tsx                # All routes — admin/* and employee/*
        ├── store/authStore.ts     # Zustand store — user, token, login/logout
        ├── services/api.ts        # Axios instance + silent refresh interceptor
        ├── types/index.ts         # All TypeScript interfaces and enums
        ├── hooks/                 # One hook file per resource
        ├── pages/
        │   ├── LoginPage.tsx
        │   ├── admin/             # Dashboard, Leads, Campaigns, Employees,
        │   │                      # Reports, Activity, Feedback, Settings
        │   └── employee/          # Dashboard, Leads, FollowUps, Settings
        └── components/
            ├── layout/            # AdminLayout.tsx, EmployeeLayout.tsx
            ├── dashboard/         # AdminDashboard, EmployeeDashboard
            ├── leads/             # LeadForm, LeadDetail, CommentsSection,
            │                      # DuplicateWarningDialog, LostReasonModal
            ├── campaigns/         # CampaignForm, CampaignNotesSection,
            │                      # CampaignAttachmentsSection
            ├── employees/         # EmployeeProfileModal
            ├── feedback/          # FeedbackButton
            └── ui/                # Badge, Modal, Table, Pagination, Avatar,
                                   # PriorityBadge, AvailabilityBadge, TagChip,
                                   # TagInput, StatsCard, Skeleton, ErrorBoundary
```

---

## 4. Database Schema (Prisma / PostgreSQL)

### Organization (multi-tenant root)
```
id, name, slug (unique), plan (FREE|STARTER|PRO|ENTERPRISE),
status (ACTIVE|SUSPENDED|CANCELLED), settings (Json), createdAt, updatedAt
→ has many: User, Campaign, Lead, Tag, LeaveRequest
```

### User
```
id, organizationId?, name, email (unique), password (bcrypt),
role (ADMIN|EMPLOYEE), phone?, avatar?, isActive, availability (AVAILABLE|BUSY|OFFLINE),
lastLogin?, createdAt, updatedAt
→ has many: Lead (assignedLeads), CampaignEmployee, Notification,
            ActivityLog, Feedback, RefreshToken, CampaignNote,
            CampaignAttachment, LeaveRequest (x2), LeadComment
```

### RefreshToken
```
id, tokenHash (SHA-256, unique), userId, expiresAt, revokedAt?,
userAgent?, ipAddress?, createdAt
```

### Lead  ← primary business entity
```
id, organizationId?, name, phone, email?,
source (WHATSAPP|INSTAGRAM|MANUAL|WEBSITE),
status (NEW|CONTACTED|INTERESTED|FOLLOW_UP_SCHEDULED|CONFIRMED|LOST),
priority (HIGH|MEDIUM|LOW),
message?, lostReason?, lostReasonOther?,
destination?, campaignId?, assignedToId?,
followUpDate?, followUpNotes?, followUpDone,
whatsappMsgId?, instagramLeadId?, metaPageId?, adId?, adName?,
notes?, budget?, groupSize?, preferredDate?,
isRead, deletedAt? (soft delete), createdAt, updatedAt
→ has many: Notification, ActivityLog, LeadTag, LeadComment
```
**Indexes:** status, priority, source, assignedToId, campaignId, createdAt, deletedAt, followUpDate

### Campaign
```
id, organizationId?, name, destination, description?,
status (ACTIVE|PAUSED|DRAFT|ENDED), startDate?, endDate?,
targetLeads?, budget?, whatsappNumber?, instagramAdId?,
utmSource?, utmCampaign?, keywords (Json array as String), createdAt, updatedAt
→ has many: Lead, CampaignEmployee, CampaignNote, CampaignAttachment
```

### CampaignEmployee (join table)
```
id, campaignId, userId, assignedAt
@@unique([campaignId, userId])
```

### CampaignNote
```
id, content, isEdited, campaignId, authorId, createdAt, updatedAt
```

### CampaignAttachment
```
id, name, fileUrl, fileSize, mimeType, campaignId, uploadedById, createdAt
```

### Tag
```
id, name, color (hex), organizationId?, createdAt
@@unique([name, organizationId])
```

### LeadTag (join table)
```
id, leadId, tagId
@@unique([leadId, tagId])
```

### LeadComment (threaded)
```
id, content, isEdited, leadId, authorId, parentId? (self-ref), createdAt, updatedAt
→ replies: LeadComment[]
```

### LeaveRequest (schema only — UI removed)
```
id, organizationId?, startDate, endDate, reason,
status (PENDING|APPROVED|REJECTED), adminNote?,
employeeId, approvedById?, createdAt, updatedAt
```
> Note: LeaveRequest is in the schema but the frontend feature was removed. The DB table exists.

### Notification
```
id, type (FOLLOW_UP_DUE|FOLLOW_UP_OVERDUE|NEW_LEAD_ASSIGNED|
          LEAD_STATUS_CHANGED|CAMPAIGN_UPDATE|SYSTEM),
title, message, isRead, userId, leadId?, createdAt
```

### ActivityLog
```
id, action, details?, entityType (LEAD|CAMPAIGN|USER|LEAVE)?,
entityId?, userId, leadId?, createdAt
```

### WebhookLog
```
id, source, payload (raw JSON string), processed, error?, createdAt
```

### Feedback
```
id, type (BUG|SUGGESTION|OTHER), title, description, page?,
priority (LOW|MEDIUM|HIGH|CRITICAL), status (OPEN|IN_PROGRESS|RESOLVED|CLOSED),
adminNotes?, submittedById, createdAt, updatedAt
```

---

## 5. API Routes

All routes are prefixed `/api`. All except `/auth/login`, `/auth/refresh`, `/webhooks/*` require `authenticate` middleware.

### Auth — `/api/auth`
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/login` | Public | Rate limited: 20/15min |
| POST | `/refresh` | Cookie | Rotates refresh token |
| POST | `/logout` | Bearer | Revokes refresh token |
| GET | `/me` | Bearer | Returns current user (no password) |
| PUT | `/change-password` | Bearer | Revokes all sessions on success |

### Leads — `/api/leads`
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/` | Bearer | Paginated; employees auto-filtered to assigned only |
| GET | `/stats` | Bearer | Counts by status/source |
| GET | `/check-duplicate` | Bearer | ?phone=&email= |
| GET | `/dashboard-stats` | Admin | Admin dashboard aggregates |
| GET | `/export` | Admin | CSV export |
| GET | `/overdue` | Bearer | Follow-ups past due |
| GET | `/activity` | Bearer | Recent lead activity |
| GET | `/:id` | Bearer | Single lead with all relations |
| POST | `/` | Bearer | Create lead |
| PUT | `/:id` | Bearer | Update lead |
| POST | `/:id/transfer` | Bearer | Reassign to another employee |
| DELETE | `/:id` | Admin | Soft delete (sets deletedAt) |

### Comments — `/api/leads/:leadId/comments`
| Method | Path | Auth |
|--------|------|------|
| GET | `/` | Bearer |
| POST | `/` | Bearer |
| PUT | `/:commentId` | Bearer (author or admin) |
| DELETE | `/:commentId` | Bearer (author or admin) |

### Campaigns — `/api/campaigns`
| Method | Path | Auth |
|--------|------|------|
| GET | `/` | Bearer |
| GET | `/:id` | Bearer |
| POST | `/` | Admin |
| PUT | `/:id` | Admin |
| DELETE | `/:id` | Admin |
| POST | `/:id/employees` | Admin |
| DELETE | `/:id/employees/:userId` | Admin |
| GET | `/:id/notes` | Bearer |
| POST | `/:id/notes` | Bearer |
| PUT | `/:id/notes/:noteId` | Bearer |
| DELETE | `/:id/notes/:noteId` | Bearer |
| GET | `/:id/attachments` | Bearer |
| POST | `/:id/attachments` | Bearer (multipart) |
| DELETE | `/:id/attachments/:attachId` | Bearer |

### Users/Employees — `/api/users`
| Method | Path | Auth |
|--------|------|------|
| GET | `/` | Bearer |
| GET | `/:id` | Bearer |
| GET | `/:id/profile` | Bearer |
| POST | `/` | Admin |
| PUT | `/:id` | Admin or Self |
| DELETE | `/:id` | Admin |

### Tags — `/api/tags`
| Method | Path | Auth |
|--------|------|------|
| GET | `/` | Bearer |
| POST | `/` | Admin |
| PUT | `/:id` | Admin |
| DELETE | `/:id` | Admin |

### Settings — `/api/settings`
| Method | Path | Auth |
|--------|------|------|
| GET | `/` | Bearer |
| PUT | `/` | Admin |

### Reports — `/api/reports`
| Method | Path | Auth |
|--------|------|------|
| GET | `/leads` | Admin |
| GET | `/performance` | Admin |

### Activity — `/api/activity`
| Method | Path | Auth |
|--------|------|------|
| GET | `/` | Admin |

### Notifications — `/api/notifications`
| Method | Path | Auth |
|--------|------|------|
| GET | `/` | Bearer |
| PUT | `/:id/read` | Bearer |
| PUT | `/read-all` | Bearer |

### Feedback — `/api/feedback`
| Method | Path | Auth |
|--------|------|------|
| GET | `/` | Admin |
| GET | `/stats` | Admin |
| POST | `/` | Bearer |
| PUT | `/:id` | Admin |

### Webhooks — `/api/webhooks` (no auth)
| Method | Path | Notes |
|--------|------|-------|
| GET | `/whatsapp` | Meta verification handshake |
| POST | `/whatsapp` | Incoming WhatsApp messages → auto-creates leads |
| GET | `/instagram` | Meta verification handshake |
| POST | `/instagram` | Incoming Instagram leads → auto-creates leads |

---

## 6. Frontend Routes

```
/login                          → LoginPage

/admin/*                        → RequireAuth(role=ADMIN) → AdminLayout
  /admin/dashboard              → AdminDashboard
  /admin/leads                  → admin/LeadsPage
  /admin/campaigns              → admin/CampaignsPage
  /admin/employees              → admin/EmployeesPage
  /admin/reports                → admin/ReportsPage
  /admin/activity               → admin/ActivityFeedPage
  /admin/feedback               → admin/FeedbackPage
  /admin/settings               → admin/SettingsPage

/employee/*                     → RequireAuth(role=EMPLOYEE) → EmployeeLayout
  /employee/dashboard           → EmployeeDashboard
  /employee/leads               → employee/LeadsPage
  /employee/follow-ups          → employee/FollowUpsPage
  /employee/settings            → employee/SettingsPage
```

---

## 7. Authentication Flow

1. **Login** → POST `/api/auth/login` → returns `{ token (JWT 15min), user }` + sets `crm_refresh` httpOnly cookie (7d)
2. **Client stores** access token in `localStorage.crm_token`, user in `localStorage.crm_user`
3. **Every request** → Axios interceptor attaches `Authorization: Bearer <token>`
4. **401 received** → Axios interceptor silently calls POST `/api/auth/refresh` (sends cookie)
5. **Refresh success** → new access token stored, failed request retried automatically
6. **Refresh fails** → redirect to `/login`, localStorage cleared
7. **Logout** → POST `/api/auth/logout` → server revokes refresh token → clear localStorage → redirect
8. **Password change** → revokes ALL refresh tokens for that user (all devices logged out)

**Zustand store** (`useAuthStore`): `{ user, token, isAuthenticated, login(), logout(), updateUser() }`

---

## 8. Key Frontend Patterns

### Data Fetching (TanStack Query)
```typescript
// All hooks follow this pattern
export function useLeads(params) {
  return useQuery({
    queryKey: ['leads', params],
    queryFn: () => api.get('/leads', { params }).then(r => r.data.data),
  });
}
export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/leads', data).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}
```

### Query Keys Convention
- `['leads', filters]` — lead list
- `['lead', id]` — single lead
- `['campaigns', filters]` — campaign list
- `['users', filters]` — employee list
- `['tags']` — org tags
- `['settings']` — org settings
- `['reports', 'leads', params]` — lead report
- `['reports', 'performance', params]` — performance report
- `['notifications', page, limit]`
- `['activity', params]`

### Multi-tenant Organization Filter (Backend Pattern)
Every controller defines and uses this:
```typescript
function orgFilter(req: AuthenticatedRequest): Record<string, unknown> {
  return req.user?.organizationId ? { organizationId: req.user.organizationId } : {};
}
// Usage: prisma.lead.findMany({ where: { ...orgFilter(req), deletedAt: null } })
```
This pattern is repeated in every controller — never imported from auth middleware.

### Employee Auto-Isolation
```typescript
// lead.controller.ts — employees only see their own leads
if (req.user?.role === 'EMPLOYEE') where.assignedToId = req.user.id;
```

### File Upload Pattern
```typescript
// Multipart form on routes that need it:
router.post('/:id/attachments', authenticate, upload.single('file'), handler);
// Served statically: GET /api/uploads/<filename>
```

### Soft Delete
Leads use soft delete. All lead queries must include `deletedAt: null`. Hard delete is not used.

### React Hook Form + Controller (for non-standard inputs)
```tsx
// Used for TagInput since it's not a native input
<Controller
  name="tagIds"
  control={control}
  render={({ field }) => (
    <TagInput value={field.value ?? []} onChange={field.onChange} />
  )}
/>
```

---

## 9. Frontend Hooks Reference

| Hook file | Exports |
|-----------|---------|
| `useLeads.ts` | `useLeads`, `useLeadById`, `useCreateLead`, `useUpdateLead`, `useDeleteLead`, `useTransferLead`, `useLeadStats`, `useCheckDuplicate` |
| `useCampaigns.ts` | `useCampaigns`, `useCampaignById`, `useCreateCampaign`, `useUpdateCampaign`, `useDeleteCampaign`, `useCampaignEmployees` |
| `useUsers.ts` | `useUsers`, `useUserById` |
| `useTags.ts` | `useTags`, `useCreateTag`, `useUpdateTag`, `useDeleteTag` |
| `useSettings.ts` | `useSettings`, `useUpdateSettings` |
| `useComments.ts` | `useComments`, `useCreateComment`, `useUpdateComment`, `useDeleteComment` |
| `useCampaignNotes.ts` | `useCampaignNotes`, `useCreateCampaignNote`, `useUpdateCampaignNote`, `useDeleteCampaignNote` |
| `useActivity.ts` | `useActivity` |
| `useNotifications.ts` | `useNotifications`, `useMarkAsRead`, `useMarkAllAsRead` |
| `useDashboard.ts` | `useDashboardStats`, `useLeadStats`, `useOverdueFollowUps` |
| `useReports.ts` | `useLeadReport`, `usePerformanceReport` |
| `useEmployeeProfile.ts` | `useEmployeeProfile` |
| `useFollowUpNotifications.ts` | Browser notification polling hook |
| `useRealtimeSync.ts` | Socket.IO event subscription → invalidates queries |
| `useSocket.ts` | Raw Socket.IO connection |
| `useStarredLeads.ts` | `isStarred(id)`, `toggle(id)` — localStorage |
| `useRecentViews.ts` | `trackView(id)`, `recentIds` — localStorage |
| `useKeyboardShortcuts.ts` | Global keyboard shortcut bindings |

---

## 10. UI Component Reference

### Layout
- **AdminLayout** — dark sidebar (slate-900), notification bell, user menu, FeedbackButton floating
- **EmployeeLayout** — dark sidebar (mountain-900), same top bar pattern

### Admin Nav Links
Dashboard → Leads → Campaigns → Employees → Reports → Activity → Feedback → Settings

### Employee Nav Links
Dashboard → My Leads → Follow-ups → Settings

### Reusable UI Components
| Component | Props / Notes |
|-----------|--------------|
| `Badge` | `status?: LeadStatus`, `source?: LeadSource` — color-coded |
| `PriorityBadge` | `priority: 'HIGH'│'MEDIUM'│'LOW'` — colored dot |
| `AvailabilityBadge` | `status: AvailabilityStatus`, `size?`, `showLabel?` |
| `TagChip` | `tag: { name, color }` — colored pill |
| `TagInput` | Multi-select tag input fetching from `useTags()` |
| `Modal` | `open`, `onClose`, `title`, `size?` (sm/md/lg/xl/2xl) |
| `Table` | `columns`, `data`, `loading`, `emptyMessage`, `onRowClick?` |
| `Pagination` | `page`, `totalPages`, `onPageChange` |
| `Avatar` | `name`, `size?` — initials-based |
| `StatsCard` | `title`, `value`, `icon`, `color`, `delta?` |
| `Skeleton` | Shimmer loading placeholder |
| `ErrorBoundary` | Wraps children, catches render errors |

### Lead-Specific Components
| Component | Notes |
|-----------|-------|
| `LeadForm` | Full create/edit form with duplicate detection, LostReasonModal intercept, TagInput, priority select |
| `LeadDetail` | Slide-over with Details tab + Comments tab |
| `CommentsSection` | Threaded comments with edit/delete, reply support |
| `DuplicateWarningDialog` | Modal shown when phone/email match existing lead |
| `LostReasonModal` | Required when setting status → LOST |

### Settings Page (admin/SettingsPage.tsx) — 4 tabs
1. **Account** — change password (ChangePasswordSection)
2. **Organization** — CompanyInfoCard + 3 ListEditors (sources, destinations, lostReasons)
3. **Lead Tags** — create/edit/delete tags with 10 preset hex colors
4. **Webhooks** — webhook simulator + API key display

### Reports Page (admin/ReportsPage.tsx)
- Period selector: 7d / 30d / 90d / Custom (date range inputs)
- Tab 1 — Lead Analytics: summary stat cards, BarChart by status, PieChart by source, horizontal BarChart by priority
- Tab 2 — Employee Performance: ranked table with conversion progress bars, top campaigns list
- CSV export via Blob URL (no library)

---

## 11. Environment Variables

### Backend (`.env`)
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
COOKIE_SECURE=true                    # set to 'true' in production
FRONTEND_URL=https://crm.bhatko.in
WHATSAPP_VERIFY_TOKEN=...             # for webhook handshake
WHATSAPP_APP_SECRET=...               # for payload signature (not yet implemented)
UPLOAD_DIR=/app/uploads
PORT=5000
NODE_ENV=production
```

### Frontend (`.env`)
```
VITE_API_URL=https://crm.bhatko.in   # empty = same-origin proxy
```

---

## 12. Security Measures

| Layer | Mechanism |
|-------|-----------|
| JWT access tokens | 15-minute expiry |
| Refresh tokens | SHA-256 hashed in DB, rotated on every use, 7-day TTL |
| Refresh cookie | `httpOnly`, `secure`, `sameSite: strict`, path-scoped to `/api/auth` |
| Password hashing | bcrypt, cost 12 |
| Password change | Revokes all active refresh tokens |
| RBAC | `authenticate` + `requireAdmin` + `requireAdminOrSelf` middleware |
| Org isolation | `orgFilter()` applied to every DB query |
| Employee isolation | `assignedToId` filter auto-applied for EMPLOYEE role |
| Rate limiting | 300/15min all API, 20/15min login endpoint |
| Security headers | Helmet + CSP (`defaultSrc: 'self'`) |
| CORS | Strict origin allowlist |
| SQL injection | Structurally impossible — Prisma parameterized queries only |
| File uploads | MIME type allowlist + 20MB limit + filename sanitization |
| Socket.IO | JWT verified before connection accepted |

### Known Security Gaps
- No backend input sanitization (XSS payloads could be stored in text fields)
- WhatsApp webhook doesn't verify `X-Hub-Signature-256` (anyone can POST fake leads)
- SVG uploads allowed (can contain embedded JS — should be removed from MIME allowlist)
- No account lockout after N failed login attempts (rate limit is IP-based only)
- `sortBy` query param not whitelisted before being passed to Prisma `orderBy`
- No password complexity enforcement (only 8-char minimum)
- No audit log for sensitive operations (role changes, exports, deletions)

---

## 13. Deployment

**Deployed via:** Python SSM script at `C:\Users\kapta\deploy_travel_crm.py`  
**Process:** SSM sends command to EC2 → EC2 runs `git pull + docker compose up --build -d`  
**Docker:** Backend + Frontend built as separate containers  
**Prisma:** `npx prisma generate` runs inside Docker build — this resolves any TypeScript errors about unknown models on local dev machines

TypeScript note: The local Prisma client doesn't know about newer schema models (LeadComment, CampaignNote, etc.) until `prisma generate` runs. Backend TS errors on local are pre-existing and do not block deployment because `tsconfig.json` does not set `noEmitOnError: true`.

---

## 14. Strict Rules (Never Violate)

These rules were set at project inception and must always be respected:

1. **DO NOT** change authentication or the JWT/refresh token flow
2. **DO NOT** change role-based permissions (ADMIN/EMPLOYEE)
3. **DO NOT** modify the search functionality
4. **DO NOT** redesign the sidebar navigation
5. **DO NOT** remove any existing features
6. **DO NOT** break existing API contracts
7. **DO NOT** make unnecessary database schema changes
8. **Keep** the existing UI theme — Tailwind with `primary` (blue) and `mountain` (green) palettes
9. All new features must integrate naturally — no orphaned pages or dead routes
10. Follow enterprise coding standards — reusable, modular components
11. Never display AWS credentials in code or responses

---

## 15. Pending Improvements

Features discussed but not yet implemented:

- **Bulk lead actions** — select multiple leads, bulk assign / status change / export
- **Kanban pipeline view** — leads as cards in status columns with drag-and-drop
- **WhatsApp quick-action** — `wa.me/` link button on lead cards
- **Lead CSV export** from the lead list (Reports CSV exists, lead list export doesn't)
- **Dashboard widgets** — Top Campaign, Top Destination, Priority Breakdown chart, Quick Actions
- **Mobile card layout** — tables → stacked cards on < 640px screens
- **Skeleton loaders** — replace spinners with shimmer placeholders
- **Period-over-period comparison** in Reports (vs last period delta)
- **Lost reason breakdown chart** on Reports page
- **Priority + tag filters** on Employee Leads page (columns exist, filters don't)
- **WebSocket signature verification** on WhatsApp webhook
- **Input sanitization** on backend text fields
- **Account lockout** after failed login attempts

### Proposed New Modules (not started)
- **Packages & Itineraries** — structured tour package definitions
- **Bookings** — converts confirmed leads into operational bookings
- **Payments & Invoicing** — track advance/balance payments per booking
- **Guides & Field Staff** — separate from office employees
- **Expense & P&L per Trip** — revenue vs costs per departure
- **Department Management** — Sales, Operations, Field, Marketing, Finance, Support, HR
- **Vendors & Partners** — hotels, transport, equipment rental
- **Marketing Broadcasts** — bulk WhatsApp/SMS to lead segments
- **Customer Portal** — self-service for confirmed bookings
