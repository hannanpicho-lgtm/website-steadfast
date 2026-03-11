# 🎯 Admin Panel Quick Reference

## 🔍 Finding Features - Visual Guide

---

## 📍 **Customer Support Links Management**

### **Where:** `/admin` → **"Customer Support"** → **"Support Links"** tab

```
┌─────────────────────────────────────────────────────┐
│ Customer Support Management                         │
├─────────────────────────────────────────────────────┤
│ [Support Tickets] [Live Chats] [Support Links] ←── │
│                                        Click here!  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ 💚 WhatsApp Support                           │ │
│  │ Phone: [1234567890]                           │ │
│  │ Link: https://wa.me/1234567890                │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ 💙 Telegram Support                           │ │
│  │ Username: [steadfastdigital]                  │ │
│  │ Link: https://t.me/steadfastdigital           │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ 💜 Email Support                              │ │
│  │ Email: [support@steadfastdigital.com]        │ │
│  │ Link: mailto:support@...                      │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  [Edit Links]  [Save Changes]  [Cancel]            │
│                                                     │
│  Live Preview:                                      │
│  ┌──────────┬──────────┬──────────┐                │
│  │WhatsApp  │ Telegram │  Email   │                │
│  │ Support  │ Support  │ Support  │                │
│  └──────────┴──────────┴──────────┘                │
└─────────────────────────────────────────────────────┘
```

---

## 📍 **User Management Actions**

### **Where:** `/admin` → **"User Management"**

```
┌──────────────────────────────────────────────────────────────────┐
│ User Management                                                  │
├──────────────────────────────────────────────────────────────────┤
│ Search: [________________] [Status Filter ▼] [Export]           │
├──────────────────────────────────────────────────────────────────┤
│ ID │ User    │ Contact │ VIP │ Balance │ Status │ Actions       │
├────┼─────────┼─────────┼─────┼─────────┼────────┼───────────────┤
│ 1  │ user001 │ email   │ VIP1│ $1,250  │ Active │ [👁️][✏️][🔑]  │
│    │         │ phone   │     │         │  ✅    │ [🚫][🗑️]     │
├────┼─────────┼─────────┼─────┼─────────┼────────┼───────────────┤
│ 2  │ user002 │ email   │ VIP2│ $3,500  │Suspend │ [👁️][✏️][🔑]  │
│    │         │ phone   │     │         │  ⛔    │ [✅][🗑️]     │
└────┴─────────┴─────────┴─────┴─────────┴────────┴───────────────┘

Action Buttons Explained:
┌──────────────────────────────────────────────────────────────┐
│ 👁️  = View Details (Cyan hover)                              │
│ ✏️  = Edit User (Blue hover)                                 │
│ 🔑  = Reset Password (Yellow hover) ← NEW!                   │
│ ✅  = Enable Account (Green hover) ← NEW! [Suspended only]   │
│ 🚫  = Disable Account (Orange hover) ← NEW! [Active only]    │
│ 🗑️  = Delete User (Red hover)                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎬 **Action Workflows**

### **1. Add/Edit Support Links**

```
Step 1: Navigate
/admin → Customer Support → Support Links tab

Step 2: Edit
Click "Edit Links" button (top right)

Step 3: Update Fields
├─ WhatsApp: Enter number (15551234567)
├─ Telegram: Enter username (yourcompany)
└─ Email: Enter email (support@company.com)

Step 4: Preview
Scroll down to see live preview buttons

Step 5: Save
Click green "Save Changes" button

✅ Done! Links updated on /support page
```

---

### **2. Reset User Password**

```
Step 1: Navigate
/admin → User Management

Step 2: Find User
Use search or scroll to find user

Step 3: Reset
Click 🔑 (Key icon) in Actions column

Step 4: Confirm
Dialog: "Reset password for [username]?"
Click OK

Step 5: Complete
Alert: "Password reset link sent to user email"

✅ Done! User receives reset email
```

---

### **3. Disable User Account**

```
Step 1: Navigate
/admin → User Management

Step 2: Find Active User
Look for user with "Active" status

Step 3: Disable
Click 🚫 (X icon) in Actions column
(Only visible for Active users)

Step 4: Confirm
Dialog: "Disable account for [username]?"
Click OK

Step 5: Complete
Alert: "Account disabled for [username]"
Status changes to "Suspended"

✅ Done! User cannot login
```

---

### **4. Enable User Account**

```
Step 1: Navigate
/admin → User Management

Step 2: Find Suspended User
Look for user with "Suspended" status

Step 3: Enable
Click ✅ (Check icon) in Actions column
(Only visible for Suspended users)

Step 4: Confirm
Dialog: "Enable account for [username]?"
Click OK

Step 5: Complete
Alert: "Account enabled for [username]"
Status changes to "Active"

