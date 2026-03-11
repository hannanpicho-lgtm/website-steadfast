# 📍 Feature Locations Guide - Admin Panel

## ✅ **Where to Find Existing Features**

---

## 1️⃣ **Customer Support (CS) Section** 

### **Location:** 
Navigate to: `/admin` → Click **"Customer Support"** in the left sidebar

### **Available Features:**

#### **Tab 1: Support Tickets** 📝
- View all support tickets from users
- Filter by status (Open, In Progress, Resolved, Closed)
- Search by subject or username
- Reply to tickets as admin
- Change ticket status
- View ticket history and responses

**Actions Available:**
- ✅ Mark In Progress
- ✅ Mark Resolved
- ✅ Close Ticket
- ✅ Send Reply as Admin

---

#### **Tab 2: Live Chats** 💬
- Real-time chat with users
- See all active conversations
- View unread message counts
- Respond to user messages instantly

---

#### **Tab 3: Support Links** 🔗 **✨ NEW!**
- **Manage WhatsApp contact link**
  - Edit phone number
  - Auto-generates `wa.me` link
  - Live preview
  
- **Manage Telegram contact link**
  - Edit username or group
  - Auto-generates `t.me` link
  - Live preview
  
- **Manage Support Email**
  - Edit email address
  - Auto-generates `mailto:` link
  - Live preview

**How to Use:**
1. Click **"Support Links"** tab
2. Click **"Edit Links"** button
3. Update WhatsApp, Telegram, or Email
4. See live preview at bottom
5. Click **"Save Changes"**

**File Location:** `/src/app/components/admin/CustomerSupport.tsx`

**Lines:** 
- Tab declaration: Line 47
- Links UI: Lines 500-650 (approximately)

---

## 2️⃣ **User Management Section**

### **Location:**
Navigate to: `/admin` → Click **"User Management"** in the left sidebar

### **Available Actions for Each User:**

#### **👁️ View Details** (Eye Icon)
- Shows full user information
- Account details
- Transaction history
- Activity logs

#### **✏️ Edit User** (Pencil Icon)
- Change username
- Update email
- Modify phone number
- **Change VIP level**
- **Adjust balance**
- **Enable/Disable account status**

#### **🔑 Reset Password** (Key Icon) **✨ NEW!**
- Sends password reset link to user's email
- Confirmation dialog before action
- Shows success message

**How it works:**
```javascript
// When clicked, it will:
1. Show confirmation: "Reset password for [username]?"
2. If confirmed: Send reset link to user email
3. Show alert: "Password reset link sent to user email"
```

#### **✅ Enable Account** (Check Icon) **✨ NEW!**
- Only visible for **Suspended** accounts
- Re-activates the user account
- Confirmation dialog before action

**How it works:**
```javascript
// Only shows when: user.status === 'Suspended'
1. Show confirmation: "Enable account for [username]?"
2. If confirmed: Activate account
3. Show alert: "Account enabled for [username]"
```

#### **🚫 Disable Account** (X Icon) **✨ NEW!**
- Only visible for **Active** or **Pending** accounts
- Suspends the user account
- Confirmation dialog before action

**How it works:**
```javascript
// Shows when: user.status !== 'Suspended'
1. Show confirmation: "Disable account for [username]?"
2. If confirmed: Suspend account
3. Show alert: "Account disabled for [username]"
```

#### **🗑️ Delete User** (Trash Icon)
- Permanently removes user from system
- Confirmation dialog before action

---

### **Button Visual Guide:**

```
User Table Row Actions:
┌─────────────────────────────────────────────────────────┐
│ 👁️  ✏️  🔑  ✅/🚫  🗑️                                  │
│                                                         │
│ View Edit Reset Enable/ Delete                         │
│           Pass  Disable                                 │
└─────────────────────────────────────────────────────────┘

Colors on Hover:
- 👁️ View: Cyan (#00D9FF)
- ✏️ Edit: Blue
- 🔑 Reset: Yellow
- ✅ Enable: Green
- 🚫 Disable: Orange
- 🗑️ Delete: Red
```

---

### **File Location:**
`/src/app/pages/Admin.tsx`

**Lines:**
- User Management section: Lines 2527-2667
- Action buttons: Lines 2620-2665

---

## 📊 **Quick Reference Table**

| Feature | Location | Tab/Section | New? |
|---------|----------|-------------|------|
| **Support Tickets** | Admin → Customer Support | Tab 1 | ❌ Existing |
| **Live Chats** | Admin → Customer Support | Tab 2 | ❌ Existing |
| **Support Links Manager** | Admin → Customer Support | Tab 3 | ✅ **NEW** |
| **View User** | Admin → User Management | Actions column | ❌ Existing |
| **Edit User** | Admin → User Management | Actions column | ❌ Existing |
| **Reset Password** | Admin → User Management | Actions column | ✅ **NEW** |
| **Enable Account** | Admin → User Management | Actions column | ✅ **NEW** |
| **Disable Account** | Admin → User Management | Actions column | ✅ **NEW** |
| **Delete User** | Admin → User Management | Actions column | ❌ Existing |

---

## 🎯 **Step-by-Step Usage Examples**

### **Example 1: Managing Support Links**

