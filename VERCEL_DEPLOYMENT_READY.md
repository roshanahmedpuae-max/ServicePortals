# 🚀 Vercel Deployment - Ready to Deploy

Your application is now fully configured and ready for Vercel deployment!

## ✅ Pre-Deployment Checklist

### Configuration Files
- ✅ `next.config.mjs` - Optimized with Webpack, image optimization, and security headers
- ✅ `vercel.json` - Configured with headers, caching, function timeouts, and cron jobs
- ✅ `package.json` - Build scripts configured correctly with Node.js version requirements
- ✅ `tsconfig.json` - TypeScript properly configured
- ✅ `.gitignore` - Environment files and build artifacts excluded

### Code Quality
- ✅ TypeScript configuration verified
- ✅ Build scripts ready
- ✅ API routes configured with proper timeouts
- ✅ Cron job configured for asset reminders

## 🔐 Required Environment Variables

**IMPORTANT:** Set these in **Vercel Dashboard → Settings → Environment Variables** before deploying.

### Core Required Variables

```bash
# MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# Authentication Secret (generate with: openssl rand -base64 32)
AUTH_SECRET=your-strong-random-secret-key-minimum-32-characters

# Cloudinary Configuration
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name

# SMTP Email Configuration (Default)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ADMIN_EMAIL=admin@printersuae.com
```

### Optional: Business Unit Specific SMTP

If you need separate SMTP accounts for different business units:

```bash
# PrintersUAE SMTP (Optional)
SMTP_HOST_PRINTERS=smtp.gmail.com
SMTP_PORT_PRINTERS=587
SMTP_USER_PRINTERS=printers@printersuae.com
SMTP_PASS_PRINTERS=your-app-password

# G3 Facility SMTP (Optional)
SMTP_HOST_G3=smtp.gmail.com
SMTP_PORT_G3=587
SMTP_USER_G3=g3@printersuae.com
SMTP_PASS_G3=your-app-password

# IT Service SMTP (Optional)
SMTP_HOST_IT=smtp.gmail.com
SMTP_PORT_IT=587
SMTP_USER_IT=it@printersuae.com
SMTP_PASS_IT=your-app-password
```

### How to Set Environment Variables in Vercel