✅ Done! User can login again
```

---

## 📊 **Admin Panel Navigation Map**

```
🏠 /admin
│
├─ 📊 Dashboard
├─ 💰 Financial Overview
├─ 🎁 Rewards & Salary System
├─ 📦 Product Management
├─ 🔒 Premium Bundles
│
├─ 💬 Customer Support ★ **LINKS HERE**
│  ├─ 📝 Support Tickets
│  ├─ 💬 Live Chats
│  └─ 🔗 Support Links ← Add/Edit Contact Links
│     ├─ WhatsApp
│     ├─ Telegram
│     └─ Email
│
├─ 👤 User Management ★ **ACTIONS HERE**
│  └─ For each user:
│     ├─ 👁️ View
│     ├─ ✏️ Edit
│     ├─ 🔑 Reset Password
│     ├─ ✅/🚫 Enable/Disable
│     └─ 🗑️ Delete
│
├─ 💳 Transactions
├─ 📋 Task Management
├─ 🛡️ VIP Configuration
├─ 💸 Withdrawal Requests
├─ 📥 Deposit Records
├─ 🔔 Notifications
└─ ⚙️ Settings
```

---

## 🎨 **Icon & Color Legend**

### **Customer Support - Support Links Tab**

| Icon | Color | Purpose |
|------|-------|---------|
| 💚 | Green | WhatsApp configuration |
| 💙 | Blue | Telegram configuration |
| 💜 | Purple | Email configuration |
| 👁️ | Gray | Live preview section |

---

### **User Management - Action Buttons**

| Icon | Hover Color | Action | Available When |
|------|-------------|--------|----------------|
| 👁️ | Cyan | View user details | Always |
| ✏️ | Blue | Edit user info | Always |
| 🔑 | Yellow | Reset password | Always |
| ✅ | Green | Enable account | Status = Suspended |
| 🚫 | Orange | Disable account | Status = Active/Pending |
| 🗑️ | Red | Delete user | Always |

---

## ⚡ **Quick Tips**

### **✅ Best Practices**

1. **Test Links Before Saving**
   - Use the Live Preview section
   - Click each button to test
   - Verify they open correctly

2. **Confirm Before Actions**
   - Always read confirmation dialogs
   - Double-check username
   - Actions may be irreversible

3. **Search Before Manual Scroll**
   - Use search box for faster results
   - Can search by username, email, or phone

4. **Use Filters**
   - Filter by user status (Active/Suspended/Pending)
   - Narrow down results quickly

---

### **❌ Common Mistakes**

1. ❌ WhatsApp number with spaces/symbols
   ✅ Use: `15551234567`
   ❌ Don't use: `+1 (555) 123-4567`

2. ❌ Telegram with @ symbol
   ✅ Use: `yourcompany`
   ❌ Don't use: `@yourcompany`

3. ❌ Clicking wrong button
   ✅ Hover to see tooltip
   ❌ Don't rush - check icon first

4. ❌ Not saving changes
   ✅ Click "Save Changes" button
   ❌ Don't just edit and leave

---

## 🔐 **Security Notes**

### **Password Reset:**
- Sends link to user's email
- Link expires after 1 hour
- Can only be used once
- User must verify email access

### **Account Disable:**
- User immediately logged out
- Cannot login until re-enabled
- Data preserved (not deleted)
- Reversible action

### **Account Delete:**
- ⚠️ **Permanent action**
- Cannot be undone
- All user data removed
- Use disable for temporary suspension

---

## 📱 **What Users See**

### **Support Page After Link Update:**

```
User visits /support:

┌────────────────────────────────────────┐
│  Get Help                              │
├────────────────────────────────────────┤
│                                        │
│  📝 New Ticket                         │
│  💬 Live Chat                          │
│  📧 Email Support                      │
│  💚 WhatsApp Support  ← Your link here │
│  💙 Telegram Support  ← Your link here │
│                                        │
└────────────────────────────────────────┘
```

---

## 📞 **Support Contact Links Format**

### **WhatsApp:**
```
Input: 15551234567
Output: https://wa.me/15551234567
Opens: WhatsApp chat with your number
```

### **Telegram:**
```
Input: yourcompany
Output: https://t.me/yourcompany
Opens: Telegram chat/channel

OR

Input: https://t.me/joinchat/ABC123
Output: https://t.me/joinchat/ABC123
Opens: Telegram group invite
```

### **Email:**
```
Input: support@company.com
Output: mailto:support@company.com
Opens: User's default email client
```

---

## 🎯 **Action Success Messages**

```
✅ "Changes saved successfully!"
   → Support links updated

✅ "Password reset link sent to user email"
   → User can reset password

✅ "Account enabled for [username]"
   → User can login again

✅ "Account disabled for [username]"
   → User suspended

❌ "Failed to update..."
   → Check console for errors
```

---

## 📊 **At-a-Glance**

| Feature | Location | File | Lines |
|---------|----------|------|-------|
| **Support Links** | CS → Tab 3 | `CustomerSupport.tsx` | 500-650 |
| **User Actions** | User Mgmt | `Admin.tsx` | 2620-2665 |
| **Reset Password** | Actions column | `Admin.tsx` | 2635-2642 |
| **Enable/Disable** | Actions column | `Admin.tsx` | 2643-2660 |

---

**🚀 Ready to use! Everything is already implemented and working.**

**Need help?** See `/FEATURE_LOCATIONS_GUIDE.md` for detailed documentation.
