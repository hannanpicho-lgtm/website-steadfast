# 🚀 PRODUCTION DEPLOYMENT GUIDE
## Steadfast Digital Platform - Complete Deployment Instructions

---

## 📋 TABLE OF CONTENTS

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Options](#deployment-options)
3. [Step-by-Step Deployment](#step-by-step-deployment)
4. [Post-Deployment Configuration](#post-deployment-configuration)
5. [Testing in Production](#testing-in-production)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Rollback Procedures](#rollback-procedures)
8. [Security Hardening](#security-hardening)

---

## 🔍 PRE-DEPLOYMENT CHECKLIST

### Environment Preparation

- [ ] **Supabase Project Active**
  - Project ID: `gvqwvuqeenkusdayosty`
  - Anon Key configured
  - Service Role Key secured
  - Database URL accessible

- [ ] **Domain Name Ready** (Optional but recommended)
  - Domain purchased
  - DNS configured
  - SSL certificate ready

- [ ] **Environment Variables Documented**
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_DB_URL`

- [ ] **Code Repository Clean**
  - All features tested locally
  - No console errors
  - Build passes successfully
  - Dependencies updated

- [ ] **Admin Credentials Prepared**
  - Admin username decided
  - Strong admin password created
  - Backup admin account planned

---

## 🎯 DEPLOYMENT OPTIONS

### Option 1: Vercel (Recommended for React Apps)

**Pros:**
- Automatic CI/CD
- Free SSL certificates
- Edge network (fast global delivery)
- Easy environment variable management
- Automatic builds on git push

**Cons:**
- Serverless functions have execution limits
- May require paid plan for high traffic

**Best For:** Small to medium platforms, startups, MVP launches

---

### Option 2: Netlify

**Pros:**
- Simple deployment process
- Free SSL
- Automatic builds
- Form handling built-in
- Good for static sites

**Cons:**
- Function execution limits on free tier
- Build minutes limited

**Best For:** Quick launches, testing, low-traffic sites

---

### Option 3: AWS (Amazon Web Services)

**Pros:**
- Highly scalable
- Full control over infrastructure
- Professional-grade reliability
- Many integrated services

**Cons:**
- Complex setup
- Requires AWS knowledge
- Can be expensive
- Steeper learning curve

**Best For:** Enterprise applications, high-traffic platforms, serious production use

---

### Option 4: DigitalOcean App Platform

**Pros:**
- Simple pricing
- Good developer experience
- Scalable
- Built-in databases

**Cons:**
- More expensive than Vercel/Netlify
- Fewer global regions

**Best For:** Medium-sized applications, predictable costs

---

### Option 5: Self-Hosted (VPS - Digital Ocean, Linode, etc.)

**Pros:**
- Full control
- Cost-effective for high traffic
- No vendor lock-in
- Custom configurations

**Cons:**
- Requires DevOps knowledge
- Manual security updates
- No automatic scaling
- You manage everything

**Best For:** Technical teams, cost-conscious projects, specific requirements

---

## 🚀 STEP-BY-STEP DEPLOYMENT

### OPTION 1: VERCEL DEPLOYMENT (Recommended)

#### Step 1: Prepare Repository

```bash
# Initialize git repository (if not already done)
git init
git add .
git commit -m "Initial commit - Ready for production"

# Create GitHub repository and push
git remote add origin https://github.com/yourusername/steadfast-digital.git
git branch -M main
git push -u origin main
```

#### Step 2: Connect to Vercel

1. Go to https://vercel.com
2. Sign up / Login with GitHub
3. Click "Add New Project"
4. Import your GitHub repository
5. Configure project:
   ```
   Framework Preset: Vite
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

#### Step 3: Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

```env
SUPABASE_URL=https://gvqwvuqeenkusdayosty.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
SUPABASE_DB_URL=<your-db-url>
NODE_ENV=production
```

⚠️ **IMPORTANT:** Keep Service Role Key secret!

#### Step 4: Deploy

1. Click "Deploy"
2. Wait for build to complete (2-5 minutes)
3. Get deployment URL: `https://your-project.vercel.app`

#### Step 5: Custom Domain (Optional)

1. Vercel Dashboard → Settings → Domains
2. Add your domain: `steadfastdigital.com`
3. Configure DNS as instructed by Vercel
4. Wait for SSL certificate (automatic)

---

### OPTION 2: NETLIFY DEPLOYMENT

#### Step 1: Build Locally

```bash
npm run build
```

This creates a `dist` folder with production files.

#### Step 2: Deploy to Netlify

**Method A: Drag & Drop**
1. Go to https://netlify.com
2. Sign up / Login
3. Drag `dist` folder to deployment zone
4. Site goes live immediately

**Method B: GitHub Integration (Recommended)**
1. Login to Netlify
2. Click "New site from Git"
3. Connect GitHub repository
4. Configure build:
   ```
   Build command: npm run build
   Publish directory: dist
   ```
5. Add environment variables (same as Vercel)
6. Click "Deploy site"

---

### OPTION 3: AWS DEPLOYMENT (Advanced)

#### Step 1: Build Application

```bash
npm run build
```

#### Step 2: Set Up AWS S3 + CloudFront

1. **Create S3 Bucket:**
   ```bash
   aws s3 mb s3://steadfast-digital-prod
   aws s3 sync dist/ s3://steadfast-digital-prod --acl public-read
   ```

2. **Enable Static Website Hosting:**
   - S3 Console → Bucket → Properties → Static Website Hosting
   - Index document: `index.html`
   - Error document: `index.html` (for React Router)

3. **Create CloudFront Distribution:**
   - Origin: Your S3 bucket
   - Default Root Object: `index.html`
   - Custom Error Responses: 404 → /index.html (200)

4. **Configure Route 53 (Optional):**
   - Add A record pointing to CloudFront
   - Configure SSL with AWS Certificate Manager

---

### OPTION 4: DIGITALOCEAN APP PLATFORM

#### Step 1: Prepare for Deployment

1. Push code to GitHub/GitLab
2. Login to DigitalOcean
3. Click "Create" → "App"

#### Step 2: Configure App

1. Select repository
2. Configure build:
   ```
   Build Command: npm run build
   Output Directory: dist
   ```
3. Add environment variables
4. Choose plan (starts at $5/month)
5. Deploy

---

### OPTION 5: SELF-HOSTED VPS DEPLOYMENT

#### Step 1: Provision VPS

```bash
# Create Ubuntu 22.04 LTS VPS (DigitalOcean, Linode, etc.)
# Recommended: 2GB RAM, 50GB Storage

# SSH into server
ssh root@your-server-ip
```

#### Step 2: Install Dependencies

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install Nginx
apt install -y nginx

# Install PM2 (Process Manager)
npm install -g pm2

# Install Git
apt install -y git
```

#### Step 3: Clone & Build Application

```bash
# Clone repository
cd /var/www
git clone https://github.com/yourusername/steadfast-digital.git
cd steadfast-digital

# Install dependencies
npm install

# Build for production
npm run build
```

#### Step 4: Configure Nginx

```bash
# Create Nginx configuration
nano /etc/nginx/sites-available/steadfast-digital
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name steadfastdigital.com www.steadfastdigital.com;
    
    root /var/www/steadfast-digital/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/steadfast-digital /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

#### Step 5: Configure SSL with Let's Encrypt

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d steadfastdigital.com -d www.steadfastdigital.com

# Auto-renewal (already set up by certbot)
certbot renew --dry-run
```

#### Step 6: Configure Firewall

```bash
ufw allow 'Nginx Full'
ufw allow OpenSSH
ufw enable
```

---

## ⚙️ POST-DEPLOYMENT CONFIGURATION

### 1. Supabase Edge Functions Deployment

Your backend is already deployed to Supabase Edge Functions. Verify:

```bash
curl https://gvqwvuqeenkusdayosty.supabase.co/functions/v1/make-server-a1c55d7e/health
```

Expected response: `{"status":"ok"}`

### 2. Create Admin Account

After deployment, create the first admin account:

1. Navigate to `/signup`
2. Create account with username: `admin`
3. Manually update user data in Supabase KV Store:
   - Set `isAdmin: true`
   - Set strong password
   - Set high VIP level if needed

### 3. Configure Support Links

1. Login as admin
2. Navigate to `/admin`
3. Go to Customer Support → Support Links tab
4. Set WhatsApp number: `+1234567890` (your business number)
5. Set Telegram username: `@yoursupport` (your support bot)
6. Save configuration

### 4. Test Critical Flows

Run through the smoke test checklist from `PRE_LAUNCH_CHECKLIST.md`

### 5. Set Up Monitoring

**Option A: Vercel Analytics (if using Vercel)**
- Enable in Vercel dashboard
- Monitor traffic, performance

**Option B: Google Analytics**
Add to `/src/app/App.tsx`:
```tsx
// Add Google Analytics tracking code
useEffect(() => {
  // Add GA script
}, []);
```

**Option C: Sentry for Error Tracking**
```bash
npm install @sentry/react
```

Configure in App.tsx:
```tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: "production",
});
```

### 6. Configure Email Service

**Option A: SendGrid**
```bash
npm install @sendgrid/mail
```

Update password reset endpoint to send actual emails.

**Option B: AWS SES**
Configure AWS SES and update email sending logic.

**Option C: SMTP (Generic)**
Use nodemailer with your email provider.

### 7. Payment Integration (If Needed)

**For Crypto Payments:**
- Integrate CoinGate, Coinbase Commerce, or BTCPay Server
- Add webhook handlers for payment confirmation

**For Traditional Payments:**
- Integrate Stripe, PayPal, or Razorpay
- Set up webhook endpoints
- Handle payment confirmations

---

## 🧪 TESTING IN PRODUCTION

### 1. Smoke Test

Run through all critical user flows:
- [ ] Registration
- [ ] Login
- [ ] Task submission
- [ ] Premium bundle assignment
- [ ] Withdrawal request
- [ ] Live chat
- [ ] Support ticket creation

### 2. Performance Test

```bash
# Use Apache Bench
ab -n 1000 -c 10 https://your-domain.com/

# Or use k6
k6 run loadtest.js
```

### 3. Security Test

- [ ] Check HTTPS enforcement
- [ ] Test SQL injection attempts
- [ ] Test XSS vulnerabilities
- [ ] Verify CORS settings
- [ ] Check for exposed secrets

### 4. Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

### 5. Mobile Responsiveness

Test on:
- [ ] iPhone (various sizes)
- [ ] Android phones
- [ ] Tablets
- [ ] Different orientations

---

## 📊 MONITORING & MAINTENANCE

### Daily Checks

- [ ] Check server uptime
- [ ] Review error logs
- [ ] Monitor user activity
- [ ] Check support tickets

### Weekly Tasks

- [ ] Review performance metrics
- [ ] Analyze user behavior
- [ ] Check for security updates
- [ ] Backup database

### Monthly Tasks

- [ ] Update dependencies
- [ ] Review and optimize performance
- [ ] Conduct security audit
- [ ] Review user feedback

### Tools to Use

1. **Uptime Monitoring:**
   - UptimeRobot (free)
   - Pingdom
   - StatusCake

2. **Error Tracking:**
   - Sentry
   - LogRocket
   - Rollbar

3. **Analytics:**
   - Google Analytics
   - Vercel Analytics
   - Mixpanel

4. **Database Monitoring:**
   - Supabase Dashboard
   - Custom KV store monitoring

---

## 🔄 ROLLBACK PROCEDURES

### If Deployment Fails

**Vercel/Netlify:**
1. Go to Deployments tab
2. Find last working deployment
3. Click "Promote to Production"
4. Instant rollback

**Self-Hosted:**
```bash
# Keep previous build
cd /var/www/steadfast-digital
git checkout <previous-commit>
npm install
npm run build
systemctl restart nginx
```

### Database Rollback

⚠️ **KV Store has no native rollback**

**Prevention:**
- Regular backups via API
- Export critical data daily
- Keep versioned copies

**Emergency Restore:**
```bash
# Restore from backup JSON
curl -X POST /restore-backup \
  -H "Content-Type: application/json" \
  -d @backup.json
```

---

## 🔒 SECURITY HARDENING

### Critical Security Updates Needed

#### 1. Implement Password Hashing

**Install bcrypt:**
```bash
npm install bcrypt
```

**Update signup/login logic:**
```typescript
import bcrypt from 'bcrypt';

// On signup
const hashedPassword = await bcrypt.hash(password, 10);

// On login
const isValid = await bcrypt.compare(password, user.hashedPassword);
```

#### 2. Add JWT Authentication

**Install jsonwebtoken:**
```bash
npm install jsonwebtoken
```

**Generate tokens:**
```typescript
import jwt from 'jsonwebtoken';

const token = jwt.sign(
  { username, userId },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);
```

#### 3. Enable Rate Limiting

**Install express-rate-limit (or Hono equivalent):**
```typescript
import { rateLimiter } from 'hono-rate-limiter'

app.use(
  rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  })
)
```

#### 4. Input Validation

**Install validator:**
```bash
npm install validator
```

**Validate all inputs:**
```typescript
import validator from 'validator';

if (!validator.isEmail(email)) {
  return { error: 'Invalid email' };
}
```

#### 5. CSRF Protection

Add CSRF tokens to all forms.

#### 6. Content Security Policy

Add CSP headers:
```typescript
app.use((c, next) => {
  c.header('Content-Security-Policy', "default-src 'self'");
  return next();
});
```

#### 7. Secure Headers

```typescript
app.use((c, next) => {
  c.header('X-Frame-Options', 'DENY');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Strict-Transport-Security', 'max-age=31536000');
  return next();
});
```

---

## 🎉 FINAL CHECKLIST BEFORE GOING LIVE

- [ ] All smoke tests passed
- [ ] Security hardening complete
- [ ] SSL certificate active
- [ ] Admin account created
- [ ] Support links configured
- [ ] Payment integration tested (if applicable)
- [ ] Email service configured
- [ ] Monitoring tools active
- [ ] Error tracking enabled
- [ ] Backup system in place
- [ ] Legal pages finalized (Terms, Privacy Policy)
- [ ] Performance optimization done
- [ ] Mobile responsiveness verified
- [ ] Cross-browser testing complete
- [ ] Load testing passed
- [ ] Team trained on admin panel
- [ ] Customer support prepared
- [ ] Marketing materials ready
- [ ] Launch announcement prepared
- [ ] Rollback plan documented

---

## 📞 SUPPORT & RESOURCES

### Official Documentation

- **Supabase:** https://supabase.com/docs
- **React Router:** https://reactrouter.com
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Hono Framework:** https://hono.dev

### Deployment Platforms

- **Vercel:** https://vercel.com/docs
- **Netlify:** https://docs.netlify.com
- **AWS:** https://aws.amazon.com/documentation
- **DigitalOcean:** https://docs.digitalocean.com

### Community Resources

- Stack Overflow: Tag questions with `react`, `supabase`
- Reddit: r/reactjs, r/webdev
- Discord: React, Supabase communities

---

## 🚨 EMERGENCY CONTACTS

**Critical Issues:**
1. Shut down affected service
2. Roll back to last working version
3. Investigate root cause
4. Fix and redeploy
5. Post-mortem analysis

**Supabase Issues:**
- Check Supabase Status: https://status.supabase.com
- Contact Supabase Support: support@supabase.io

---

**Document Version:** 1.0  
**Last Updated:** March 11, 2026  
**Platform:** Steadfast Digital v1.0.0-beta  
**Prepared By:** Development Team

---

## 🎯 QUICK START PRODUCTION DEPLOYMENT

**Fastest Path to Production (Vercel):**

```bash
# 1. Build locally to verify
npm run build

# 2. Push to GitHub
git add .
git commit -m "Production ready"
git push origin main

# 3. Deploy to Vercel
# - Visit vercel.com
# - Import repository
# - Add environment variables
# - Deploy (automatic)

# 4. Your site is live! 🎉
```

**Estimated Time:** 15-30 minutes

**Good luck with your launch! 🚀**
