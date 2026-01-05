# Vercel Deployment Checklist

This checklist ensures your application is ready for production deployment on Vercel.

## Pre-Deployment Checklist

### ✅ Code Quality
- [x] All TypeScript errors resolved (`npm run type-check`)
- [x] All ESLint errors fixed (`npm run lint`)
- [x] No console errors in browser
- [x] All features tested locally
- [x] Customer portal params handling fixed (Next.js 16 compatibility)
- [x] Turbopack issues resolved (using webpack)

### ✅ Configuration Files
- [x] `next.config.mjs` optimized for production
- [x] `vercel.json` configured with proper headers and caching
- [x] `package.json` has correct build scripts
- [x] `.nvmrc` specifies Node.js version (20)
- [x] `tsconfig.json` properly configured

### ✅ Environment Variables
Ensure all these are set in Vercel Dashboard → Settings → Environment Variables:

**Required:**
- [ ] `MONGODB_URI` - MongoDB connection string
- [ ] `AUTH_SECRET` - Strong random secret for auth tokens
- [ ] `CLOUDINARY_URL` - Cloudinary credentials URL
- [ ] `SMTP_HOST` - SMTP server hostname (e.g., smtp.gmail.com)
- [ ] `SMTP_PORT` - SMTP port (usually 587)
- [ ] `SMTP_USER` - SMTP username/email
- [ ] `SMTP_PASS` - SMTP password/app password
- [ ] `ADMIN_EMAIL` - Admin email for notifications

**Optional:**
- [ ] `NODE_ENV` - Set to "production" (auto-set by Vercel)
- [ ] Business unit specific SMTP variables (if using separate configs)

### ✅ Performance Optimizations Applied
- [x] Image optimization enabled (AVIF, WebP)
- [x] Code splitting configured
- [x] Bundle optimization enabled
- [x] Compression enabled
- [x] Static asset caching configured
- [x] Security headers configured
- [x] Package import optimization enabled

### ✅ Build Verification
- [ ] Test build locally: `npm run build`
- [ ] Verify build completes without errors
- [ ] Check build output size
- [ ] Test production build locally: `npm start`

## Deployment Steps

### 1. Commit and Push Changes
```bash
git add .
git commit -m "Optimize for Vercel production deployment"
git push origin main
```

### 2. Deploy to Vercel

**Option A: Via Vercel Dashboard**
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. Vercel will auto-detect Next.js
4. Configure environment variables (see above)
5. Click "Deploy"

**Option B: Via Vercel CLI**
```bash
npm i -g vercel
vercel login
vercel --prod
```

### 3. Post-Deployment Verification

- [ ] Check deployment logs for errors
- [ ] Visit deployment URL
- [ ] Test employee login
- [ ] Test customer portal (`/customer/puae`, `/customer/g3`, `/customer/it`)
- [ ] Test form submission
- [ ] Test PDF generation
- [ ] Test email sending
- [ ] Verify API routes are working
- [ ] Check browser console for errors
- [ ] Test on mobile devices
- [ ] Verify security headers (use securityheaders.com)

### 4. Performance Checks

- [ ] Run Lighthouse audit (target: 90+ scores)
- [ ] Check Core Web Vitals
- [ ] Verify image optimization is working
- [ ] Check bundle sizes in Network tab
- [ ] Verify caching headers are working

### 5. Monitoring Setup

- [ ] Enable Vercel Analytics (optional)
- [ ] Set up error monitoring (optional)
- [ ] Configure uptime monitoring (optional)
- [ ] Set up email alerts for deployment failures

## Troubleshooting

### Build Fails
1. Check build logs in Vercel dashboard
2. Verify all environment variables are set
3. Run `npm run type-check` locally
4. Check for TypeScript errors
5. Verify Node.js version matches `.nvmrc`

### Runtime Errors
1. Check Vercel function logs
2. Verify MongoDB connection string
3. Check SMTP credentials
4. Verify Cloudinary URL
5. Check browser console for client-side errors

### Performance Issues
1. Check bundle sizes
2. Verify image optimization
3. Review Core Web Vitals
4. Check API response times
5. Verify caching is working

## Rollback Plan

If deployment fails:
1. Go to Vercel Dashboard → Deployments
2. Find last successful deployment
3. Click "..." → "Promote to Production"

## Environment-Specific Notes

### Production
- All environment variables must be set
- Use production MongoDB database
- Use production SMTP service
- Enable all security headers
- Monitor error rates

### Preview
- Can use staging environment variables
- Good for testing before production
- Automatically created for PRs

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Review Next.js build output
3. Verify environment variables
4. Check MongoDB connection
5. Review [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed guide

---

**Last Updated:** December 2024
**Next.js Version:** 16.0.10
**Node.js Version:** 20 (as specified in .nvmrc)

