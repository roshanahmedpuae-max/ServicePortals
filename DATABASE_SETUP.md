# 🗄️ Database Connection Setup Guide

This guide helps you verify that your database connection is properly configured with `.env.local`.

## ✅ Quick Verification (3 Steps)

### Step 1: Check `.env.local` File

Create or verify your `.env.local` file in the project root:

```bash
# .env.local
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

**Important:**
- File must be named `.env.local` (not `.env`)
- Place it in the project root directory
- Next.js automatically loads this file
- Never commit `.env.local` to git (it's in `.gitignore`)

### Step 2: Verify Environment Variable is Loaded

The database connection code will automatically:
- ✅ Load `MONGODB_URI` from `.env.local`
- ✅ Validate the URI format
- ✅ Provide helpful error messages if missing

**Check if it's loaded:**
```bash
# In your terminal (project root)
node -e "require('dotenv').config({ path: '.env.local' }); console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Not set')"
```

### Step 3: Test Database Connection

#### Option A: Via API Endpoint (Recommended)

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Visit: `http://localhost:3000/api/test-db`

3. You should see a JSON response with connection status:
   ```json
   {
     "success": true,
     "message": "Database connection successful",
     "connection": {
       "status": "connected",
       "isConnected": true,
       "database": "your-database-name"
     }
   }
   ```

#### Option B: Via Test Script

Run the database test utility:

```bash
# Using tsx (if installed)
npx tsx lib/db-test.ts

# Or using node with ts-node
npx ts-node lib/db-test.ts
```

#### Option C: Test via Any API Route

Any API route that uses `connectToDatabase()` will verify the connection. Try:
- `GET /api/options?bu=PrintersUAE` (no auth required)
- `POST /api/auth/admin` (requires credentials)

## 🔍 Connection Details

### How It Works

1. **Environment Loading**: Next.js automatically loads `.env.local` in development
2. **Connection Caching**: Uses global cache to prevent multiple connections (important for serverless)
3. **Error Handling**: Provides clear error messages if connection fails
4. **Auto-Reconnect**: Handles connection drops gracefully

### Connection Options

The connection uses these optimized settings:
- **Server Selection Timeout**: 10 seconds
- **Socket Timeout**: 45 seconds
- **Connection Pool**: 1-10 connections
- **Retry Writes**: Enabled
- **Retry Reads**: Enabled

## 🐛 Troubleshooting

### Error: "MONGODB_URI is not set"

**Solution:**
1. Create `.env.local` in project root
2. Add: `MONGODB_URI=your-connection-string`
3. Restart your development server
4. Make sure the file is named exactly `.env.local` (not `.env`)

### Error: "Database connection failed"

**Check:**
1. ✅ MongoDB URI format is correct
   - Should start with `mongodb://` or `mongodb+srv://`
   - Check for typos in username/password
   
2. ✅ MongoDB Atlas Network Access
   - Go to MongoDB Atlas → Network Access
   - Add your IP address (or `0.0.0.0/0` for all IPs - less secure)
   - For Vercel, allow all IPs or add Vercel's IP ranges

3. ✅ Credentials are correct
   - Verify username and password in connection string
   - Check if password has special characters (may need URL encoding)

4. ✅ Database exists
   - Verify database name in connection string exists
   - Default database name is usually in the connection string

5. ✅ Internet connection
   - Test: `ping cluster.mongodb.net` (replace with your cluster)

### Error: "Invalid MONGODB_URI format"

**Solution:**
- Connection string must start with `mongodb://` or `mongodb+srv://`
- Check for extra spaces or characters
- Verify the entire string is on one line

### Connection Works Locally but Fails on Vercel

**Solution:**
1. Add `MONGODB_URI` in Vercel Dashboard:
   - Go to: Settings → Environment Variables
   - Add for **Production** environment
   - Redeploy after adding

2. Check MongoDB Atlas Network Access:
   - Allow `0.0.0.0/0` (all IPs) for Vercel deployments
   - Or add Vercel's specific IP ranges

## 📝 Example `.env.local` File

```bash
# MongoDB Connection
# Get this from MongoDB Atlas → Connect → Connect your application
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/serviceorder?retryWrites=true&w=majority

# Authentication Secret
AUTH_SECRET=your-strong-random-secret-key-minimum-32-characters

# Cloudinary (for image uploads)
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name

# SMTP Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ADMIN_EMAIL=admin@printersuae.com
```

## 🔒 Security Notes

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Use strong passwords** - For both MongoDB and AUTH_SECRET
3. **Limit network access** - In production, restrict MongoDB Atlas IP whitelist
4. **Rotate credentials** - Change passwords periodically
5. **Use environment-specific configs**:
   - `.env.local` - Local development
   - Vercel Dashboard - Production environment variables

## ✅ Verification Checklist

- [ ] `.env.local` file exists in project root
- [ ] `MONGODB_URI` is set in `.env.local`
- [ ] Connection string format is correct (`mongodb://` or `mongodb+srv://`)
- [ ] MongoDB Atlas network access allows your IP
- [ ] Test endpoint `/api/test-db` returns success
- [ ] Development server starts without database errors
- [ ] API routes that use database work correctly

## 🚀 Next Steps

Once database connection is verified:
1. ✅ Test API routes that use database
2. ✅ Verify data can be read/written
3. ✅ Check connection logs in development
4. ✅ Set up environment variables in Vercel for production

## 📚 Additional Resources

- [MongoDB Connection String Guide](https://www.mongodb.com/docs/manual/reference/connection-string/)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [MongoDB Atlas Network Access](https://www.mongodb.com/docs/atlas/security/ip-access-list/)

---

**Need Help?** Check the error message - it includes specific troubleshooting steps!

