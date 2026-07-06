# Travel Agency CRM - Setup Guide

## Prerequisites

1. **Node.js 18+** — Download from https://nodejs.org (LTS version)
2. **PostgreSQL 14+** — Download from https://www.postgresql.org/download/
3. **Git** (optional)

---

## Step 1: Install Node.js

Download and install from: https://nodejs.org
After install, verify: `node --version` and `npm --version`

---

## Step 2: Set Up PostgreSQL

1. Install PostgreSQL
2. Create a database:
   ```sql
   CREATE DATABASE travel_crm;
   ```
3. Note your PostgreSQL username and password (default: postgres / password)

---

## Step 3: Configure Backend

Edit `backend/.env` and update:
```env
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/travel_crm"
```

---

## Step 4: Install & Run Backend

```bash
cd C:\Travel_CRM\backend
npm install
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema to database
npm run db:seed        # Seed sample data
npm run dev            # Start backend (port 5000)
```

---

## Step 5: Install & Run Frontend

Open a new terminal:
```bash
cd C:\Travel_CRM\frontend
npm install
npm run dev            # Start frontend (port 5173)
```

---

## Step 6: Access the Dashboard

Open browser: http://localhost:5173

### Login Credentials (after seeding)
| Role     | Email                    | Password  |
|----------|--------------------------|-----------|
| Admin    | admin@travelcrm.com      | admin123  |
| Employee | rahul@travelcrm.com      | emp123    |
| Employee | priya@travelcrm.com      | emp123    |
| Employee | amit@travelcrm.com       | emp123    |

---

## Meta API Integration

### WhatsApp Business API
1. Go to https://developers.facebook.com
2. Create an App → Select "Business" type
3. Add "WhatsApp" product
4. Set Webhook URL: `https://your-domain.com/api/webhooks/whatsapp`
5. Set Verify Token (must match `WHATSAPP_VERIFY_TOKEN` in .env)
6. Update `.env` with your tokens

### Instagram / Meta Graph API
1. Same Meta App → Add "Instagram" product
2. Set Webhook URL: `https://your-domain.com/api/webhooks/instagram`
3. Set Verify Token (must match `INSTAGRAM_VERIFY_TOKEN` in .env)

### Test Without Real API
Use the **Webhook Simulator** in Settings page:
- Admin → Settings → Webhook Simulator
- Simulate incoming WhatsApp or Instagram leads instantly

---

## Project Structure

```
Travel_CRM/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   ├── src/
│   │   ├── controllers/       # Route handlers
│   │   ├── middleware/        # JWT auth middleware
│   │   ├── routes/            # Express routes
│   │   ├── services/          # Business logic
│   │   ├── types/             # TypeScript types
│   │   ├── utils/             # Logger, seeder
│   │   └── index.ts           # Express + Socket.io server
│   └── .env                   # Environment config
│
└── frontend/
    └── src/
        ├── components/
        │   ├── ui/            # Reusable UI (Badge, Modal, Table...)
        │   ├── layout/        # AdminLayout, EmployeeLayout
        │   ├── dashboard/     # Admin & Employee dashboards
        │   ├── leads/         # Lead components
        │   └── campaigns/     # Campaign components
        ├── hooks/             # React Query hooks
        ├── pages/
        │   ├── admin/         # Admin pages
        │   ├── employee/      # Employee pages
        │   └── LoginPage.tsx
        ├── services/          # Axios API client
        ├── store/             # Zustand state (auth)
        ├── types/             # TypeScript interfaces
        └── utils/             # Helper functions
```

---

## Key Features

- **Lead Capture**: WhatsApp & Instagram webhook integration
- **Auto Lead Routing**: Matches leads to campaigns by number/keyword/ad ID
- **Role-Based Access**: Admin (full) vs Employee (own leads only)
- **Real-time Notifications**: Socket.io for instant lead assignment alerts
- **Follow-up Reminders**: Cron job checks every 30 min, sends in-app alerts
- **Analytics Dashboard**: Recharts visualizations for leads, campaigns, performance
- **Campaign Management**: Create campaigns, assign employees, track conversion
