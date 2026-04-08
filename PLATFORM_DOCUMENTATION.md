# Steadfast Digital Platform — Complete Documentation

> **Last Updated:** April 2026  
> **Repository:** `website-steadfast`  
> **Hosting:** Cloudflare Pages (frontend) + Supabase Edge Functions (backend) + Cloudflare Workers (realtime chat)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [Frontend Application](#3-frontend-application)
   - 3.1 [Routes & Pages](#31-routes--pages)
   - 3.2 [Components](#32-components)
   - 3.3 [Services](#33-services)
   - 3.4 [Hooks](#34-hooks)
   - 3.5 [Admin Panel](#35-admin-panel)
4. [Backend API](#4-backend-api)
   - 4.1 [API Foundation](#41-api-foundation)
   - 4.2 [Authentication System](#42-authentication-system)
   - 4.3 [User Management Endpoints](#43-user-management-endpoints)
   - 4.4 [Task Management Endpoints](#44-task-management-endpoints)
   - 4.5 [Financial System Endpoints](#45-financial-system-endpoints)
   - 4.6 [Premium/Bundle System Endpoints](#46-premiumbundle-system-endpoints)
   - 4.7 [Referral System Endpoints](#47-referral-system-endpoints)
   - 4.8 [Customer Support Endpoints](#48-customer-support-endpoints)
   - 4.9 [Observability & Monitoring Endpoints](#49-observability--monitoring-endpoints)
   - 4.10 [Health & Deployment Endpoints](#410-health--deployment-endpoints)
5. [Business Rules & Systems](#5-business-rules--systems)
   - 5.1 [VIP Level System](#51-vip-level-system)
   - 5.2 [Task & Commission System](#52-task--commission-system)
   - 5.3 [Premium/Bundle System](#53-premiumbundle-system)
   - 5.4 [Referral System](#54-referral-system)
   - 5.5 [Rewards System](#55-rewards-system)
   - 5.6 [Frozen Account Rules](#56-frozen-account-rules)
   - 5.7 [Withdrawal Rules](#57-withdrawal-rules)
   - 5.8 [Daily Task Reset Rules](#58-daily-task-reset-rules)
6. [Data Storage (KV Store)](#6-data-storage-kv-store)
7. [Security](#7-security)
8. [Realtime Chat System](#8-realtime-chat-system)
9. [Deployment & Infrastructure](#9-deployment--infrastructure)
   - 9.1 [CI/CD Pipeline](#91-cicd-pipeline)
   - 9.2 [Deployment Commands](#92-deployment-commands)
   - 9.3 [Scripts & Utilities](#93-scripts--utilities)
   - 9.4 [Environment Variables](#94-environment-variables)
10. [Testing](#10-testing)
11. [UI/UX Policies](#11-uiux-policies)
12. [Key File Reference](#12-key-file-reference)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    USERS / ADMINS                        │
└───────────┬───────────────────────────────┬──────────────┘
            │                               │
            ▼                               ▼
┌───────────────────────┐     ┌──────────────────────────┐
│   Cloudflare Pages    │     │   Cloudflare Workers     │
│   (React Frontend)    │     │   (Realtime Chat)        │
│                       │     │                          │
│  website-steadfast    │     │  steadfast-realtime-chat │
│  .pages.dev           │     │  chat-api.steadfast      │
│                       │     │  workbench.org           │
│  steadfastworkbench   │     │                          │
│  .org                 │     │  - Durable Objects       │
│                       │     │  - D1 SQLite DB          │
└───────────┬───────────┘     │  - WebSocket support     │
            │                 └──────────────────────────┘
            │ HTTPS
            ▼
┌───────────────────────────────────────┐
│         Supabase Edge Functions       │
│         (Deno Runtime)                │
│                                       │
│  Function: make-server-a1c55d7e       │
│  Project:  gvqwvuqeenkusdayosty       │
│                                       │
│  - REST API (~80+ endpoints)          │
│  - Session management                 │
│  - Business logic                     │
│  - KV Store (Supabase PostgreSQL)     │
│  - Rate limiting                      │
│  - Security headers                   │
└───────────────────────────────────────┘
```

**Data flow:**
- Frontend makes HTTPS requests to the Supabase Edge Function
- Edge Function processes business logic and reads/writes to a KV store backed by Supabase PostgreSQL
- Realtime chat uses Cloudflare Workers with Durable Objects for WebSocket-based stateful conversations

---

## 2. Technology Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18.3.1 | UI framework |
| React Router | 7.13.0 | Client-side routing |
| TypeScript | — | Type safety |
| Tailwind CSS | 4.1.12 | Styling |
| Vite | 6.3.5 | Build tool & dev server |
| Lucide React | 0.487.0 | Icons |
| Sonner | 2.0.3 | Toast notifications |
| @supabase/supabase-js | ^2.49.8 | Backend API client |

### Backend
| Technology | Purpose |
|---|---|
| Supabase Edge Functions | REST API server |
| Deno Runtime | Edge function execution |
| Supabase KV (PostgreSQL) | Key-value data storage |
| PBKDF2-SHA256 (200k iterations) | Password hashing |

### Chat Infrastructure
| Technology | Purpose |
|---|---|
| Cloudflare Workers | Worker runtime |
| Durable Objects | Stateful conversation management |
| D1 SQLite | Chat data persistence |
| WebSockets | Real-time messaging |
| Wrangler | ^4.78.0 | Deployment CLI |

### Testing
| Technology | Version | Purpose |
|---|---|---|
| Vitest | ^4.1.0 | Test runner |
| v8 coverage | — | Code coverage |

### Build & Deploy
| Technology | Purpose |
|---|---|
| Cloudflare Pages | Frontend hosting (auto-deploy on push to `main`) |
| GitHub Actions | CI/CD pipeline |
| Supabase CLI | Backend deployment |

---

## 3. Frontend Application

### 3.1 Routes & Pages

#### Public Routes (No Authentication Required)

| Route | Component | Description |
|---|---|---|
| `/` | `Home.tsx` | Marketing landing page — Precision Growth Engine, Risk-Aware Operations, Creative Intelligence, Decision-Grade Analytics |
| `/login` | `Login.tsx` | User login with email/username + password. Displays redirection notices (session expired, auth required) |
| `/signup` | `Signup.tsx` | Registration: username, phone, login password, transaction password, invite code, optional admin code, gender, T&C acceptance |
| `/forgot-password` | `ForgotPassword.tsx` | Password recovery flow |
| `/terms-conditions` | `TermsConditions.tsx` | Terms and conditions document |
| `/faqs` | `FAQs.tsx` | FAQ: product optimization missions, withdrawal rules, VIP levels, account management |
| `/about` | `About.tsx` | About company page |
| `/certificate` | `Certificate.tsx` | User certificate: account stats, VIP level, tasks completed, total commission, referral earnings |
| `/deployment-status` | `DeploymentStatus.tsx` | Deployment health status page |
| `*` | `NotFound.tsx` | 404 error page |

#### Authenticated Routes (Require Login)

| Route | Component | Description |
|---|---|---|
| `/home` | `UserHome.tsx` | Main dashboard: balance, hold amount, today's commission, lucky bonus, active premium bundles, task catalog with VIP-tier pricing, winners ticker, bonus feed, quick-links |
| `/starting` | `Starting.tsx` | Product optimization missions/tasks: task completion progress, daily task limit, VIP config, active premium products, task dashboard with filtering, financial card |
| `/records` | `Records.tsx` | Transaction/activity records: completed tasks, task status, commission earned, referral data |
| `/activity` | `Activity.tsx` | Activity feed: bonus rewards by VIP tier, financial snapshots |
| `/vip-levels` | `VipLevels.tsx` | VIP tier details: level requirements, profit rates, max daily orders per tier |
| `/withdrawal` | `Withdrawal.tsx` | Withdrawal request: amount, wallet address, transaction password, wallet profile, recent records |
| `/withdrawal-history` | `WithdrawalHistory.tsx` | Withdrawal status tracking: Reviewing/Pending, Success/Approved, Reject/Rejected tabs |
| `/deposit` | `Deposit.tsx` | Deposit management: balance, hold amount, recent deposits, transaction history |
| `/profile` | `Profile.tsx` | User profile: account info, referral code (copyable), security credentials (login/transaction passwords), notifications, language |
| `/connect-wallet` | `ConnectWallet.tsx` | Wallet setup: crypto (Bitcoin, Ethereum, etc.) with wallet type, address, network selection |
| `/support` | `Support.tsx` | Customer support: live chat with admins, support contacts (WhatsApp, Telegram, Email), ticket creation/tracking |
| `/logout` | `Logout.tsx` | Session termination and redirect |

#### Admin Routes

| Route | Component | Description |
|---|---|---|
| `/admin` | `Admin.tsx` | Unified admin control panel: users, transactions, withdrawals, deposits, rewards, VIP configs, products, tasks, notifications, admin users, settings, backup/restore, salary management, session diagnostics |

### 3.2 Components

#### Layout & Navigation
| Component | Purpose |
|---|---|
| `BottomNavigation` | Fixed mobile nav: Home, Starting (center elevated with glow), Records |
| `Header` | Sticky header: Steadfast logo, home link, optional contact/chat trigger |

#### Chat & Support
| Component | Purpose |
|---|---|
| `LiveChatBox` | Modal overlay for live chat with `UserLiveChat` + `SupportContactMethods` |
| `UserLiveChat` | Real-time messaging interface for user↔admin communication |
| `ChatNotificationBadge` | Unread chat message indicator |
| `SupportContactMethods` | Alternative support links (WhatsApp, Telegram, Email) |

#### Error Handling & Loading
| Component | Purpose |
|---|---|
| `AppErrorBoundary` | Global error boundary |
| `RouteErrorBoundary` | Per-route error boundary |
| `RouteLoadFallback` | Loading spinner during code-splitting load |
| `AdminPanelFallback` | Loading placeholder for admin panel sections |

#### User Experience
| Component | Purpose |
|---|---|
| `OnboardingFlow` | First-time user tutorial with `useOnboarding` hook |
| `WelcomeModal` | Welcome/greeting modal |

#### Admin-Specific
| Component | Purpose |
|---|---|
| `PremiumBundles` | Premium product bundle management |
| `LiveChatAdmin` | Admin chat interface for responding to user support |
| `InvitationCodes` | Invitation/signup code management |
| `CustomerSupport` | Support ticket management |
| `AdminSessionDiagnostics` | Session debugging tool |

### 3.3 Services

#### Authentication & Session
| Service | Key Functions |
|---|---|
| `supabaseAuth.ts` | Supabase client, admin role detection, session token management |
| `serverAuth.ts` | `serverLogin()`, `serverSignup()`, `serverLogout()`, session storage, password change tracking |
| `referralSystem.ts` | `getCurrentUsername()`, `isAuthenticated()`, `isCurrentUserAdmin()`, `logoutCurrentUser()` |
| `loginRedirect.ts` | Login redirect state management |

#### Financial & User Data
| Service | Key Functions |
|---|---|
| `financialReadModel.ts` | `fetchFinancialSummary()` — balance, commissions, bonuses |
| `referralReadModel.ts` | `fetchReferralSummary()` — referral earnings, counts |
| `bonusFeed.ts` | `fetchBonusFeed()`, `acknowledgeBonusFeedItems()` |
| `winnersTicker.ts` | `fetchWinnersTicker()` — leaderboard data |

#### Configuration
| Service | Key Functions |
|---|---|
| `vipConfig.ts` | `fetchPublicVipConfig()`, `fetchAdminVipConfig()`, `updateAdminVipConfig()` |
| `rewardsConfig.ts` | Rewards system configuration (public + admin) |
| `adminPlatformSettings.ts` | Platform-wide settings management |

#### Admin Management
| Service | Key Functions |
|---|---|
| `adminSalaryBackup.ts` | Salary payment backup/restore, audit logs, export/import, recovery points |
| `adminAuthError.ts` | `handleAdminAuthError()`, `isAdminAuthErrorMessage()` |

#### Network & API
| Service | Key Functions |
|---|---|
| `networkClient.ts` | `fetchJsonWithRetry()` — HTTP client with caching, retry, timeouts |
| `apiCompatibility.ts` | Client compatibility tracking, cache key builder, event reporting |
| `publicApi.ts` | Public API endpoints (unauthenticated) |
| `runtimeEnvironment.ts` | `RUNTIME_ENVIRONMENT` — API base URL, function name, environment config |

### 3.4 Hooks

| Hook | Purpose |
|---|---|
| `useBackNavigate` | Back navigation using browser history or fallback to `/home` |
| `useTableSort` | Table sorting, searching, filtering, pagination for admin data tables |
| `useAdminSalaryBackup` | Salary payment state management with auto-backup, restore points, audit logging |
| `useVersionCheck` | Periodic version checks (5-min polling) for deployment updates and health |

### 3.5 Admin Panel

The Admin page loads sub-modules lazily as tab/menu sections:

| Section | Component | Features |
|---|---|---|
| Home | `AdminHome.tsx` | Dashboard: user count, platform revenue, pending withdrawals, API version status, force sync all users |
| Users Management | `AdminUsers.tsx` | Admin user CRUD, invitation code generation, admin role assignment |
| User Management | `UserManagement.tsx` | Platform user list, VIP adjustment, balance adjustment, task limits, user deletion, audit logs |
| Financials | `Financials.tsx` | Revenue overview, financial metrics dashboard |
| Transactions | `Transactions.tsx` | All transactions with filtering, sorting, search |
| Withdrawals | `Withdrawals.tsx` | Withdrawal queue (Pending/Approved/Rejected), approve with tx hash, reject with reason |
| Deposits | `Deposits.tsx` | Deposit records and management |
| Tasks | `Tasks.tsx` | Product task catalog management, pricing by VIP tier, active/paused status |
| Products | `ProductManagement.tsx` | Product catalog CRUD, AI bulk generation, CSV/JSON import, VIP tier assignment |
| Rewards System | `RewardsSystem.tsx` | Bonus reward configuration, distribution rules |
| VIP Config | `VipConfig.tsx` | VIP tier management (1–5+), investment amounts, daily task limits, commission rates |
| Notifications | `Notifications.tsx` | System notification broadcast/management |
| Settings | `AdminSettings.tsx` | Platform-wide admin settings |

**Admin Modals:**
- `AdminModals.tsx` — Generic CRUD modals (add/edit/delete users, products, tasks)
- `AdminPromptModals.tsx` — Special modals: Reset Credentials, Credit Score

---

## 4. Backend API

### 4.1 API Foundation

| Property | Value |
|---|---|
| **Service Name** | `make-server-a1c55d7e` |
| **Supabase Project** | `gvqwvuqeenkusdayosty` |
| **Base Paths** | `/make-server-a1c55d7e/{endpoint}`, `/make-server-a1c55d7e/v1/{endpoint}`, `/make-server-a1c55d7e/v2/{endpoint}` |
| **API Versions** | v1 (default), v2 |
| **Frontend Contract** | `2026-03-31-contract-v1` |

**CORS Configuration:**
- Production origins: `https://website-steadfast.pages.dev`, `https://steadfastworkbench.org`, `https://www.steadfastworkbench.org`
- Configurable via `CORS_ALLOWED_ORIGINS` environment variable
- Credentials: enabled (session cookies)

**Security Headers:**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- `Content-Security-Policy: default-src 'none'`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`

### 4.2 Authentication System

#### User Authentication

| Endpoint | Method | Auth | Rate Limit | Description |
|---|---|---|---|---|
| `/auth/signup` | POST | Public | 10/min | Register new user account with referral chain |
| `/auth/login` | POST | Public | 10/min | Server-backed session creation, sets cookie |
| `/auth/session/restore` | POST | Public | 20/min | Restore auth state from session cookie |
| `/auth/verify-token` | POST | Public | — | Validate JWT/session token structure |
| `/auth/session/logout` | POST | User | — | Destroy server session |
| `/auth/forgot-password` | POST | Public | 3/min | Initiate password reset (email-based token) |
| `/auth/verify-reset-token/:token` | GET | Public | — | Validate password reset token |
| `/auth/reset-password` | POST | Public | — | Reset password with valid token |
| `/auth/change-password` | POST | User | — | Change password while logged in |
| `/auth/change-credentials` | POST | User | — | Update username and/or passwords |

**Signup Request:**
```json
{
  "username": "string (1-64 alphanumeric, _, -, .)",
  "phone": "string",
  "gender": "string (optional)",
  "loginPassword": "string (min 6 chars)",
  "transactionPassword": "string (min 6 chars)",
  "invitationCode": "string (5 chars, must contain digit)",
  "adminInviteCode": "string (optional)"
}
```

**Login Response:**
```json
{
  "ok": true,
  "username": "canonical_username",
  "mustChangePassword": false,
  "sessionToken": "session_id"
}
```

**Password Hashing:** PBKDF2-SHA256 with 200,000 iterations.

#### Admin Authentication

- Requires Bearer token in `Authorization` header
- Admin roles: `admin` (standard), `super_admin` (full system access)
- Role resolved from `app_metadata.role` → `app_metadata.roles[]` → `user_metadata.role` → `user_metadata.roles[]`
- Admin rate limit: 60 requests/minute per admin per IP

#### Script Tokens (Admin API Access)

**POST** `/admin/script-tokens` — *Super Admin Only*

Creates time-limited, use-limited API tokens for scripted admin access.

```json
{
  "scopes": ["platform-users:reconcile", "tasks:manage"],
  "ttlMs": 600000,
  "maxUses": 1500,
  "label": "token description"
}
```

**Available Scopes:**
| Scope | Access |
|---|---|
| `platform-users:reconcile` | GET/POST user list, bulk task controls |
| `platform-users:maintain` | User audits, recalculations, ghost user recovery |
| `platform-users:finance` | Balance adjustments, VIP level changes |
| `platform-users:delete` | DELETE users |
| `tasks:manage` | GET/POST/PUT/DELETE tasks and bulk operations |
| `transactions:read` | GET transaction history |
| `referrals:read` | GET referral overview |
| `vip-config:manage` | GET/PUT VIP configuration |
| `rewards-config:manage` | GET/PUT rewards configuration |
| `salary:manage` | Salary project and audit management |
| `platform-settings:manage` | Platform settings |
| `admin:all` | All endpoints (supersedes specific scopes) |

Token format: `ast_{tokenId}.{secret}` — max TTL 15 minutes, max 2000 uses.

### 4.3 User Management Endpoints

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/me/user` | GET | User | Full user profile (balance, VIP, tasks, wallet, etc.) |
| `/me/balance` | GET | User | Quick balance summary |
| `/me/earnings` | GET | User | Earnings breakdown |
| `/me/financials` | GET | User | Complete financial state |
| `/admin/users` | GET | Admin | List all platform users (paginated, searchable) |
| `/admin/users` | POST | Admin | Create admin user account |
| `/admin/users/:adminId` | DELETE | Super Admin | Remove admin access |

**User Profile Response Fields:**
- `username`, `vipLevel` (1–5), `balance`, `holdAmount`, `availableAmount`
- `todayCommission`, `referralEarnings`, `luckyBonus`
- `tasksCompleted`, `tasksLimit`, `tasksCompletedInSet`, `completedTaskSets`
- `phone`, `gender`, `invitationCode`, `invitedByCode`
- `walletProfile`, `lastLoginAt`, `lastLoginIp`, `lastActivityAt`

### 4.4 Task Management Endpoints

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/tasks/catalog` | GET | Public | Master list of available tasks/products |
| `/me/submit-task` | POST | User (60/min) | Submit completed task, claim commission |
| `/me/tasks` | GET | User | User's submitted tasks (pending/completed/rejected) |
| `/admin/tasks` | GET/POST | Admin | List/create catalog tasks |
| `/admin/tasks/bulk` | POST/PUT/DELETE | Admin | Bulk create/update/delete tasks |
| `/admin/tasks/generate` | POST | Admin | AI-generate random task catalog (testing) |
| `/admin/tasks/:taskId` | PUT/DELETE | Admin | Update/delete single task |
| `/admin/platform-users/reconcile-task-progress` | POST | Super Admin | Recover drifted task counters from actual records |

**Task Submission Request:**
```json
{
  "taskId": "string",
  "transactionPassword": "string",
  "idempotencyKey": "string (optional)"
}
```

### 4.5 Financial System Endpoints

#### Transactions

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/me/transactions` | GET | User | User's transaction history (paginated, filterable by type/status) |
| `/admin/transactions` | GET | Admin | All platform transactions |

**Transaction Types:** `Deposit`, `Withdrawal`, `Commission`  
**Transaction Statuses:** `Pending`, `Completed`, `Rejected`, `Failed`

#### Withdrawals

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/me/withdrawals` | GET | User | Withdrawal history |
| `/me/withdrawals/request` | POST | User (5/day) | Submit withdrawal request |
| `/admin/withdrawals` | GET | Admin | All withdrawal requests |
| `/admin/withdrawals/:id/review` | POST | Admin | Approve/reject withdrawal |

**Withdrawal Request:**
```json
{
  "amount": 50.00,
  "walletProfile": {
    "type": "crypto",
    "walletType": "bitcoin",
    "walletAddress": "string",
    "network": "mainnet"
  },
  "transactionPassword": "string"
}
```

#### Wallet Management

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/me/wallet` | GET | User | Current wallet configuration |
| `/me/wallet` | PUT | User (20/min) | Update wallet profile |

#### Snapshot Endpoints (Pre-Aggregated Dashboard Data)

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/me/starting-snapshot` | GET | User | Dashboard/home page data (60s cache) |
| `/v2/me/starting-snapshot` | GET | User | V2 with extended compatibility telemetry |
| `/me/records-snapshot` | GET | User | Tasks and transactions detailed view |
| `/me/activity-snapshot` | GET | User | Recent activity and earnings breakdown |

### 4.6 Premium/Bundle System Endpoints

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/me/premium` | GET | User | Active premium assignments |
| `/me/complete-premium-task` | POST | User | Complete task against active premium bundle |
| `/admin/assign-premium-bundle` | POST | Admin | Assign premium bundle to user |
| `/admin/cancel-premium/:username/:premiumId` | DELETE | Admin | Cancel active premium |
| `/admin/premium-assignments` | GET | Admin | All active premium assignments |

### 4.7 Referral System Endpoints

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/referral/link-user` | POST | Public | Link user to referral network |
| `/me/referrals/summary` | GET | User | Referral earnings and network stats |
| `/admin/referrals/overview` | GET | Admin | Referral network overview |

### 4.8 Customer Support Endpoints

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/cs/support-links` | GET | Public | Support resource links |
| `/cs/support-links` | POST | Admin | Create/update support links |
| `/cs/create-ticket` | POST | User | Create support ticket |
| `/cs/admin/tickets` | GET | Admin | All support tickets |
| `/cs/respond` | POST | Admin | Respond to ticket |
| `/cs/update-status` | POST | Admin | Update ticket status |
| `/cs/chat/send` | POST | User | Send live chat message |
| `/cs/chat/:username` | GET | Admin | Get conversation with user |
| `/cs/chat/mark-read` | POST | User/Admin | Mark messages as read |
| `/cs/admin/chats` | GET | Admin | List all active chats |
| `/me/chat/summary` | GET | User | Chat summary |

### 4.9 Observability & Monitoring Endpoints

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/admin/observability/security-summary` | GET | Admin | Security status and alerts |
| `/admin/observability/endpoint-latency-report` | GET | Admin | Endpoint performance (p50, p95, failure rates) |
| `/admin/observability/compatibility-report` | GET | Admin | Client compatibility metrics |
| `/admin/observability/security-alerts` | GET | Admin | Active security alerts |
| `/admin/observability/security-alert-history` | GET/DELETE | Admin | Historical security events |
| `/admin/observability/security-alert-history/stats` | GET | Admin | Alert statistics |
| `/admin/observability/security-alert-history/trends` | GET | Admin | Alert trends |
| `/admin/observability/security-alert-history/quality` | GET | Admin | Alert quality metrics |
| `/admin/observability/security-alert-config` | GET/PUT | Admin | Alert threshold configuration |
| `/admin/observability/audit-log` | GET | Admin | Admin action audit log |
| `/admin/observability/rate-limit-status` | GET | Admin | Rate limit violation status |

### 4.10 Health & Deployment Endpoints

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/health` | GET | Public | Basic liveness check → `ok` |
| `/health/live` | GET | Public | Kubernetes-style liveness probe |
| `/health/ready` | GET | Public | Readiness probe (checks KV connectivity) |
| `/version` | GET | Public | Deployment version info (service, commit SHA, deploy time, staleness, supported API versions) |
| `/v1/version` | GET | Public | Versioned variant |

#### Additional Platform Endpoints

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/vip-config` | GET | Public | Current VIP level configuration |
| `/admin/vip-config` | GET | Admin | VIP config with editing |
| `/admin/vip-config/:level` | PUT | Admin | Update single VIP level |
| `/admin/sync-all-users-vip` | POST | Admin | Recalculate VIP levels for all users |
| `/rewards-config` | GET | Public | Rewards configuration |
| `/admin/rewards-config` | GET/PUT | Admin | Rewards config management |
| `/admin/platform-settings` | GET/PUT | Admin | Platform settings (hours, status) |
| `/public/winners-ticker` | GET | Public | Top earners ticker display |
| `/admin/salary/project` | GET/PUT | Admin | Salary project state |
| `/admin/salary/audit-log` | GET/PUT | Admin | Salary audit log |
| `/client/compatibility-events` | POST | Public | Client telemetry events |
| `/v2/client/compatibility-events` | POST | Public | V2 telemetry |

---

## 5. Business Rules & Systems

### 5.1 VIP Level System

Users are assigned a VIP level based on their deposit/investment amount:

| Level | Name | Investment Required | Daily Task Limit | Commission Rate | Color |
|---|---|---|---|---|---|
| 1 | VIP 1 | $100 | 40 | 0.5% | Bronze |
| 2 | VIP 2 | $500 | 45 | 1.0% | Silver |
| 3 | VIP 3 | $1,600 | 50 | 1.5% | Gold |
| 4 | VIP 4 | $5,500 | 55 | 2.0% | Platinum |
| 5 | VIP 5 | $10,000 | 60 | 2.5% | Diamond |

**Commission Range Structure** (by product price tier):
| Product Price Range | Min Commission | Max Commission |
|---|---|---|
| $1–$99 | $0.50 | $2.00 |
| $100–$499 | $3.00 | $8.00 |
| $500–$999 | $8.00 | $20.00 |
| $1,000–$4,999 | $50.00 | $150.00 |
| $5,000+ | $200.00 | $500.00 |

### 5.2 Task & Commission System

- Users complete product optimization missions (tasks) to earn commissions
- Each task is a product from the catalog with a price and commission rate
- Commission amount depends on VIP level and product price range
- Daily task limit varies by VIP level (40–60 tasks)
- Tasks are grouped into **task sets** (default 2 sets per day)
  - Each set has `tasksPerSet` tasks (40/45/50/55/60 based on VIP level)
- Task submission requires the user's **transaction password** for verification
- Idempotency keys prevent duplicate submissions

### 5.3 Premium/Bundle System

Premium bundles allow admins to assign high-value product packages to users.

**How It Works:**
1. Admin assigns a premium bundle to a user → account becomes **frozen**
2. The user's balance before freeze is captured as `balanceBeforeAssignment`
3. An **uphold/hold amount** (the premium's top-up requirement) is applied to the account
4. While frozen, the user cannot submit regular tasks
5. Admin unfreezes the account → **settlement** occurs via `restoreUserToNaturalState`

**Settlement Formula:**
```
settledBalance = preFreezeBalance + settledUpholdAmount + residualBalance + premiumProfit

where:
  preFreezeBalance    = activePremium.balanceBeforeAssignment
  settledUpholdAmount = max(topUpRequired, configuredUpholdAmount, holdAmount)
  residualBalance     = max(0, currentBalance)
  premiumProfit       = commissionEarned > 0 ? commissionEarned : projected(bundleValue × VIP×10 rate)
```

**Premium profit** is added to `todayCommission` on unfreeze.

**VIP Premium Adjustments:**
| VIP Level | Value Multiplier | Min Value | Max Value |
|---|---|---|---|
| 1 | 1.1x | $220 | $420 |
| 2 | 1.2x | $300 | $620 |
| 3 | 1.35x | $500 | $1,300 |
| 4 | 1.5x | $900 | $2,600 |
| 5 | 1.8x | $1,800 | $5,200 |

### 5.4 Referral System

- **Referral Rate:** 20% flat (`REFERRAL_PARENT_RATE = 0.2`)
- Parent earns 20% of child's task commissions — this is **additional** money (child keeps 100%)
- Parent also earns 20% of child's **premium profit** when the child's account is unfrozen
- Formula: `parentReward = roundMoney(childCommission × 0.2)`
- Referral codes: 5 alphanumeric characters, must contain at least 1 digit
- Root referral user: `steadfast_root` (code `STF01`, cannot be deleted)
- Referral relationships are established at signup via the invitation code

### 5.5 Rewards System

#### Workday Rewards (Daily Salary for Consecutive Work Days)
| Consecutive Days | Salary |
|---|---|
| 1 | $204 |
| 7 | $1,428 |
| 15 | $3,060 |
| 22 | $4,488 |
| 30 | $6,120 |

#### Reset Rewards (Deposit-Based Bonuses)
| Deposit | Reward | Label |
|---|---|---|
| $100 | $10 | Starter |
| $500 | $60 | Hot Picks |
| $1,000 | $120 | Value |
| $1,600 | $200 | Limited |
| $5,500 | $1,200 | Growth |
| $10,000 | $2,400 | Best Deal |

#### Accumulated Rewards (Interest on Deposits)
| Min Deposit | Max Deposit | Interest Rate |
|---|---|---|
| $1,500 | $9,999 | 4% |
| $10,000 | $19,999 | 8% |
| $20,000 | $49,999 | 12% |
| $50,000 | ∞ | 20% |

#### Product System Rewards (Premium Incentives)
- Products per set: 10
- Max sets per day: 5 (50 tasks/day max)
- Min time per product: 30 seconds
- Premium trigger task number: 10
- Premium base value: $300

### 5.6 Frozen Account Rules

When an account is frozen (premium assignment active):

1. **Hold Amount Display:** Must equal the premium's top-up/uphold requirement — never 0 when a premium is active
2. **Data Source Priority** (frontend `frozenUpholdAmount`, uses `||` chains so `0` falls through):
   1. `userData.holdAmount` (KV record)
   2. `activePremium.configuredUpholdAmount` (admin-set override)
   3. `activePremium.topUpRequired` (calculated at assignment time)
   4. `activePremium.negativeAmount` (legacy alias)
   5. Fallback: `0`
3. **Balance Before Freeze:** Uses `activePremium.balanceBeforeAssignment` (balance BEFORE deduction)
4. **Negative Sign:** Only show `-` prefix when `frozenUpholdAmount > 0` — never display `-0.00 USD`
5. **Server-Side Self-Healing:** Both `handleStartingSnapshot` and `buildFinancialSummaryResponse` auto-correct stale `holdAmount` when a premium exists

**Financial Card — Frozen State:**
| Card Field | Source |
|---|---|
| Today's Commission | `todayCommission + premiumProfitContribution` |
| Current Balance (Before Freeze) | `activePremium.balanceBeforeAssignment` |
| Hold Amount (red, negative) | `frozenUpholdAmount` |
| Total Account Balance | `beforeFreeze + upholdAmount + premiumProfit` |
| Working Status | "Settlement Review" |

### 5.7 Withdrawal Rules

- Minimum withdrawal: $10
- Maximum 5 withdrawal requests per day
- Must have sufficient available balance (balance − holdAmount)
- Withdrawal requests go through admin review before completion
- Hold amount applied during pending period
- Supports crypto wallets (BTC, ETH, USDT) and banking accounts
- Admin can approve (with tx hash) or reject (with reason)

### 5.8 Daily Task Reset Rules

1. **Cycle Completion Guard:** Daily task reset **only** fires when the user has completed ALL task sets (`completedTaskSets >= taskSetCount`). Mid-cycle users keep their progress across day boundaries.
2. **Frozen Account Guard:** Frozen accounts **always** skip the daily reset (`!normalized.isFrozen`)
3. **On Unfreeze:** `restoreUserToNaturalState` sets `lastTaskResetDate = today` to prevent immediate reset
4. **Natural Reset:** Fires on the user's first load on the NEXT new day (after unfreeze)
5. **`lastTaskResetDate`** still advances daily for all users (for commission date tracking)

---

## 6. Data Storage (KV Store)

All data is stored in a Supabase-backed key-value store with the following key patterns:

| Key Pattern | Description |
|---|---|
| `user:{username}` | Main user record (profile, balance, VIP, tasks, etc.) |
| `user:lookup:{username_lower}` | Canonical username resolution (case-insensitive) |
| `task:{username}:{timestamp}` | Individual task completion records |
| `premium:{username}:{id}` | Premium bundle assignments |
| `transaction:{id}` | Transaction records |
| `transaction-user:{username}` | User's transaction list |
| `withdrawal:{id}` | Withdrawal requests |
| `financial-ledger:{username}` | Ledger entries (reason, amount, balance before/after) |
| `referral:invite:{code}` | Referral code → username mapping |
| `referral:event:{id}` | Referral events |
| `admin:invite:code:{code}` | Admin invitation tracking |
| `vip-config:{level}` | VIP level configurations |
| `rewards-config:v{version}:primary` | Rewards configuration |
| `task-catalog:{id}` | Task/product definitions |
| `admin:script-token:{id}` | API tokens for admin scripting |
| `dist-lock:{key}` | Distributed locks for concurrent operations |
| `rate-limit:{key}` | Rate limit buckets |

**Financial Operations:**
- All balance changes use distributed locks per user
- Transactions are immutable after creation
- Ledger records track reason, amount, balance before/after
- Daily commission reset at configurable timezone (default UTC)

---

## 7. Security

### Password Security
- PBKDF2-SHA256 with 200,000 iterations
- Separate login password and transaction password per user
- Transaction password required for task submission and withdrawals
- `mustChangePassword` flag forces credential update after admin reset

### Rate Limiting
| Scope | Limit |
|---|---|
| User signup | 10/minute |
| User login | 10/minute |
| Session restore | 20/minute |
| Forgot password | 3/minute |
| Task submission | 60/minute |
| Wallet update | 20/minute |
| Withdrawal request | 5/day |
| Admin operations | 60/minute per admin per IP |

### Security Headers
All responses include: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Content-Security-Policy: default-src 'none'`, `Strict-Transport-Security: max-age=31536000`.

### Admin Script Tokens
- Time-limited (max 15 minutes)
- Use-limited (max 2000 uses)
- Scoped to specific endpoint groups
- PBKDF2-hashed secrets
- Format: `ast_{tokenId}.{secret}`

### Session Management
- Server-side sessions with cookie-based tokens
- Session restore validates token validity and user existence
- Logout destroys server-side session

---

## 8. Realtime Chat System

A separate Cloudflare Workers application handles real-time chat between users and admins.

| Property | Value |
|---|---|
| **Worker Name** | `steadfast-realtime-chat` |
| **Production Route** | `chat-api.steadfastworkbench.org/*` |
| **Database** | D1 SQLite (`steadfast-realtime-chat-db`) |
| **State Management** | Durable Objects (`ConversationDurableObject`) |
| **WebSocket TTL** | 45 seconds |
| **SLA Breach Timer** | 30 minutes |

**Source Files:**
| File | Purpose |
|---|---|
| `realtime-chat-worker/src/index.ts` | Worker entry point |
| `realtime-chat-worker/src/conversation-do.ts` | Durable Object class |
| `realtime-chat-worker/src/types.ts` | TypeScript interfaces |
| `realtime-chat-worker/src/utils.ts` | Helpers |

**Database Migrations:**
1. `0001_init_chat.sql` — Initial schema
2. `0002_ws_tickets_and_sla_alerts.sql` — WebSocket tickets + SLA escalation

**Environment Variables:**
- `CORS_ALLOW_ORIGINS` — Allowed origins for CORS
- `ADMIN_ROLE_NAMES` — `admin,super_admin`
- `USER_ROLE_NAMES` — `user,member`
- `SLA_BREACH_MINUTES` — `30`
- `WS_TICKET_TTL_SECONDS` — `45`
- Feature flags: `CHAT_REQUIRE_USER_JWT`, `SLA_AUTO_ESCALATE` (both `false`)

---

## 9. Deployment & Infrastructure

### 9.1 CI/CD Pipeline

**File:** `.github/workflows/ci-tests.yml`

- **Trigger:** Push to `main` + Pull Requests
- **Environment:** Ubuntu Latest, Node 20, 20-minute timeout
- **Steps:**
  1. Checkout code
  2. Setup Node + npm cache
  3. Install deps (`npm ci`)
  4. Run full test suite (`npm run test:all`)
  5. Strict admin integration tests (if `SUPABASE_ADMIN_TEST_JWT` available)
  6. Production build test

**Frontend Deploy:** Cloudflare Pages auto-deploys on push to `main`.

### 9.2 Deployment Commands

```powershell
# Backend: Deploy Supabase Edge Function
npx supabase functions deploy make-server-a1c55d7e --project-ref gvqwvuqeenkusdayosty --no-verify-jwt

# Backend: Hardened deploy (updates secrets + timestamps)
npm run deploy:supabase:hardened

# Backend: Rollback
npm run rollback:supabase:last-good

# Frontend: Push to main (auto-deploys)
git push origin main

# Chat Worker: Deploy
npm run chat:worker:deploy

# Chat Worker: Run migrations
npm run chat:worker:migrate
```

### 9.3 Scripts & Utilities

| Script | Purpose |
|---|---|
| `backup-project.mjs` | Timestamped project backups with git safety commits |
| `backup-storage-report.mjs` | Storage analysis snapshots |
| `admin-endpoint-smoke.mjs` | Admin endpoint smoke tests |
| `admin-platform-users-regression.mjs` | Platform user mutation regression tests |
| `api-endpoint-audit.mjs` | Catalog all API endpoints |
| `api-smoke-test.mjs` | Basic API health checks |
| `audit-constant-references.mjs` | Verify constants used correctly |
| `detect-temporal-dead-zone.mjs` | TDZ variable detection |
| `validate-platform-guardrails.mjs` | Platform safety rules validation |
| `record-deploy-env.mjs` | Capture env state pre/post deployment |
| `verify-environment-alignment.mjs` | Frontend/backend env sync |
| `verify-live-version.mjs` | Monitor live deployment health |
| `verify-cloudflare-deploy.mjs` | Validate Cloudflare deployment |
| `validate-realtime-chat.mjs` | Chat worker health check |
| `deploy-supabase-hardened.ps1` | Production Supabase deployment with secret updates |
| `rollback-supabase.ps1` | Supabase rollback |
| `reconcile-platform-users-tasksets.mjs` | User/taskset reconciliation (dry-run or apply) |
| `resolve-runtime-env.mjs` | Dynamically resolve project ref, anon key, function name |

### 9.4 Environment Variables

**Frontend (Vite `import.meta.env`):**
| Variable | Value |
|---|---|
| `VITE_CHAT_REALTIME_URL` | `https://chat-api.steadfastworkbench.org` |
| `VITE_CHAT_REALTIME_ENABLED` | `true` |
| `VITE_CHAT_REALTIME_TOKEN` | Realtime chat auth token |

**Backend (Supabase Secrets):**
| Variable | Purpose |
|---|---|
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed CORS origins |
| `DEPLOY_COMMIT_SHA` | Git commit SHA of deployed version |
| `DEPLOY_COMMIT_SHORT` | Short commit SHA |
| `DEPLOYED_AT_UTC` | Deployment timestamp (for staleness detection) |

**Runtime Constants (code):**
| Constant | Value | File |
|---|---|---|
| `FUNCTION_SERVICE_NAME` | `make-server-a1c55d7e` | `utils/environment/config.ts` |
| `FRONTEND_CONTRACT_VERSION` | `2026-03-31-contract-v1` | `utils/environment/config.ts` |
| `FRONTEND_APP_VERSION` | `frontend-2026-03-31-integrity-1` | `utils/environment/config.ts` |
| `REFERRAL_PARENT_RATE` | `0.2` | `supabase/functions/server/index.ts` ~L123 |
| `DEPLOYMENT_STALE_THRESHOLD_MINUTES` | `1440` (24h) | Server env |

---

## 10. Testing

**Framework:** Vitest with v8 coverage

**Test Tiers:**
| Tier | Script | Focus |
|---|---|---|
| Tier 1 | `test:tier1` | Session authorization integration tests |
| Tier 2 | `test:tier2` | API integration tests |
| Tier 2 (origin) | `test:tier2:origin` | Origin variant testing |
| Tier 2 (endpoints) | `test:tier2:endpoints` | Endpoint inventory |
| Tier 2 (withdrawals) | `test:tier2:withdrawals` | Withdrawal domain tests |
| Tier 2 (transactions) | `test:tier2:transactions` | Transaction domain tests |
| Tier 3 | `test:tier3` | Full test suite |
| Pre-deploy | `test:predeploy` | Comprehensive verification pipeline |

**Coverage:**
- Targets: `src/app/services/**`, `src/app/hooks/**`, `src/app/components/**`
- Default timeout: 20 seconds (integration tests: 60 seconds)
- Test files: `src/tests/**/*.test.{ts,tsx}`

---

## 11. UI/UX Policies

1. **No "Admin" in user-facing UI** — Use "Steadfast" or "Customer Service" instead
   - Server: `Steadfast Adjustment`, `Customer Service top-up`, `Customer Service deduction`
   - Withdrawals: `approved/rejected by Customer Service`
   - Password banner: no mention of admin
2. **Security Credentials Section** — Collapsible section in Profile page (below Bind Wallet)
   - Auto-opens when `mustChangePassword` is true
   - Fields: Current Login Password, New Login Password, New Transaction Password
3. **Mobile-First Navigation** — Bottom nav with 3 buttons: Home, Starting (elevated center), Records
4. **Code Splitting** — All routes lazy-loaded with retry on chunk load failure (max 2 retries, exponential backoff)
5. **Version Check** — 5-minute polling for deployment updates and service health

---

## 12. Key File Reference

| File | Description |
|---|---|
| `src/app/pages/Starting.tsx` | Main task/missions page with financial card (~L388–420) |
| `src/app/pages/Profile.tsx` | Profile with security credentials section |
| `src/app/pages/UserHome.tsx` | Main authenticated dashboard |
| `src/app/pages/Admin.tsx` | Admin control panel entry point |
| `src/app/appRouter.ts` | Route configuration with lazy loading |
| `src/app/components/BottomNavigation.tsx` | Mobile navigation |
| `src/app/services/serverAuth.ts` | Authentication service |
| `src/app/services/networkClient.ts` | HTTP client with retry/caching |
| `src/app/services/runtimeEnvironment.ts` | Environment configuration |
| `supabase/functions/server/index.ts` | All backend logic (~13,000+ lines) |
| `supabase/functions/server/kv_store.tsx` | KV store abstraction |
| `utils/environment/config.ts` | Constants (function name, contract version) |
| `realtime-chat-worker/src/index.ts` | Chat worker entry point |
| `realtime-chat-worker/wrangler.toml` | Chat worker configuration |
| `vite.config.ts` | Build configuration (code splitting, minification) |
| `vitest.config.ts` | Test configuration |
| `.github/workflows/ci-tests.yml` | CI/CD pipeline |
| `package.json` | Dependencies and scripts |

---

## Build & Code Splitting

**Vite Build Configuration:**
- Target: ES2020 (Chrome 80, Safari 13.1, Firefox 78)
- ESBuild minification + CSS minification
- Chunk size limit: 800KB
- Asset inline limit: 4096 bytes
- Drops `debugger` and `console.log` in production

**Code Split Chunks:**
| Chunk | Contents |
|---|---|
| `vendor-react` | React, React Router |
| `vendor-icons` | Lucide icons |
| `vendor-supabase` | Supabase client |
| `vendor-toast` | Sonner notifications |

---

*End of Platform Documentation*