```
1. Login to admin panel at /admin
2. Click "Customer Support" in sidebar
3. Click "Support Links" tab (third tab)
4. Click "Edit Links" button (top right)
5. Update:
   - WhatsApp: Change to your number (e.g., 15551234567)
   - Telegram: Change to your username (e.g., yourcompany)
   - Email: Change to your email (e.g., support@yourcompany.com)
6. Check the live preview at bottom
7. Click green "Save Changes" button
8. Done! Users will now see updated links on /support page
```

---

### **Example 2: Resetting a User's Password**

```
1. Login to admin panel at /admin
2. Click "User Management" in sidebar
3. Find the user (search by username/email)
4. Look at the Actions column
5. Click the 🔑 (Key icon) - third button
6. Confirm the dialog: "Reset password for [username]?"
7. System sends reset link to user's email
8. User receives email with reset link
9. Done! User can now reset their password
```

---

### **Example 3: Disabling a User Account**

```
1. Login to admin panel at /admin
2. Click "User Management" in sidebar
3. Find the active user
4. Look at the Actions column
5. Click the 🚫 (X icon) - fourth button
6. Confirm the dialog: "Disable account for [username]?"
7. Account status changes to "Suspended"
8. User can no longer login
9. To re-enable: Click ✅ (Check icon) button
```

---

## 🔍 **Visual Map**

```
/admin
├── 📊 Dashboard
├── 💰 Financial Overview
├── 🎁 Rewards & Salary System
├── 📦 Product Management
├── 🔒 Premium Bundles
├── 💬 Customer Support ← **CS Section Here**
│   ├── 📝 Support Tickets (Tab 1)
│   ├── 💬 Live Chats (Tab 2)
│   └── 🔗 Support Links (Tab 3) ✨ **NEW**
│       ├── WhatsApp Link Editor
│       ├── Telegram Link Editor  
│       ├── Email Link Editor
│       └── Live Preview
├── 👥 Admin Users & Roles
├── 👤 User Management ← **User Actions Here**
│   └── User Table with Actions:
│       ├── 👁️ View Details
│       ├── ✏️ Edit User
│       ├── 🔑 Reset Password ✨ **NEW**
│       ├── ✅ Enable Account ✨ **NEW**
│       ├── 🚫 Disable Account ✨ **NEW**
│       └── 🗑️ Delete User
├── 💳 Transactions
├── 📋 Task Management
├── 🛡️ VIP Configuration
├── 💸 Withdrawal Requests
├── 📥 Deposit Records
├── 🔔 Notifications
└── ⚙️ Settings
```

---

## 🎨 **Color Coding**

### **Action Buttons (on hover):**
- 🔵 **Cyan** - View Details
- 🔵 **Blue** - Edit User
- 🟡 **Yellow** - Reset Password
- 🟢 **Green** - Enable Account
- 🟠 **Orange** - Disable Account
- 🔴 **Red** - Delete User

### **Status Colors:**
- 🟢 **Green** - Active account
- 🔴 **Red** - Suspended account
- 🟡 **Yellow** - Pending account

---

## 📱 **What Users See**

When you update the Support Links in Admin Panel:

### **User's Support Page (`/support`):**
```
┌──────────────────────────────────────────┐
│  Contact Support                         │
├──────────────────────────────────────────┤
│  ┌────────────┬────────────┬──────────┐  │
│  │ WhatsApp   │ Telegram   │  Email   │  │
│  │ Support    │ Support    │ Support  │  │
│  └────────────┴────────────┴──────────┘  │
│     ↑            ↑             ↑          │
│  These links are managed in Admin Panel  │
│  Customer Support → Support Links tab    │
└──────────────────────────────────────────┘
```

---

## 🚀 **API Endpoints** (Backend Integration)

### **Password Reset:**
```javascript
// Future implementation:
POST /auth/forgot-password
Body: { email: "user@example.com" }

POST /auth/reset-password
Body: { token: "reset_token", newPassword: "newpass" }
```

### **Account Status:**
```javascript
// Future implementation:
POST /users/enable-account
Body: { username: "user001" }

POST /users/disable-account
Body: { username: "user001" }
```

---

## ✨ **Summary**

### **✅ What's Already Working:**
1. ✅ Customer Support - Tickets & Chats
2. ✅ User Management - View, Edit, Delete
3. ✅ Premium Bundle System
4. ✅ Live Chat System
5. ✅ All 12 pages functional

### **✅ What We Just Added:**
1. ✅ **Support Links Manager** (CS Tab 3)
   - WhatsApp link editor
   - Telegram link editor
   - Email link editor
   - Live preview

2. ✅ **User Management Enhanced Actions**
   - 🔑 Reset Password button
   - ✅ Enable Account button
   - 🚫 Disable Account button

---

## 📝 **Notes**

1. **Password Reset:** Currently shows alert. In production, would integrate with email service (SendGrid, Mailgun, etc.)

2. **Account Enable/Disable:** Currently shows alert. In production, would make API call to update user status in database.

3. **Support Links:** Changes are currently in-memory. In production, would save to database via API.

4. **All features have confirmation dialogs** to prevent accidental actions.

---

## 🔗 **Related Documentation**

- `/SIMPLE_SETUP_GUIDE.md` - WhatsApp/Telegram setup guide for non-technical users
- `/QUICK_START_CARD.md` - Quick reference card
- `/CONTACT_SETUP_GUIDE.md` - Technical setup details
- `/TROUBLESHOOTING.md` - Error resolution guide

---

**Last Updated:** March 11, 2026  
**Platform:** Steadfast Digital  
**Version:** 2.0.0
