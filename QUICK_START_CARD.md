# 🚀 Quick Start Card

## Copy-Paste This Checklist!

---

## ✅ WhatsApp Setup (2 Minutes)

### **Step 1: Get Your Number**
Format: Country code + number (no spaces/dashes)

**Examples:**
- US: `15551234567`
- UK: `447911123456`
- India: `919876543210`

Your formatted number: `________________`

---

### **Step 2: Update Code**

```bash
1. Open: /src/app/pages/Support.tsx
2. Find line: 256
3. Look for: href="https://wa.me/1234567890"
4. Change to: href="https://wa.me/YOUR_NUMBER"
5. Save!
```

---

### **Step 3: Test**
```
✅ Go to /support
✅ Click green "WhatsApp Support" button  
✅ WhatsApp opens with your number
```

---

## ✅ Telegram Setup (2 Minutes)

### **Step 1: Get Username**

Open Telegram → Settings → Copy username (no @ symbol)

Your username: `________________`

---

### **Step 2: Update Code**

```bash
1. Open: /src/app/pages/Support.tsx
2. Find line: 266
3. Look for: href="https://t.me/steadfastdigital"
4. Change to: href="https://t.me/YOUR_USERNAME"
5. Save!
```

---

### **Step 3: Test**
```
✅ Go to /support
✅ Click blue "Telegram Support" button
✅ Telegram opens correctly
```

---

## ✅ Password Reset (User Self-Service)

### **User Instructions:**

```
1. Go to: /forgot-password
2. Enter email address
3. Click "Send Reset Instructions"
4. Check email for reset link
   (In dev mode, check browser console for token)
5. Click link and enter new password
6. Done! ✅
```

---

## ✅ Password Reset (Admin Manual)

### **Quick Reset via Browser:**

**Save this as `reset.html` and open in browser:**

```html
<!DOCTYPE html>
<html>
<head><title>Quick Password Reset</title></head>
<body style="font-family: Arial; max-width: 500px; margin: 50px auto; padding: 20px;">
  <h2>🔑 Reset Password</h2>
  <form id="f">
    <div style="margin-bottom: 15px;">
      <label><b>Username:</b></label><br>
      <input type="text" id="user" value="ugreen" style="width: 100%; padding: 8px; margin-top: 5px;">
    </div>
    <div style="margin-bottom: 15px;">
      <label><b>Current Password:</b></label><br>
      <input type="password" id="old" style="width: 100%; padding: 8px; margin-top: 5px;">
    </div>
    <div style="margin-bottom: 15px;">
      <label><b>New Password:</b></label><br>
      <input type="password" id="new" style="width: 100%; padding: 8px; margin-top: 5px;">
    </div>
    <button type="submit" style="background: #00D9FF; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">
      Reset Password
    </button>
  </form>
  <div id="msg" style="margin-top: 20px; padding: 15px; border-radius: 4px; display: none;"></div>
  
  <script>
    // ⚠️ REPLACE THESE:
    const PID = 'YOUR_PROJECT_ID';
    const KEY = 'YOUR_ANON_KEY';
    
    document.getElementById('f').onsubmit = async (e) => {
      e.preventDefault();
      const msg = document.getElementById('msg');
      try {
        const res = await fetch(`https://${PID}.supabase.co/functions/v1/make-server-a1c55d7e/auth/change-password`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}`},
          body: JSON.stringify({
            username: document.getElementById('user').value,
            currentPassword: document.getElementById('old').value,
            newPassword: document.getElementById('new').value
          })
        });
        const data = await res.json();
        if (res.ok) {
          msg.style.display = 'block';
          msg.style.background = '#d4edda';
          msg.style.color = '#155724';
          msg.textContent = '✅ Success! Password changed.';
        } else {
          throw new Error(data.error);
        }
      } catch (err) {
        msg.style.display = 'block';
        msg.style.background = '#f8d7da';
        msg.style.color = '#721c24';
        msg.textContent = '❌ Error: ' + err.message;
      }
    };
  </script>
</body>
</html>
```

**Usage:**
1. Copy code above
2. Replace `YOUR_PROJECT_ID` and `YOUR_ANON_KEY`
3. Save as `reset.html`
4. Double-click to open
5. Fill in username, old password, new password
6. Click "Reset Password"

---

## 📋 Complete Checklist

### WhatsApp
- [ ] Formatted phone number correctly
- [ ] Updated line 256 in Support.tsx
- [ ] Saved file
- [ ] Tested button on /support page
- [ ] WhatsApp opens with correct number

### Telegram
- [ ] Got Telegram username (no @)
- [ ] Updated line 266 in Support.tsx
- [ ] Saved file
- [ ] Tested button on /support page
- [ ] Telegram opens correctly

### Password Reset
- [ ] Tested /forgot-password page
- [ ] Email input works
- [ ] Success message appears
- [ ] Token generated (check console)
- [ ] Reset API works
- [ ] Password actually changes

---

## 🎯 Files You Need to Edit

| Feature | File | Line | Change What |
|---------|------|------|-------------|
| WhatsApp | `/src/app/pages/Support.tsx` | 256 | Phone number |
| Telegram | `/src/app/pages/Support.tsx` | 266 | Username |
| Password | Use API or HTML tool | - | Call endpoint |

---

## 🆘 Emergency Contacts

**If buttons don't work:**
1. Check browser console (F12)
2. Verify file saved
3. Clear browser cache (Ctrl+Shift+R)
4. Check phone number format

**If password reset fails:**
1. Verify username exists
2. Check current password is correct
3. Ensure new password not same as old
4. Check API response in console

---

## 🔗 Important URLs

| What | URL |
|------|-----|
| Support Page (with buttons) | `/support` |
| Forgot Password (users) | `/forgot-password` |
| Deployment Status | `/deployment-status` |
| Admin Dashboard | `/admin` |

---

## 📞 Contact Format Reference

### WhatsApp URL Format:
```
https://wa.me/COUNTRYCODEPHONENUMBER

Examples:
https://wa.me/15551234567  (US)
https://wa.me/447911123456  (UK)
https://wa.me/919876543210  (India)
```

### Telegram URL Format:
```
https://t.me/USERNAME

Examples:
https://t.me/supportteam
https://t.me/YourCompany
https://t.me/joinchat/ABC123...  (group invite)
```

---

## ⚡ Super Quick Summary

**WhatsApp:**
- File: `Support.tsx` line 256
- Change: `wa.me/1234567890` → `wa.me/YOUR_NUMBER`

**Telegram:**  
- File: `Support.tsx` line 266
- Change: `t.me/steadfastdigital` → `t.me/YOUR_USERNAME`

**Password Reset:**
- Users: Go to `/forgot-password`
- Admins: Use API or HTML tool above

---

**✅ That's it! Simple as 1-2-3!**

**Need detailed help?** See `/SIMPLE_SETUP_GUIDE.md`

---

Print this card and keep it handy! 📌
