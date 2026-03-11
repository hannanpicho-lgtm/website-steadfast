# 🔧 TECHNICAL DEBUGGING GUIDE
## Steadfast Digital Platform - Complete Developer Reference

---

## 📋 TABLE OF CONTENTS

1. [Architecture Overview](#architecture-overview)
2. [API Endpoints Reference](#api-endpoints-reference)
3. [Database Schema (KV Store)](#database-schema-kv-store)
4. [Common Debugging Scenarios](#common-debugging-scenarios)
5. [Frontend Debugging](#frontend-debugging)
6. [Backend Debugging](#backend-debugging)
7. [Performance Optimization](#performance-optimization)
8. [Testing Procedures](#testing-procedures)
9. [Development Tools](#development-tools)

---

## 🏗️ ARCHITECTURE OVERVIEW

### Technology Stack

**Frontend:**
- React 18.3.1
- React Router 7.13.0
- Tailwind CSS v4
- TypeScript/TSX
- Vite 6.3.5 (build tool)

**Backend:**
- Supabase Edge Functions
- Hono Web Framework
- Deno runtime
- KV Store (key-value database)

**Infrastructure:**
- Supabase Project ID: `gvqwvuqeenkusdayosty`
- Base URL: `https://gvqwvuqeenkusdayosty.supabase.co`
- Functions URL: `/functions/v1/make-server-a1c55d7e`

### Data Flow

```
User Browser
    ↓
React Frontend (Vite)
    ↓
API Request (fetch)
    ↓
Supabase Edge Functions (Hono)
    ↓
KV Store (Database)
    ↓
Response JSON
    ↓
Frontend State Update
    ↓
UI Re-render
```

### Key Design Patterns

1. **Three-Tier Architecture:**
   - Presentation (React)
   - Application (Hono/Edge Functions)
   - Data (KV Store)

2. **RESTful API:**
   - GET: Retrieve data
   - POST: Create/update data
   - DELETE: Remove data

3. **Client-Side State Management:**
   - localStorage for user session
   - React state for UI
   - No Redux (kept simple)

4. **Real-Time Updates:**
   - Polling (3-second interval for chat)
   - Manual refresh for other data

---

## 🔌 API ENDPOINTS REFERENCE

### Base URL
```
https://gvqwvuqeenkusdayosty.supabase.co/functions/v1/make-server-a1c55d7e
```

### Authentication Header
```javascript
{
  'Authorization': `Bearer ${publicAnonKey}`,
  'Content-Type': 'application/json'
}
```

### 1. Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "ok"
}
```

**Use:** Verify backend is running

---

### 2. User Management

#### Get User Data
```http
GET /user/:username
```

**Response:**
```json
{
  "username": "testuser",
  "vipLevel": 1,
  "balance": 500.50,
  "todayCommission": 25.00,
  "holdAmount": 0,
  "luckyBonus": 0,
  "tasksCompleted": 10,
  "tasksLimit": 40,
  "lastReset": "2026-03-11",
  "isFrozen": false,
  "activePremium": null,
  "premiumQueue": []
}
```

**Auto-creates user if not exists**

---

#### Submit Task
```http
POST /submit-task
```

**Request Body:**
```json
{
  "username": "testuser",
  "productPrice": 299.99
}
```

**Response:**
```json
{
  "success": true,
  "commission": 1.50,
  "isPremium": false,
  "tasksCompleted": 11,
  "tasksLimit": 40,
  "balance": 502.00,
  "todayCommission": 26.50,
  "luckyBonus": 0
}
```

**Commission Calculation:**
- VIP 1: 0.5% = $299.99 × 0.005 = $1.50
- VIP 2: 1.0% = $299.99 × 0.01 = $3.00
- VIP 3: 1.5% = $299.99 × 0.015 = $4.50
- VIP 4: 2.0% = $299.99 × 0.02 = $6.00
- VIP 5: 2.5% = $299.99 × 0.025 = $7.50

---

#### Get Task Records
```http
GET /tasks/:username
```

**Response:**
```json
[
  {
    "username": "testuser",
    "productPrice": 299.99,
    "commission": 1.50,
    "isPremium": false,
    "timestamp": "2026-03-11T10:30:00.000Z",
    "tasksCompleted": 11
  },
  ...
]
```

**Sorted by timestamp descending**

---

### 3. Premium Bundles

#### Assign Premium Bundle (Admin)
```http
POST /admin/assign-premium-bundle
```

**Request Body:**
```json
{
  "username": "testuser",
  "premiumProductValue": 2000,
  "bundledProductCount": 3,
  "adminUsername": "admin"
}
```

**Response:**
```json
{
  "success": true,
  "premiumAssignment": {
    "id": "premium-1710154200000",
    "premiumProductValue": 2000,
    "bundledProducts": [
      {
        "id": 2,
        "name": "Smart Watch Pro",
        "price": 399.00
      },
      {
        "id": 1,
        "name": "Premium Wireless Headphones",
        "price": 299.99
      },
      {
        "id": 3,
        "name": "10-inch Tablet",
        "price": 549.99
      }
    ],
    "totalBundleValue": 3248.98,
    "balanceBeforeAssignment": 500.00,
    "balanceAfterAssignment": -2748.98,
    "negativeAmount": 2748.98,
    "topUpRequired": 2748.98,
    "tasksCompleted": 0,
    "totalTasks": 4,
    "status": "active"
  },
  "balanceAfter": -2748.98,
  "topUpRequired": 2748.98,
  "queuePosition": 1
}
```

**Logic:**
1. System selects 3 highest value products
2. Total bundle = Premium ($2000) + Bundled ($1248.98) = $3248.98
3. User balance: $500 - $3248.98 = -$2748.98 (frozen)
4. User must complete 4 tasks (1 premium + 3 bundled)
5. Each task earns commission (not product value)

---

#### Complete Premium Task
```http
POST /complete-premium-task
```

**Request Body:**
```json
{
  "username": "testuser",
  "productPrice": 2000
}
```

**Response:**
```json
{
  "success": true,
  "commission": 10.00,
  "tasksCompleted": 1,
  "totalTasks": 4,
  "balance": -2738.98,
  "holdAmount": 2738.98,
  "bundleCompleted": false,
  "nextInQueue": false
}
```

**After all 4 tasks:**
```json
{
  "success": true,
  "commission": 2.75,
  "tasksCompleted": 4,
  "totalTasks": 4,
  "balance": -2710.73,
  "holdAmount": 2710.73,
  "bundleCompleted": true,
  "nextInQueue": false
}
```

**Note:** User still has negative balance after completion because commissions (0.5%-2.5%) don't cover product values. They need to:
- Top up balance via deposit
- Continue regular tasks to earn more commissions
- Request withdrawal after balance is positive

---

#### Cancel Premium Assignment (Admin)
```http
DELETE /admin/cancel-premium/:username/:premiumId
```

**Response:**
```json
{
  "success": true,
  "message": "Premium assignment cancelled"
}
```

**Restores user's balance to pre-assignment state**

---

#### Get Premium Assignments
```http
GET /premium/:username
```

**Response:**
```json
[
  {
    "id": "premium-1710154200000",
    "premiumProductValue": 2000,
    "status": "completed",
    "assignedAt": "2026-03-11T10:00:00.000Z",
    "completedAt": "2026-03-11T12:30:00.000Z",
    ...
  }
]
```

---

### 4. Customer Support - Tickets

#### Create Support Ticket
```http
POST /cs/create-ticket
```

**Request Body:**
```json
{
  "username": "testuser",
  "subject": "Withdrawal not received",
  "message": "I requested withdrawal 2 days ago but haven't received it",
  "category": "withdrawal",
  "priority": "high"
}
```

**Categories:**
- `account` - Account issues
- `withdrawal` - Withdrawal problems
- `deposit` - Deposit questions
- `premium` - Premium bundle issues
- `technical` - Technical problems
- `other` - Other inquiries

**Priorities:**
- `low` - Can wait
- `medium` - Normal urgency
- `high` - Important
- `urgent` - Critical issue

**Response:**
```json
{
  "success": true,
  "ticket": {
    "id": "ticket_1710154200000_abc123",
    "username": "testuser",
    "subject": "Withdrawal not received",
    "message": "...",
    "category": "withdrawal",
    "priority": "high",
    "status": "open",
    "createdAt": "2026-03-11T10:00:00.000Z",
    "updatedAt": "2026-03-11T10:00:00.000Z",
    "responses": [],
    "assignedTo": null
  }
}
```

---

#### Get User Tickets
```http
GET /cs/tickets/:username
```

**Response:**
```json
[
  {
    "id": "ticket_1710154200000_abc123",
    "subject": "Withdrawal not received",
    "status": "in_progress",
    "priority": "high",
    "createdAt": "2026-03-11T10:00:00.000Z",
    "responses": [
      {
        "id": "response_1710154800000_def456",
        "message": "We're looking into this. Please allow 24-48 hours.",
        "respondedBy": "support_agent",
        "isAdmin": true,
        "createdAt": "2026-03-11T10:10:00.000Z"
      }
    ]
  }
]
```

---

#### Get All Tickets (Admin)
```http
GET /cs/admin/tickets
```

**Returns all tickets from all users**

---

#### Add Response to Ticket
```http
POST /cs/respond
```

**Request Body:**
```json
{
  "ticketId": "ticket_1710154200000_abc123",
  "message": "Your withdrawal has been processed",
  "respondedBy": "admin",
  "isAdmin": true
}
```

**Response:**
```json
{
  "success": true,
  "ticket": { /* updated ticket with new response */ }
}
```

---

#### Update Ticket Status
```http
POST /cs/update-status
```

**Request Body:**
```json
{
  "ticketId": "ticket_1710154200000_abc123",
  "status": "resolved",
  "assignedTo": "admin"
}
```

**Statuses:**
- `open` - New ticket
- `in_progress` - Being worked on
- `resolved` - Issue fixed
- `closed` - Ticket closed

---

### 5. Customer Support - Live Chat

#### Send Chat Message
```http
POST /cs/chat/send
```

**Request Body:**
```json
{
  "username": "testuser",
  "message": "Hello, I need help with my account",
  "isAdmin": false
}
```

**Response:**
```json
{
  "success": true,
  "message": {
    "id": "msg_1710154200000_abc123",
    "message": "Hello, I need help with my account",
    "sender": "testuser",
    "isAdmin": false,
    "timestamp": "2026-03-11T10:00:00.000Z",
    "read": false
  }
}
```

---

#### Get Chat Messages
```http
GET /cs/chat/:username
```

**Response:**
```json
[
  {
    "id": "msg_1710154200000_abc123",
    "message": "Hello, I need help with my account",
    "sender": "testuser",
    "isAdmin": false,
    "timestamp": "2026-03-11T10:00:00.000Z",
    "read": true
  },
  {
    "id": "msg_1710154300000_def456",
    "message": "Hi! How can I help you?",
    "sender": "support",
    "isAdmin": true,
    "timestamp": "2026-03-11T10:01:00.000Z",
    "read": false
  }
]
```

**Polling:** Frontend polls this endpoint every 3 seconds

---

#### Get All Active Chats (Admin)
```http
GET /cs/admin/chats
```

**Response:**
```json
[
  {
    "username": "testuser",
    "lastMessage": "Thank you for your help!",
    "lastMessageTime": "2026-03-11T10:05:00.000Z",
    "unreadCount": 2,
    "totalMessages": 15
  }
]
```

---

### 6. Password Reset

#### Request Password Reset
```http
POST /auth/forgot-password
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset instructions sent to email",
  "_devToken": "reset_1710154200000_abc123"
}
```

**Note:** `_devToken` is for development only. In production, send via email.

---

#### Verify Reset Token
```http
GET /auth/verify-reset-token/:token
```

**Response (Valid):**
```json
{
  "valid": true,
  "email": "user@example.com"
}
```

**Response (Invalid):**
```json
{
  "valid": false,
  "error": "Invalid or expired reset token"
}
```

---

#### Reset Password with Token
```http
POST /auth/reset-password
```

**Request Body:**
```json
{
  "token": "reset_1710154200000_abc123",
  "newPassword": "newSecurePassword123",
  "username": "testuser"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

---

#### Change Password (Authenticated)
```http
POST /auth/change-password
```

**Request Body:**
```json
{
  "username": "testuser",
  "currentPassword": "oldPassword",
  "newPassword": "newPassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## 💾 DATABASE SCHEMA (KV STORE)

### Key Naming Convention

```
user:{username}                    → User data
task:{username}:{timestamp}        → Task record
premium:{username}:{premiumId}     → Premium assignment
ticket:{ticketId}                  → Support ticket
user:{username}:tickets            → Array of ticket IDs
chat:{username}                    → Array of chat messages
password_reset:{token}             → Password reset token data
```

### User Object Schema

```typescript
interface User {
  username: string;
  email?: string;
  password?: string; // Should be hashed in production
  vipLevel: 1 | 2 | 3 | 4 | 5;
  balance: number; // Can be negative
  todayCommission: number;
  holdAmount: number; // Absolute value of negative balance
  luckyBonus: number;
  tasksCompleted: number;
  tasksLimit: number; // Default: 40
  lastReset: string; // YYYY-MM-DD format
  isFrozen: boolean;
  activePremium: PremiumAssignment | null;
  premiumQueue: PremiumAssignment[];
  isAdmin?: boolean;
  isDisabled?: boolean;
  passwordUpdatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}
```

### Task Record Schema

```typescript
interface TaskRecord {
  username: string;
  productPrice: number;
  commission: number;
  isPremium: boolean;
  premiumBundleId?: string;
  timestamp: string; // ISO 8601
  tasksCompleted: number;
}
```

### Premium Assignment Schema

```typescript
interface PremiumAssignment {
  id: string; // "premium-{timestamp}"
  premiumProductValue: number;
  premiumProductName: string;
  bundledProducts: Product[];
  totalBundleValue: number;
  balanceBeforeAssignment: number;
  balanceAfterAssignment: number;
  negativeAmount: number;
  topUpRequired: number;
  tasksCompleted: number;
  totalTasks: number; // 1 + bundledProducts.length
  assignedAt: string; // ISO 8601
  assignedBy: string;
  status: "active" | "completed" | "cancelled";
  commissionEarned: number;
  completedAt?: string;
  cancelledAt?: string;
}
```

### Product Schema

```typescript
interface Product {
  id: number;
  name: string;
  price: number;
  rating: number;
  image: string;
}
```

### Support Ticket Schema

```typescript
interface SupportTicket {
  id: string; // "ticket_{timestamp}_{random}"
  username: string;
  subject: string;
  message: string;
  category: "account" | "withdrawal" | "deposit" | "premium" | "technical" | "other";
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "resolved" | "closed";
  createdAt: string; // ISO 8601
  updatedAt: string;
  responses: TicketResponse[];
  assignedTo: string | null;
}

interface TicketResponse {
  id: string; // "response_{timestamp}_{random}"
  message: string;
  respondedBy: string;
  isAdmin: boolean;
  createdAt: string;
}
```

### Chat Message Schema

```typescript
interface ChatMessage {
  id: string; // "msg_{timestamp}_{random}"
  message: string;
  sender: string; // username or "support"
  isAdmin: boolean;
  timestamp: string; // ISO 8601
  read: boolean;
}
```

### Password Reset Schema

```typescript
interface PasswordReset {
  email: string;
  token: string; // "reset_{timestamp}_{random}"
  expiresAt: string; // ISO 8601 (1 hour from creation)
  used: boolean;
  usedAt?: string;
}
```

---

## 🐛 COMMON DEBUGGING SCENARIOS

### Scenario 1: User Balance Not Updating

**Symptom:** User submits task but balance stays the same

**Debug Steps:**

1. **Check browser console:**
   ```javascript
   // Look for fetch errors
   console.log("Task submission response:", response);
   ```

2. **Verify API call:**
   ```bash
   curl -X POST https://gvqwvuqeenkusdayosty.supabase.co/functions/v1/make-server-a1c55d7e/submit-task \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer ${ANON_KEY}" \
     -d '{"username":"testuser","productPrice":299.99}'
   ```

3. **Check server logs:**
   - Go to Supabase Dashboard → Edge Functions → Logs
   - Look for errors in `/submit-task` endpoint

4. **Verify user data:**
   ```bash
   curl https://gvqwvuqeenkusdayosty.supabase.co/functions/v1/make-server-a1c55d7e/user/testuser \
     -H "Authorization: Bearer ${ANON_KEY}"
   ```

5. **Common causes:**
   - Daily task limit reached
   - Account is frozen
   - Network error
   - Backend server down

**Fix:**
- If task limit reached: Wait until next day (auto-resets)
- If frozen: Check for active premium bundle
- If network error: Retry request
- If server down: Check Supabase status

---

### Scenario 2: Premium Bundle Not Freezing Account

**Symptom:** Admin assigns premium but user can still do regular tasks

**Debug Steps:**

1. **Check premium assignment response:**
   ```javascript
   console.log("Premium assignment:", premiumData);
   // Should see: isFrozen: true
   ```

2. **Verify user data:**
   ```bash
   curl https://gvqwvuqeenkusdayosty.supabase.co/functions/v1/make-server-a1c55d7e/user/testuser \
     -H "Authorization: Bearer ${ANON_KEY}"
   ```
   
   Look for:
   ```json
   {
     "isFrozen": true,
     "activePremium": { /* premium data */ }
   }
   ```

3. **Check frontend logic:**
   - File: `/src/app/pages/Starting.tsx`
   - Look for freeze banner: `{userData?.isFrozen && ...}`
   - Verify task submission is blocked

4. **Common causes:**
   - Premium assignment API call failed
   - Frontend not refreshing user data
   - User data not updated in KV store

**Fix:**
- Refresh page to reload user data
- Re-assign premium bundle
- Check server logs for errors
- Manually update user in KV store if needed

---

### Scenario 3: Live Chat Messages Not Appearing

**Symptom:** User sends message but admin doesn't see it (or vice versa)

**Debug Steps:**

1. **Check polling:**
   ```javascript
   // File: /src/app/components/LiveChatBox.tsx
   // Verify polling interval
   useEffect(() => {
     const interval = setInterval(fetchMessages, 3000);
     return () => clearInterval(interval);
   }, []);
   ```

2. **Verify chat endpoint:**
   ```bash
   # Send message
   curl -X POST https://gvqwvuqeenkusdayosty.supabase.co/functions/v1/make-server-a1c55d7e/cs/chat/send \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer ${ANON_KEY}" \
     -d '{"username":"testuser","message":"Test","isAdmin":false}'
   
   # Get messages
   curl https://gvqwvuqeenkusdayosty.supabase.co/functions/v1/make-server-a1c55d7e/cs/chat/testuser \
     -H "Authorization: Bearer ${ANON_KEY}"
   ```

3. **Check chat data in KV store:**
   - Key: `chat:testuser`
   - Should be array of messages

4. **Common causes:**
   - Polling not working
   - Wrong username
   - Message not saved to KV store
   - CORS error

**Fix:**
- Manually refresh chat
- Check browser console for errors
- Verify username is correct
- Clear browser cache

---

### Scenario 4: Withdrawal Request Not Processing

**Symptom:** User requests withdrawal but it doesn't show in admin panel

**Debug Steps:**

1. **Check withdrawal submission:**
   ```javascript
   // Check if withdrawal was actually submitted
   console.log("Withdrawal request:", withdrawalData);
   ```

2. **Verify withdrawal storage:**
   - Withdrawals should be stored with key: `withdrawal:{username}:{timestamp}`
   - Check KV store for this data

3. **Check admin panel:**
   - File: `/src/app/pages/Admin.tsx`
   - Verify admin is fetching all withdrawals

4. **Common causes:**
   - Insufficient balance
   - Account frozen
   - Withdrawal not saved to KV store
   - Admin panel not refreshing

**Fix:**
- Implement withdrawal endpoints in backend (currently not implemented)
- Add withdrawal management to admin panel
- Create withdrawal activity log

**Note:** Withdrawal functionality needs to be fully implemented. Current system only tracks balance changes.

---

### Scenario 5: Password Reset Not Working

**Symptom:** User requests password reset but doesn't receive email

**Debug Steps:**

1. **Check server logs:**
   ```bash
   # Look for reset token in logs
   # Current implementation logs to console
   ```

2. **Verify token generation:**
   ```bash
   curl -X POST https://gvqwvuqeenkusdayosty.supabase.co/functions/v1/make-server-a1c55d7e/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email":"user@example.com"}'
   ```
   
   Response should include `_devToken` for testing

3. **Test reset flow manually:**
   ```bash
   # 1. Get token from response
   TOKEN="reset_1710154200000_abc123"
   
   # 2. Verify token
   curl https://gvqwvuqeenkusdayosty.supabase.co/functions/v1/make-server-a1c55d7e/auth/verify-reset-token/$TOKEN
   
   # 3. Reset password
   curl -X POST https://gvqwvuqeenkusdayosty.supabase.co/functions/v1/make-server-a1c55d7e/auth/reset-password \
     -H "Content-Type: application/json" \
     -d '{"token":"'$TOKEN'","newPassword":"newpass123","username":"testuser"}'
   ```

4. **Common causes:**
   - Email service not configured (emails go to logs instead)
   - Token expired (1 hour limit)
   - Token already used
   - Wrong username/email combination

**Fix:**
- For production: Configure email service (SendGrid, AWS SES, etc.)
- For testing: Use `_devToken` from API response
- Check token expiry time
- Generate new reset token if expired

---

## 🖥️ FRONTEND DEBUGGING

### React DevTools

Install React DevTools browser extension:
- Chrome: https://chrome.google.com/webstore/detail/react-developer-tools
- Firefox: https://addons.mozilla.org/en-US/firefox/addon/react-devtools/

**Usage:**
1. Open browser DevTools (F12)
2. Click "Components" tab
3. Inspect component state & props
4. Track re-renders

### Common Frontend Issues

#### Issue: "Cannot read property of undefined"

**Cause:** Accessing nested property before data loads

**Bad:**
```tsx
<div>{userData.balance}</div>
```

**Good:**
```tsx
<div>{userData?.balance ?? 0}</div>
```

---

#### Issue: State not updating

**Cause:** Mutating state directly

**Bad:**
```tsx
userData.balance += 100; // Mutates state
setUserData(userData);
```

**Good:**
```tsx
setUserData({
  ...userData,
  balance: userData.balance + 100
});
```

---

#### Issue: Infinite re-render loop

**Cause:** useEffect with missing dependencies

**Bad:**
```tsx
useEffect(() => {
  fetchData();
}, []); // Missing dependency
```

**Good:**
```tsx
useEffect(() => {
  fetchData();
}, [userId]); // Include dependencies
```

---

### Debugging localStorage

```javascript
// View stored data
console.log("Current user:", localStorage.getItem('currentUser'));

// Clear storage (logout)
localStorage.removeItem('currentUser');

// View all storage
console.log(localStorage);
```

---

## 🔧 BACKEND DEBUGGING

### Access Server Logs

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select project: `gvqwvuqeenkusdayosty`
3. Navigate to: Edge Functions → Logs
4. Filter by function: `make-server-a1c55d7e`

### Enable Detailed Logging

Add to backend endpoints:

```typescript
app.post("/endpoint", async (c) => {
  console.log("Request received:", await c.req.json());
  
  try {
    const result = await doSomething();
    console.log("Success:", result);
    return c.json({ success: true, result });
  } catch (error) {
    console.error("Error in /endpoint:", error);
    return c.json({ error: error.message }, 500);
  }
});
```

### Test Backend Directly

Use `curl` or Postman:

```bash
# Test health endpoint
curl https://gvqwvuqeenkusdayosty.supabase.co/functions/v1/make-server-a1c55d7e/health

# Test with authentication
curl -H "Authorization: Bearer ${ANON_KEY}" \
     https://gvqwvuqeenkusdayosty.supabase.co/functions/v1/make-server-a1c55d7e/user/testuser

# Test POST request
curl -X POST \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer ${ANON_KEY}" \
     -d '{"username":"testuser","productPrice":299.99}' \
     https://gvqwvuqeenkusdayosty.supabase.co/functions/v1/make-server-a1c55d7e/submit-task
```

### KV Store Direct Access

```typescript
// In backend code
import * as kv from "./kv_store.tsx";

// Get data
const user = await kv.get("user:testuser");
console.log("User data:", user);

// Set data
await kv.set("user:testuser", { ...user, balance: 1000 });

// Delete data
await kv.del("user:testuser");

// Get multiple
const users = await kv.mget(["user:alice", "user:bob"]);

// Get by prefix
const allTasks = await kv.getByPrefix("task:testuser:");
```

---

## ⚡ PERFORMANCE OPTIMIZATION

### Frontend Optimization

1. **Code Splitting:**
   ```tsx
   // Lazy load pages
   const Admin = lazy(() => import('./pages/Admin'));
   
   <Suspense fallback={<div>Loading...</div>}>
     <Admin />
   </Suspense>
   ```

2. **Memoization:**
   ```tsx
   // Expensive calculation
   const sortedTasks = useMemo(() => {
     return tasks.sort((a, b) => b.timestamp - a.timestamp);
   }, [tasks]);
   
   // Prevent re-render
   const MemoizedComponent = memo(({ data }) => {
     return <div>{data}</div>;
   });
   ```

3. **Debouncing:**
   ```tsx
   // Search input
   const debouncedSearch = useMemo(
     () => debounce((value) => {
       performSearch(value);
     }, 500),
     []
   );
   ```

4. **Image Optimization:**
   ```tsx
   // Use responsive images
   <img 
     src="image.jpg"
     loading="lazy"
     width="400"
     height="300"
   />
   ```

### Backend Optimization

1. **Caching:**
   ```typescript
   // Cache frequently accessed data
   const cache = new Map();
   
   app.get("/user/:username", async (c) => {
     const cached = cache.get(username);
     if (cached && Date.now() - cached.timestamp < 60000) {
       return c.json(cached.data);
     }
     
     const data = await kv.get(`user:${username}`);
     cache.set(username, { data, timestamp: Date.now() });
     return c.json(data);
   });
   ```

2. **Batch Operations:**
   ```typescript
   // Instead of multiple get() calls
   const users = await kv.mget([
     "user:alice",
     "user:bob",
     "user:charlie"
   ]);
   ```

3. **Reduce Payload Size:**
   ```typescript
   // Only send necessary data
   return c.json({
     username: user.username,
     balance: user.balance,
     // Don't send password, internal fields, etc.
   });
   ```

### Database Optimization

1. **Limit Results:**
   ```typescript
   // Don't fetch all tasks
   const recentTasks = allTasks.slice(0, 50);
   ```

2. **Pagination:**
   ```typescript
   app.get("/tasks/:username", async (c) => {
     const page = parseInt(c.req.query('page') || '1');
     const limit = 20;
     const offset = (page - 1) * limit;
     
     const allTasks = await kv.getByPrefix(`task:${username}:`);
     const paginatedTasks = allTasks.slice(offset, offset + limit);
     
     return c.json({
       tasks: paginatedTasks,
       page,
       totalPages: Math.ceil(allTasks.length / limit)
     });
   });
   ```

---

## 🧪 TESTING PROCEDURES

### Manual Testing Checklist

**User Flow:**
- [ ] Sign up new account
- [ ] Login existing account
- [ ] Submit regular task
- [ ] View task history
- [ ] Check balance update
- [ ] Request withdrawal
- [ ] Submit support ticket
- [ ] Send live chat message
- [ ] View VIP levels
- [ ] Update profile
- [ ] Change password
- [ ] Logout

**Admin Flow:**
- [ ] Login as admin
- [ ] View all users
- [ ] Assign premium bundle
- [ ] View premium assignments
- [ ] Cancel premium assignment
- [ ] View support tickets
- [ ] Respond to ticket
- [ ] View live chats
- [ ] Respond in chat
- [ ] Manage support links
- [ ] Reset user password
- [ ] Disable/enable account

**Edge Cases:**
- [ ] Submit task at daily limit
- [ ] Complete premium bundle
- [ ] Request withdrawal with negative balance
- [ ] Try to login with wrong password
- [ ] Try to access admin without permissions
- [ ] Submit task while account frozen
- [ ] Request password reset with invalid email
- [ ] Use expired reset token

### Automated Testing (Optional)

**Install testing libraries:**
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest
```

**Example test:**
```tsx
import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import Home from './pages/Home';

test('renders home page', () => {
  render(<Home />);
  expect(screen.getByText('Steadfast Digital')).toBeInTheDocument();
});
```

**Run tests:**
```bash
npm run test
```

---

## 🛠️ DEVELOPMENT TOOLS

### Recommended VS Code Extensions

1. **ES7+ React/Redux/React-Native snippets**
   - Quick component generation
   - `rafce` → React arrow function component export

2. **Tailwind CSS IntelliSense**
   - Auto-complete Tailwind classes
   - CSS preview on hover

3. **ESLint**
   - Code quality
   - Error detection

4. **Prettier**
   - Code formatting
   - Consistent style

5. **Error Lens**
   - Inline error messages
   - Better debugging

### Browser DevTools Tips

**Network Tab:**
- Filter by "Fetch/XHR" to see API calls
- Check request/response payloads
- Monitor response times
- Look for failed requests

**Console:**
- Filter by log level (Info, Warning, Error)
- Use `console.table()` for arrays
- Use `console.group()` for organized logs

**Application Tab:**
- View localStorage
- Inspect cookies
- Check cache

**Performance Tab:**
- Record page load
- Identify bottlenecks
- Check render times

---

## 🚨 ERROR CODES REFERENCE

### HTTP Status Codes Used

- `200` - Success
- `400` - Bad Request (missing fields, invalid data)
- `401` - Unauthorized (wrong password, no permissions)
- `404` - Not Found (user, ticket, premium assignment)
- `500` - Internal Server Error (backend issue)

### Custom Error Messages

```typescript
// User errors
"User not found"
"Daily task limit reached"
"Insufficient balance"
"Account is frozen"
"Account is disabled"

// Premium errors
"No active premium assignment"
"Premium assignment not found"
"Invalid bundled product count"

// Auth errors
"Invalid credentials"
"Current password is incorrect"
"Invalid or expired reset token"
"This reset link has already been used"

// Support errors
"Ticket not found"
"Missing required fields"

// General errors
"Failed to fetch user data"
"Failed to submit task"
"Failed to process request"
```

---

## 📝 QUICK REFERENCE

### Environment Variables

```env
SUPABASE_URL=https://gvqwvuqeenkusdayosty.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Key Files

```
/src/app/App.tsx                    - Main app component
/src/app/routes.ts                  - Route configuration
/src/app/pages/Home.tsx             - Home page
/src/app/pages/Starting.tsx         - Task submission page
/src/app/pages/Admin.tsx            - Admin panel
/src/app/pages/Support.tsx          - Customer support
/supabase/functions/server/index.tsx - Backend API
/utils/supabase/info.tsx            - Supabase config
```

### Useful Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Test backend health
curl https://gvqwvuqeenkusdayosty.supabase.co/functions/v1/make-server-a1c55d7e/health
```

---

**Document Version:** 1.0  
**Last Updated:** March 11, 2026  
**Platform:** Steadfast Digital v1.0.0-beta  
**Prepared By:** Development Team

---

**Need Help?**
- Check existing documentation files
- Review code comments
- Test in development environment first
- Use browser DevTools
- Check Supabase logs
- Ask in developer communities

**Happy Debugging! 🔧**