1. Go to your project on [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable for:
   - **Production** (required)
   - **Preview** (recommended for testing)
   - **Development** (optional)

**Note:** After adding environment variables, you need to redeploy for them to take effect.

## 📋 Deployment Steps

### Step 1: Prepare Your Repository

```bash
# Ensure all changes are committed
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### Step 2: Deploy to Vercel

#### Option A: Via Vercel Dashboard (Recommended)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository**
3. Select your repository (GitHub/GitLab/Bitbucket)
4. Vercel will auto-detect Next.js framework
5. **Configure Project Settings:**
   - Framework Preset: Next.js
   - Root Directory: `./` (or your project root)
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `.next` (auto-detected)
   - Install Command: `npm install --legacy-peer-deps` (already configured)
6. **Add Environment Variables** (see above)
7. Click **Deploy**

#### Option B: Via Vercel CLI

```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (first time will ask for configuration)
vercel

# For production deployment
vercel --prod
```

### Step 3: Post-Deployment Verification

After deployment completes:

1. ✅ **Check Deployment Logs**
   - Go to your project → Deployments → Latest deployment
   - Verify no build errors
   - Check function logs for runtime errors

2. ✅ **Test Application Functionality**
   - Visit your deployment URL
   - Test employee login
   - Test customer portals:
     - `/customer/puae`
     - `/customer/g3`
     - `/customer/it`
   - Test form submission
   - Test PDF generation
   - Test email sending
   - Verify API routes are working

3. ✅ **Verify Cron Jobs**
   - Cron job is scheduled to run daily at 9:00 AM UTC
   - Check Vercel Cron logs in dashboard
   - Verify asset reminders are being sent

4. ✅ **Security & Performance**
   - Check security headers (use [securityheaders.com](https://securityheaders.com))
   - Run Lighthouse audit (target: 90+ scores)
   - Verify image optimization is working
   - Check Core Web Vitals

## 🔧 Configuration Details

### Vercel Configuration (`vercel.json`)

- **Build Command:** `npm run build`
- **Install Command:** `npm install --legacy-peer-deps`
- **Framework:** Next.js (auto-detected)
- **Region:** `iad1` (US East)
- **Function Timeouts:**
  - API routes: 30 seconds
  - Cron jobs: 60 seconds
- **Cron Jobs:**
  - Asset reminders: Daily at 9:00 AM UTC (`0 9 * * *`)
- **Security Headers:** Configured for XSS protection, frame options, content type
- **Caching:** Static assets cached for 1 year

### Next.js Configuration (`next.config.mjs`)

- **Webpack:** Explicitly enabled (Turbopack disabled)
- **Image Optimization:** AVIF and WebP formats
- **Code Splitting:** Optimized bundle splitting
- **Compression:** Enabled
- **Security Headers:** Additional headers configured
- **Package Optimization:** React Icons and PDF renderer optimized

## 🐛 Troubleshooting

### Build Fails

**Common Issues:**
1. **Missing Environment Variables**
   - Solution: Ensure all required variables are set in Vercel Dashboard
   - Redeploy after adding variables

2. **TypeScript Errors**
   - Solution: Run `npm run type-check` locally first
   - Fix any TypeScript errors before deploying

3. **Node.js Version Mismatch**
   - Solution: Vercel uses Node.js 18+ by default (configured in package.json)
   - If issues persist, add `.nvmrc` file with specific version

4. **Dependency Installation Issues**
   - Solution: `--legacy-peer-deps` flag is already configured
   - Check package.json for conflicting dependencies

### Runtime Errors

1. **MongoDB Connection Issues**
   - Verify `MONGODB_URI` is correct
   - Check MongoDB Atlas network access (allow Vercel IPs)
   - Ensure connection string includes retryWrites parameter

2. **SMTP Connection Failures**
   - Verify SMTP credentials are correct
   - For Gmail: Use App Password (not regular password)
   - Check SMTP port (587 for TLS, 465 for SSL)
   - Verify firewall/network restrictions

3. **Cloudinary Upload Failures**
   - Verify `CLOUDINARY_URL` format is correct
   - Check Cloudinary account limits
   - Verify API key permissions

4. **API Route Timeouts**
   - Default timeout is 30 seconds
   - Cron jobs have 60 seconds
   - For longer operations, consider background jobs

### Performance Issues

1. **Slow Page Loads**
   - Check bundle sizes in Network tab
   - Verify code splitting is working
   - Check image optimization

2. **Large Bundle Sizes**
   - Review webpack configuration
   - Check for unnecessary dependencies
   - Verify tree-shaking is working

## 📊 Monitoring & Analytics

### Enable Vercel Analytics (Optional)

1. Go to **Settings** → **Analytics**
2. Enable **Web Analytics**
3. View Core Web Vitals and performance metrics

### Error Monitoring (Optional)

Consider integrating:
- Sentry for error tracking
- LogRocket for session replay
- Vercel Logs for real-time debugging

## 🔄 Continuous Deployment

Vercel automatically deploys:
- **Production:** Pushes to `main` or `master` branch
- **Preview:** Pull requests and other branches

### Branch Protection

Consider enabling:
- Required status checks
- Required reviews
- Branch protection rules

## 🌐 Custom Domain Setup

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. SSL certificate is automatically provisioned

## 📝 Post-Deployment Checklist

- [ ] All environment variables set
- [ ] Deployment successful (no errors in logs)
- [ ] Application accessible at deployment URL
- [ ] Employee login working
- [ ] Customer portals accessible
- [ ] Form submission working
- [ ] PDF generation working
- [ ] Email sending working
- [ ] Cron jobs scheduled correctly
- [ ] Security headers verified
- [ ] Performance metrics acceptable
- [ ] Custom domain configured (if applicable)
- [ ] Monitoring/analytics enabled (optional)

## 🎉 You're Ready!

Your application is now fully configured for Vercel deployment. Follow the steps above to deploy, and you'll be live in minutes!

For additional support:
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Vercel Support](https://vercel.com/support)

---

**Last Updated:** January 2025
**Project:** PrintersUAE Service Order System


