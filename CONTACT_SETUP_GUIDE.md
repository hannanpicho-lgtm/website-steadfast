# 📞 Contact Methods Setup Guide

## WhatsApp & Telegram Integration + Password Reset

This guide explains how to configure WhatsApp and Telegram contact links, and how the password reset system works.

---

## 📱 WhatsApp Integration

### **Current Configuration**

The WhatsApp support button is located on the `/support` page with the following default configuration:

```tsx
<a
  href="https://wa.me/1234567890"
  target="_blank"
  rel="noopener noreferrer"
  className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 rounded-lg..."
>
  <MessageCircleMore size={24} />
  <span className="font-semibold">WhatsApp Support</span>
</a>
```

### **How to Update Your WhatsApp Number**

1. **Open file**: `/src/app/pages/Support.tsx`

2. **Find this line** (around line 259):
   ```tsx
   href="https://wa.me/1234567890"
   ```

3. **Replace with your number**:
   ```tsx
   href="https://wa.me/15551234567"
   ```

### **WhatsApp Link Format**

```
https://wa.me/{PHONE_NUMBER}
```

**Rules:**
- Use international format (no + sign)
- No spaces, dashes, or brackets
- Include country code

**Examples:**
- US: `https://wa.me/15551234567`
- UK: `https://wa.me/447911123456`
- India: `https://wa.me/919876543210`

### **Pre-filled Message (Optional)**

To include a default message when users click the link:

```tsx
href="https://wa.me/15551234567?text=Hi%20Steadfast%20Digital,%20I%20need%20help%20with..."
```

---

## 💬 Telegram Integration

### **Current Configuration**

The Telegram support button is on the `/support` page:

```tsx
<a
  href="https://t.me/steadfastdigital"
  target="_blank"
  rel="noopener noreferrer"
  className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg..."
>
  <Send size={24} />
  <span className="font-semibold">Telegram Support</span>
</a>
```

### **How to Update Your Telegram Link**

1. **Open file**: `/src/app/pages/Support.tsx`

2. **Find this line** (around line 272):
   ```tsx
   href="https://t.me/steadfastdigital"
   ```

3. **Replace with ONE of the following**:

#### **Option A: Telegram Username (Personal or Channel)**
```tsx
href="https://t.me/YourUsername"
```

#### **Option B: Telegram Group**
```tsx
href="https://t.me/joinchat/XXXXXXXXXXXXXXXXXXXXX"
```
(Get this link from your Telegram group settings)

#### **Option C: Telegram Bot**
```tsx
href="https://t.me/YourBotName?start=support"
```

### **Examples:**
```tsx
// Personal/Channel:
href="https://t.me/supportteam"

// Group invite:
href="https://t.me/joinchat/AbC123XyZ456"

// Bot with parameter:
href="https://t.me/steadfast_support_bot?start=help"
```

---

## 🔑 Password Reset System

### **How It Works**

The password reset system has been fully implemented with 4 backend endpoints:

#### **1. Request Password Reset**
```
POST /auth/forgot-password
Body: { email: "user@example.com" }
```

**What happens:**
- System generates unique reset token
- Token valid for 1 hour
- Stores token in database
- Returns token (in development, will email in production)

#### **2. Verify Reset Token**
```
GET /auth/verify-reset-token/:token
```

**Returns:**
- `valid: true/false`
- Associated email address
- Error message if invalid/expired

#### **3. Reset Password**
```
POST /auth/reset-password
Body: {
  token: "reset_abc123...",
  username: "ugreen",
  newPassword: "newpass123"
}
```

