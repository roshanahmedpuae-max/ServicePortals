# 🚀 Quick Deployment Guide - Vercel

Your project is **ready to deploy** to Vercel! Follow these steps:

## ✅ Pre-Deployment Checklist

- [x] Build passes successfully (`npm run build`)
- [x] TypeScript errors fixed
- [x] `vercel.json` configured
- [x] `next.config.mjs` optimized
- [x] Environment variables documented

## 🔐 Step 1: Set Environment Variables in Vercel

**Go to:** Vercel Dashboard → Your Project → Settings → Environment Variables

Add these **required** variables:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
AUTH_SECRET=your-strong-random-secret-key-minimum-32-characters
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ADMIN_EMAIL=admin@printersuae.com
```

**Important:** 
- Set these for **Production** environment
- Optionally set for **Preview** and **Development**
- After adding, you'll need to redeploy

## 📤 Step 2: Deploy to Vercel

### Option A: Via Dashboard (Recommended)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository**
3. Select: `roshanahmedpuae-max/serviceorder`
4. Vercel will auto-detect Next.js
5. **Verify settings:**
   - Framework: Next.js
   - Build Command: `npm run build`
   - Install Command: `npm install --legacy-peer-deps`
6. Add environment variables (from Step 1)
7. Click **Deploy**

### Option B: Via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

## ✅ Step 3: Verify Deployment

After deployment:

1. **Check build logs** - Should show "Build Successful"
2. **Visit your deployment URL** - Should load without errors
3. **Test key features:**
   - Employee login
   - Customer portals (`/customer/puae`, `/customer/g3`, `/customer/it`)
   - Form submission
   - PDF generation
   - Email sending

## 🔧 Configuration Already Set

Your project already has:
- ✅ `vercel.json` with proper settings
- ✅ Function timeouts (30s for API, 60s for cron)
- ✅ Security headers configured
- ✅ Cron job for asset reminders
- ✅ Optimized build configuration

## 📚 More Details

See `VERCEL_DEPLOYMENT_READY.md` for comprehensive documentation.

## 🆘 Troubleshooting

**Build fails?**
- Check environment variables are set
- Verify MongoDB connection string
- Check Vercel build logs for errors

**Runtime errors?**
- Verify all environment variables are correct
- Check MongoDB network access (allow Vercel IPs)
- Verify SMTP credentials (use App Password for Gmail)

---

**Ready to deploy?** Follow Step 1 and Step 2 above! 🚀

