# 📱 Simple Setup Guide: WhatsApp & Password Reset

**Easy step-by-step instructions for non-technical users**

---

## 🟢 Part 1: Add Your WhatsApp Link

### **What You Need:**
- Your WhatsApp business phone number
- 5 minutes of time

---

### **Step 1: Format Your Phone Number**

Take your WhatsApp number and remove ALL spaces, dashes, and symbols.

**Examples:**

| Your Number | Correct Format |
|-------------|----------------|
| +1 (555) 123-4567 | `15551234567` |
| +44 7911 123456 | `447911123456` |
| +91 98765-43210 | `919876543210` |

**Rules:**
- ✅ Start with country code (no + sign)
- ✅ No spaces
- ✅ No dashes
- ✅ No brackets
- ✅ Just numbers

---

### **Step 2: Find the Code**

1. **Open this file**: `/src/app/pages/Support.tsx`

2. **Look for line 256** - You'll see this:
   ```tsx
   href="https://wa.me/1234567890"  {/* 👈 CHANGE THIS NUMBER */}
   ```

3. **This is what you need to change!**

---

### **Step 3: Replace the Number**

**Before:**
```tsx
href="https://wa.me/1234567890"
```

**After (example with US number):**
```tsx
href="https://wa.me/15551234567"
```

**That's it!** Just replace `1234567890` with YOUR formatted number.

---

### **Step 4: Save and Test**

1. **Save the file**
2. **Go to your website**: `/support` page
3. **Click the green "WhatsApp Support" button**
4. **WhatsApp should open with YOUR number!** ✅

---

## 📘 Part 2: Add Your Telegram Link

### **Step 1: Get Your Telegram Username**

Open Telegram and find your username/group:

**For Personal/Channel:**
- Open Telegram
- Go to Settings → Username
- Copy your username (example: `@YourUsername`)
- Remove the `@` symbol

**For Group:**
- Open your group
- Click group name → "Invite Link"
- Copy the link (example: `https://t.me/joinchat/ABC123...`)

---

### **Step 2: Update the Code**

1. **Open**: `/src/app/pages/Support.tsx`

2. **Find line 266**:
   ```tsx
   href="https://t.me/steadfastdigital"  {/* 👈 CHANGE THIS USERNAME */}
   ```

3. **Replace** `steadfastdigital` with YOUR username

**Examples:**

```tsx
// Personal/Channel:
href="https://t.me/YourSupportTeam"

// Group (use full link):
href="https://t.me/joinchat/ABC123XYZ456"

// Bot:
href="https://t.me/YourSupportBot"
```

---

### **Step 3: Test It**

1. Save the file
2. Go to `/support` page
3. Click blue "Telegram Support" button
4. Telegram should open! ✅

---

## 🔑 Part 3: Reset a User's Password

You have **TWO ways** to reset passwords:

---

### **Method 1: User Self-Service (Forgot Password)**

**What the user does:**

1. **Go to**: `/forgot-password` page

2. **Enter their email**: `user@example.com`

3. **Click**: "Send Reset Instructions"

4. **Success!** They'll see confirmation screen

---

**What happens behind the scenes:**

The system:
- Creates a unique reset token (like `reset_123abc456`)
- Token is valid for 1 hour
- Logs the token to browser console (for testing)
- In production, would email the link to user

---

**For Testing (Developer Mode):**

1. Open browser console (F12)
2. You'll see:
   ```
   Password reset requested for: user@example.com
   Reset token: reset_1710172800_abc123
   ```
3. Copy the token
4. Use it to reset password (see Method 2)

---

### **Method 2: Admin Manual Reset (API)**

**To manually reset any user's password:**

#### **Step 1: Open Your API Testing Tool**

You can use:
- Browser (we'll provide simple HTML)
- Postman
- cURL command line

#### **Step 2: Call the Reset API**

**API Endpoint:**
```
POST https://{projectId}.supabase.co/functions/v1/make-server-a1c55d7e/auth/change-password
```

**Request Body:**
```json
{
  "username": "ugreen",
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456"
}
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {publicAnonKey}
```

---

### **Easy Browser Method (No Tools Needed)**

Copy this HTML, save as `reset-password.html`, open in browser:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Reset User Password</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 600px;
      margin: 50px auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .form-group {
      margin-bottom: 15px;
    }
    label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }
    input {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-sizing: border-box;
    }
    button {
      background: #00D9FF;
      color: white;
      padding: 12px 24px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
    }
    button:hover {
      background: #00c0e6;
    }
    .result {
      margin-top: 20px;
      padding: 15px;
      border-radius: 4px;
      display: none;
    }
    .success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    .error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
  </style>