**What happens:**
- Verifies token is valid and not expired
- Updates user password
- Marks token as used (can't be reused)

#### **4. Change Password (Authenticated)**
```
POST /auth/change-password
Body: {
  username: "ugreen",
  currentPassword: "oldpass",
  newPassword: "newpass123"
}
```

---

## 🧪 Testing Password Reset

### **Test Flow (Development)**

1. **Go to** `/forgot-password`

2. **Enter email**: `test@example.com`

3. **Submit form**

4. **Check browser console** - You'll see:
   ```
   Password reset requested for: test@example.com
   Reset token: reset_1234567890_abc123
   Reset link: /reset-password?token=reset_1234567890_abc123
   ```

5. **Copy the token** from console

6. **Test verification**:
   ```bash
   curl https://{projectId}.supabase.co/functions/v1/make-server-a1c55d7e/auth/verify-reset-token/reset_1234567890_abc123 \
     -H "Authorization: Bearer {publicAnonKey}"
   ```

7. **Reset password**:
   ```bash
   curl -X POST https://{projectId}.supabase.co/functions/v1/make-server-a1c55d7e/auth/reset-password \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer {publicAnonKey}" \
     -d '{
       "token": "reset_1234567890_abc123",
       "username": "ugreen",
       "newPassword": "NewPassword123!"
     }'
   ```

### **Token Expiration**

- Reset tokens expire after **1 hour**
- After use, tokens are marked as used and cannot be reused
- Attempting to use expired/used tokens returns an error

---

## 🚀 Production Setup Recommendations

### **For WhatsApp:**

1. **Create Business Account**: Get WhatsApp Business API
2. **Set up Auto-Responder**: Welcome message for new chats
3. **Assign Team Members**: Distribute support requests
4. **Track Metrics**: Monitor response times

### **For Telegram:**

1. **Create Support Bot**: Use BotFather (@BotFather)
2. **Set Welcome Message**: `/setcommands` in BotFather
3. **Create Support Group**: Invite team members
4. **Enable Notifications**: Never miss a message

### **For Password Reset:**

1. **Email Service**: Integrate SendGrid, Mailgun, or AWS SES
2. **Email Template**: Design branded reset email
3. **Remove Dev Token**: Delete `_devToken` from response
4. **Add Rate Limiting**: Prevent abuse (max 3 requests/hour)
5. **Hash Passwords**: Use bcrypt or similar before storing

---

## 📝 Quick Configuration Checklist

### **WhatsApp Setup**
- [ ] Replace `1234567890` with your actual number
- [ ] Test the link opens WhatsApp correctly
- [ ] Add pre-filled message if needed
- [ ] Train team on WhatsApp support

### **Telegram Setup**
- [ ] Replace `steadfastdigital` with your username/group
- [ ] Test the link opens Telegram correctly
- [ ] Set up bot commands if using a bot
- [ ] Configure group permissions

### **Password Reset**
- [ ] Test forgot password flow
- [ ] Verify tokens expire after 1 hour
- [ ] Check used tokens can't be reused
- [ ] Plan email integration for production
- [ ] Implement password hashing
- [ ] Add rate limiting

---

## 🔧 Advanced Configuration

### **Add More Contact Methods**

You can add more buttons by editing `/src/app/pages/Support.tsx`:

**Example: Add Phone Number**
```tsx
<a
  href="tel:+15551234567"
  className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4 rounded-lg flex items-center justify-center gap-3"
>
  <Phone size={24} />
  <span className="font-semibold">Call Support</span>
</a>
```

**Example: Add Messenger**
```tsx
<a
  href="https://m.me/YourPageName"
  target="_blank"
  rel="noopener noreferrer"
  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-lg flex items-center justify-center gap-3"
>
  <MessageCircleMore size={24} />
  <span className="font-semibold">Facebook Messenger</span>
</a>
```

---

## 📞 Contact Button Locations

The contact buttons are currently on:
- `/support` page - Main customer support page

**To add to other pages:**

1. Import icons:
   ```tsx
   import { MessageCircleMore, Send } from 'lucide-react';
   ```

2. Add button HTML (copy from Support.tsx)

3. Update links with your WhatsApp/Telegram

---

## ✅ Verification

### **Test WhatsApp Link**
1. Click button on `/support`
2. Should open WhatsApp app/web
3. Correct number pre-filled
4. Ready to send message

### **Test Telegram Link**
1. Click button on `/support`
2. Should open Telegram app/web
3. Correct username/group loaded
4. Ready to start chat

### **Test Password Reset**
1. Go to `/forgot-password`
2. Enter email
3. Check console for token
4. Verify token hasn't expired
5. Test reset endpoint
6. Confirm password updated

---

## 🎯 Summary

**WhatsApp**: Update phone number in `Support.tsx` line 259  
**Telegram**: Update username/group in `Support.tsx` line 272  
**Password Reset**: 4 endpoints ready, email integration needed for production  

**Location**: `/src/app/pages/Support.tsx`  
**Format**: `https://wa.me/PHONE` and `https://t.me/USERNAME`  

---

**Last Updated**: March 11, 2026  
**Version**: 1.0.0
