# Vercel Deployment Checklist

## Pre-Deployment Verification

### ✅ Build Status
- [x] Production build completes successfully (`npm run build`)
- [x] TypeScript compilation passes (`npm run type-check`)
- [x] No linter errors

### ✅ New Features Implemented
- [x] Puppeteer-based PDF generation (replaces @react-pdf/renderer)
- [x] Form submissions now save to database
- [x] Job Logs tab added to admin portal
- [x] Auto-refresh session tokens (1-day lifetime, 12-hour refresh threshold)
- [x] Enhanced 401 error handling across all portals

### ✅ Configuration Files
- [x] `vercel.json` - Updated with Puppeteer memory limits
- [x] `next.config.mjs` - Webpack optimizations configured
- [x] `package.json` - All dependencies installed

## Environment Variables Required

Ensure these are set in Vercel Dashboard → Settings → Environment Variables:

### Required Variables
```
MONGODB_URI=mongodb+srv://...
AUTH_SECRET=your-secret-key-here
```

### Optional (for email functionality)
```
SMTP_USER=your-smtp-email@example.com
SMTP_PASS=your-smtp-password
SMTP_HOST=smtp.example.com
SMTP_PORT=587
ADMIN_EMAIL=admin@example.com
```

### Optional (for Cloudinary image uploads)
```
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## Vercel Function Configuration

The following routes have special memory/timeout settings in `vercel.json`:

- **PDF Generation Routes** (1024MB memory, 60s timeout):
  - `/api/generate-pdf`
  - `/api/submit-order`

- **Auth Refresh Route** (512MB memory, 30s timeout):
  - `/api/auth/refresh`

- **Cron Jobs** (60s timeout):
  - `/api/cron/assets-reminders`

## Deployment Steps

1. **Commit all changes**
   ```bash
   git add .
   git commit -m "feat: Add Puppeteer PDF generation, Job Logs, and auto-refresh sessions"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Push to main branch (auto-deploys if connected)
   - OR manually deploy from Vercel Dashboard

3. **Verify Deployment**
   - Check build logs in Vercel Dashboard
   - Test PDF generation: Submit a form and verify PDF downloads
   - Test session refresh: Login and use app for >12 hours, verify no unauthorized errors
   - Test Job Logs: Complete a work order and verify it appears in Job Logs tab

## Post-Deployment Testing

### Admin Portal
- [ ] Login works
- [ ] Job Logs tab appears and shows completed work orders
- [ ] PDF preview generates correctly
- [ ] Form submission saves to database
- [ ] Session auto-refreshes (check after 12+ hours)

### Employee Portal
- [ ] Login works
- [ ] Work order submission works
- [ ] Leave/Overtime requests work
- [ ] No "Unauthorized" errors during normal use
- [ ] Session auto-refreshes

### Customer Portal
- [ ] Login/Registration works
- [ ] Ticket creation works
- [ ] No "Unauthorized" errors during normal use
- [ ] Session auto-refreshes

## Known Issues / Notes

1. **@react-pdf/renderer still in package.json**: 
   - Old PDF generation files (`lib/pdf-template.tsx`, `lib/pdf/generateServiceOrderPDF.ts`) are still present but not used
   - Can be removed in future cleanup to reduce bundle size
   - Currently kept for backward compatibility

2. **Mongoose Index Warnings**: 
   - Duplicate index warnings during build are non-critical
   - Can be cleaned up later by removing redundant index definitions

3. **Session Token Lifetime**: 
   - Changed from 7 days to 1 day
   - Tokens auto-refresh when >12 hours old
   - Users only need to re-login if inactive for >1 day

## Rollback Plan

If issues occur after deployment:

1. **Revert to previous deployment** in Vercel Dashboard
2. **Or rollback git commit** and redeploy:
   ```bash
   git revert HEAD
   git push origin main
   ```

## Support

If deployment fails:
- Check Vercel build logs for specific errors
- Verify all environment variables are set
- Ensure Node.js version matches (>=18.0.0)
- Check function memory limits if Puppeteer fails