</head>
<body>
  <h1>🔑 Reset User Password</h1>
  
  <form id="resetForm">
    <div class="form-group">
      <label>Username:</label>
      <input type="text" id="username" value="ugreen" required>
    </div>
    
    <div class="form-group">
      <label>Current Password:</label>
      <input type="password" id="currentPassword" required>
    </div>
    
    <div class="form-group">
      <label>New Password:</label>
      <input type="password" id="newPassword" required>
    </div>
    
    <button type="submit">Reset Password</button>
  </form>
  
  <div id="result" class="result"></div>
  
  <script>
    // REPLACE THESE VALUES:
    const PROJECT_ID = 'YOUR_PROJECT_ID';
    const ANON_KEY = 'YOUR_ANON_KEY';
    
    document.getElementById('resetForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const username = document.getElementById('username').value;
      const currentPassword = document.getElementById('currentPassword').value;
      const newPassword = document.getElementById('newPassword').value;
      
      const resultDiv = document.getElementById('result');
      resultDiv.style.display = 'none';
      
      try {
        const response = await fetch(
          `https://${PROJECT_ID}.supabase.co/functions/v1/make-server-a1c55d7e/auth/change-password`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${ANON_KEY}`
            },
            body: JSON.stringify({
              username,
              currentPassword,
              newPassword
            })
          }
        );
        
        const data = await response.json();
        
        if (response.ok) {
          resultDiv.className = 'result success';
          resultDiv.textContent = '✅ Password reset successful!';
        } else {
          throw new Error(data.error || 'Failed to reset password');
        }
      } catch (error) {
        resultDiv.className = 'result error';
        resultDiv.textContent = '❌ Error: ' + error.message;
      }
      
      resultDiv.style.display = 'block';
    });
  </script>
</body>
</html>
```

**How to use:**

1. Copy the HTML above
2. Replace `YOUR_PROJECT_ID` and `YOUR_ANON_KEY`
3. Save as `reset-password.html`
4. Open in browser
5. Fill in username and passwords
6. Click "Reset Password"

---

### **Using Command Line (cURL)**

```bash
# Replace these variables:
PROJECT_ID="your_project_id"
ANON_KEY="your_anon_key"

# Reset password:
curl -X POST \
  "https://${PROJECT_ID}.supabase.co/functions/v1/make-server-a1c55d7e/auth/change-password" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -d '{
    "username": "ugreen",
    "currentPassword": "oldpass123",
    "newPassword": "newpass456"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## 🎯 Quick Reference Summary

### **WhatsApp:**
- **File**: `/src/app/pages/Support.tsx`
- **Line**: 256
- **Change**: `https://wa.me/1234567890` → `https://wa.me/YOUR_NUMBER`

### **Telegram:**
- **File**: `/src/app/pages/Support.tsx`
- **Line**: 266
- **Change**: `https://t.me/steadfastdigital` → `https://t.me/YOUR_USERNAME`

### **Password Reset:**
- **User Page**: `/forgot-password`
- **API Endpoint**: `/auth/change-password`
- **Token Expiry**: 1 hour
- **Method**: API call or HTML form above

---

## ✅ Testing Checklist

### **WhatsApp Test:**
- [ ] Replaced number in code
- [ ] Saved file
- [ ] Went to `/support` page
- [ ] Clicked "WhatsApp Support" button
- [ ] WhatsApp opened with correct number

### **Telegram Test:**
- [ ] Replaced username in code
- [ ] Saved file
- [ ] Went to `/support` page
- [ ] Clicked "Telegram Support" button
- [ ] Telegram opened correctly

### **Password Reset Test:**
- [ ] User goes to `/forgot-password`
- [ ] Enters email
- [ ] Sees success message
- [ ] Token logged to console (dev mode)
- [ ] Password resets successfully

---

## ❓ FAQ

**Q: What if I don't have WhatsApp Business?**
A: Regular WhatsApp works fine! Just use your phone number.

**Q: Can I hide the buttons if I don't use them?**
A: Yes! Just delete the `<a>` tag for that button in `Support.tsx`.

**Q: How do I send actual reset emails?**
A: You'll need to integrate an email service like SendGrid, Mailgun, or AWS SES. See `/CONTACT_SETUP_GUIDE.md` for details.

**Q: Is the password stored securely?**
A: Currently stored as plain text for development. For production, implement bcrypt hashing.

**Q: Can I add more contact methods?**
A: Yes! See examples in `/CONTACT_SETUP_GUIDE.md` for adding phone, messenger, etc.

---

## 🆘 Need Help?

**If something doesn't work:**

1. **Check the browser console** (F12 → Console tab)
2. **Look for error messages** in red
3. **Verify your formatting** (no extra spaces, correct syntax)
4. **Test the links manually** in a new browser tab

**Common Issues:**

| Problem | Solution |
|---------|----------|
| WhatsApp opens wrong number | Check international format, no + sign |
| Telegram says "User not found" | Verify username is correct, no @ symbol in code |
| Password reset fails | Check username exists, current password correct |
| Button doesn't appear | Check file saved, browser cache cleared |

---

**Created**: March 11, 2026  
**Platform**: Steadfast Digital  
**Version**: 1.0.0

✅ **You're all set!** Follow these steps and you'll have WhatsApp, Telegram, and password reset working perfectly.
