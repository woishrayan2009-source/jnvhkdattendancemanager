# JNV Haridwar Hostel Attendance Management System

> **Offline-first** · **Role-based** · **PWA** · Built with React + Vite + Supabase + Dexie

---

## Overview

A progressive web application for managing daily hostel attendance and student leave at Jawahar Navodaya Vidyalaya, Haridwar. Designed for reliable operation in areas with intermittent internet connectivity.

### Key Features
| Feature | Detail |
|---|---|
| **Offline-first** | All reads/writes go to Dexie (IndexedDB) first; SyncService pushes dirty records to Supabase when online |
| **Role-based access** | ADMIN · PRINCIPAL · HM · GATE_GUARD — each role sees a different dashboard and has scoped permissions |
| **Leave management** | Submit → HM review → Principal escalation → Gate Guard tracker → Mark returned |
| **Reports** | Daily Absentee · Monthly Attendance · Long Absence — export as PDF or CSV |
| **PWA** | Installable on Android/iOS; service worker caches all assets and Supabase responses |
| **Auto-lock** | 10-minute inactivity PIN lock to protect sensitive student data |

---

## Local Setup

### 1 — Prerequisites
- Node.js ≥ 20
- A Supabase project (free tier is sufficient)

### 2 — Clone & install
```bash
git clone https://github.com/your-org/jnv-hkd-attendance.git
cd jnv-hkd-attendance
npm install
```

### 3 — Environment variables
```bash
cp .env.example .env
```
Edit `.env` and fill in:
```
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```
Both values are found in your Supabase dashboard → **Project Settings → API**.

### 4 — Run locally
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173).

### 5 — Run tests
```bash
npm test
```

---

## Supabase Setup

### Step 1 — Run the migration
In the Supabase dashboard → **SQL Editor**, open and run:
```
supabase/migrations/001_initial.sql
```
This creates all tables, triggers, RLS policies, and seeds 4 houses, 2 hostels, 3 staff accounts, and 10 students.

### Step 2 — Enable Email Auth
Dashboard → **Authentication → Providers → Email** → Enable.
Disable "Confirm email" for internal staff accounts (optional).

### Step 3 — Verify RLS
Dashboard → **Table Editor** → click any table → **RLS** tab.
Each table should show active policies. If not, re-run the migration.

---

## Deploy to Netlify

### Option A — Connect GitHub (recommended)
1. Push your repo to GitHub.
2. In [Netlify](https://app.netlify.com), click **Add new site → Import an existing project**.
3. Select your GitHub repo.
4. Build settings are auto-detected from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Under **Site configuration → Environment variables**, add:
   ```
   VITE_SUPABASE_URL      = https://<project-id>.supabase.co
   VITE_SUPABASE_ANON_KEY = <your-anon-key>
   ```
6. Click **Deploy site**. Every push to `main` auto-deploys.

### Option B — Netlify CLI
```bash
npm install -g netlify-cli
netlify login
netlify init
netlify env:set VITE_SUPABASE_URL "https://..."
netlify env:set VITE_SUPABASE_ANON_KEY "..."
netlify deploy --prod
```

> [!IMPORTANT]
> The `netlify.toml` already includes the SPA redirect rule (`/* → /index.html`) and security headers. Do **not** add a separate `_redirects` file or it will conflict.

---

## How to Add a New Staff Account

Staff accounts are **created by an Admin** in the Supabase dashboard — there is no public signup.

1. In Supabase Dashboard → **Authentication → Users → Invite user**.
2. Enter the staff member's email. Supabase sends a magic-link invitation.
3. Once they accept, go to **Table Editor → staff** and insert a row:

```sql
INSERT INTO staff (id, name, role, assigned_house_ids)
VALUES (
  '<paste-auth-uid-from-auth-users-table>',
  'Staff Full Name',
  'HM',                                          -- ADMIN | PRINCIPAL | HM | GATE_GUARD
  ARRAY['<house-uuid>']::uuid[]                  -- HM: their assigned house; others: empty array
);
```

4. The staff member can now log in at `/login` with their email + password.

> [!TIP]
> You can also add staff via **Supabase → Table Editor → staff → Insert row** using the visual editor.

---

## Architecture

```
src/
├── db/schema.ts          Dexie v3 schema (offline store)
├── services/
│   ├── AttendanceService.ts
│   ├── LeaveService.ts
│   ├── ReportService.ts
│   ├── StrengthService.ts
│   └── SyncService.ts    Online/offline sync engine
├── pages/
│   ├── PrincipalDashboard.tsx
│   ├── HMDashboard.tsx
│   ├── Attendance.tsx
│   ├── LeaveRequest.tsx
│   ├── LeaveApproval.tsx
│   ├── LeaveTracker.tsx
│   └── Reports.tsx
├── context/AuthContext.tsx
└── hooks/
    ├── useAuth.ts
    ├── useSyncStatus.ts
    └── useInstallPrompt.ts
```

---

## Lighthouse Fixes Applied

| Issue | Fix |
|---|---|
| Missing `<meta name="description">` | ✅ Added to `index.html` |
| Missing `theme-color` meta | ✅ `#1a3a5c` in `index.html` |
| Images without `alt` attributes | ✅ All avatar initials use `aria-label` |
| Labels not associated with inputs | ✅ `htmlFor`/`id` on all Login form fields |
| No `lang` attribute on `<html>` | ✅ `lang="en"` in `index.html` |
| Service worker not re-validated | ✅ `Cache-Control: no-cache` on `sw.js` in `netlify.toml` |
| Large JS chunks (>500 kB) | ✅ `vite.config.js` `manualChunks` splits vendor-react, vendor-supabase, vendor-dexie, vendor-pdf, vendor-qr |
| No `X-Frame-Options` header | ✅ `DENY` set in `netlify.toml` |
| No HTTPS enforcement | ✅ Netlify auto-enforces HTTPS |

---

## License

Internal use only — JNV Haridwar. Not for redistribution.
