# Vercel Deployment Guide

This guide will help you deploy the Service Order Form application to Vercel.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. GitHub/GitLab/Bitbucket repository with your code
3. MongoDB connection string
4. All required environment variables

## Step 1: Prepare Your Repository

Ensure all changes are committed and pushed to your repository:

```bash
git add .
git commit -m "Optimize for Vercel deployment"
git push origin main
```

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. Vercel will auto-detect Next.js
4. Configure environment variables (see Step 3)
5. Click "Deploy"

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# For production deployment
vercel --prod
```

## Step 3: Configure Environment Variables

In your Vercel project settings, add these environment variables:

### Required Variables

```
MONGODB_URI=your_mongodb_connection_string
AUTH_SECRET=your_strong_random_secret_key
CLOUDINARY_URL=your_cloudinary_url
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
ADMIN_EMAIL=admin@printersuae.com
```

### How to Set Environment Variables

1. Go to your project on Vercel
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable for:
   - **Production**
   - **Preview** (optional)
   - **Development** (optional)

## Step 4: Verify Deployment

After deployment:

1. Check the deployment logs for any errors
2. Visit your deployment URL
3. Test the application functionality:
   - Employee login
   - Form submission
   - PDF generation
   - Email sending

## Step 5: Configure Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. SSL certificate will be automatically provisioned

## Optimization Features Enabled

The following optimizations are configured:

✅ **Compression**: Gzip/Brotli compression enabled
✅ **Image Optimization**: AVIF and WebP formats
✅ **Security Headers**: XSS protection, frame options, content type
✅ **Function Timeouts**: 30s for API routes
✅ **React Strict Mode**: Enabled for better development experience
✅ **Bundle Optimization**: Webpack optimizations for smaller bundles

## Troubleshooting

### Build Fails

- Check build logs in Vercel dashboard
- Ensure all environment variables are set
- Verify `package.json` has correct build script
- Check for TypeScript errors: `npm run type-check`

### API Routes Timeout

- API routes have 30s timeout (configured in `vercel.json`)
- For longer operations, consider using background jobs
- Check MongoDB connection string is correct

### Database Connection Issues

- Verify `MONGODB_URI` is set correctly
- Ensure MongoDB allows connections from Vercel IPs
- Check MongoDB Atlas network access settings

### Environment Variables Not Working

- Ensure variables are set for the correct environment (Production/Preview)
- Redeploy after adding new variables
- Check variable names match exactly (case-sensitive)

## Monitoring

- **Analytics**: Enable Vercel Analytics in project settings
- **Logs**: View real-time logs in Vercel dashboard
- **Performance**: Monitor Core Web Vitals in Analytics

## Continuous Deployment

Vercel automatically deploys:
- **Production**: Pushes to main/master branch
- **Preview**: Pull requests and other branches

## Support

For issues:
1. Check Vercel deployment logs
2. Review Next.js build output
3. Check environment variables
4. Contact Vercel support if needed

