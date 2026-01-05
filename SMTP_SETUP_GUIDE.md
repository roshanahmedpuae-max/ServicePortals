# SMTP Email Configuration Guide

This guide will help you configure SMTP (Simple Mail Transfer Protocol) for sending emails from the application, including password reset OTPs.

## Environment Variables Required

Add the following variables to your `.env.local` file (create it if it doesn't exist):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## Setup Instructions for Different Email Providers

### Gmail (Recommended for Development)

1. **Enable 2-Factor Authentication** on your Google account:
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Enable "2-Step Verification"

2. **Generate an App Password**:
   - Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
   - Select "Mail" and your device
   - Click "Generate"
   - Copy the 16-character password (no spaces)

3. **Configure `.env.local`**:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-character-app-password
   ```

**Note**: Use the App Password, NOT your regular Gmail password.

### Outlook/Hotmail

1. **Enable 2-Factor Authentication** on your Microsoft account

2. **Generate an App Password**:
   - Go to [Microsoft Account Security](https://account.microsoft.com/security)
   - Click "Advanced security options"
   - Under "App passwords", create a new app password

3. **Configure `.env.local`**:
   ```env
   SMTP_HOST=smtp-mail.outlook.com
   SMTP_PORT=587
   SMTP_USER=your-email@outlook.com
   SMTP_PASS=your-app-password
   ```

### Custom SMTP Server

For custom SMTP servers (like SendGrid, Mailgun, AWS SES, etc.):

```env
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587  # or 465 for SSL
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
```

#### Popular SMTP Services:

**SendGrid**:
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

**Mailgun**:
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your-mailgun-username
SMTP_PASS=your-mailgun-password
```

**AWS SES**:
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com  # Replace with your region
SMTP_PORT=587
SMTP_USER=your-aws-smtp-username
SMTP_PASS=your-aws-smtp-password
```

## Port Configuration

- **Port 587**: TLS/STARTTLS (recommended, most common)
- **Port 465**: SSL (secure, but less common)
- **Port 25**: Usually blocked by ISPs, not recommended

The application automatically uses `secure: true` for port 465 and `secure: false` for other ports.

## Testing Your Configuration

After configuring SMTP:

1. **Restart your development server**:
   ```bash
   npm run dev
   ```

2. **Test password reset**:
   - Go to the customer portal
   - Click "Reset password"
   - Check your email inbox (and spam folder)

3. **Check server logs**:
   - Look for "Email sent successfully" messages
   - Check for any SMTP connection errors

## Troubleshooting

### Email Not Received

1. **Check spam/junk folder** - Emails might be filtered

2. **Verify SMTP credentials**:
   - Ensure `SMTP_USER` and `SMTP_PASS` are correct
   - For Gmail, use App Password, not regular password
   - Check for extra spaces in `.env.local`

3. **Check server logs**:
   - Look for error messages in the console
   - Common errors:
     - "Invalid login" - Wrong credentials
     - "Connection timeout" - Wrong host/port or firewall issue
     - "SMTP credentials not configured" - Missing env variables

4. **Test SMTP connection**:
   - The application now verifies SMTP connection before sending
   - Errors will be logged to help identify issues

### Common Errors

**"SMTP credentials are not configured"**
- Add `SMTP_USER` and `SMTP_PASS` to `.env.local`
- Restart the server after adding variables

**"Invalid login"**
- For Gmail: Make sure you're using an App Password, not your regular password
- Check that 2FA is enabled
- Verify credentials are correct

**"Connection timeout"**
- Check firewall settings
- Verify `SMTP_HOST` and `SMTP_PORT` are correct
- Try port 465 instead of 587 (or vice versa)

**"Email sent but not received"**
- Check spam folder
- Verify recipient email address is correct
- Some email providers have rate limits

## Security Best Practices

1. **Never commit `.env.local` to version control**
   - It's already in `.gitignore`
   - Keep credentials secret

2. **Use App Passwords** instead of main account passwords

3. **Rotate passwords regularly**

4. **Use environment-specific credentials**:
   - Different credentials for development and production
   - Use secure secret management in production (Vercel, AWS Secrets Manager, etc.)

## Production Deployment

For production (Vercel, AWS, etc.):

1. **Add environment variables** in your hosting platform's dashboard
2. **Use production SMTP service** (SendGrid, Mailgun, AWS SES recommended)
3. **Set up proper DNS records** (SPF, DKIM) for better deliverability
4. **Monitor email delivery** using your SMTP provider's dashboard

## Example `.env.local` File

```env
# Database
MONGODB_URI=your-mongodb-connection-string

# Auth
AUTH_SECRET=your-auth-secret-key

# SMTP Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Cloudinary (for file uploads)
CLOUDINARY_URL=your-cloudinary-url
```

## Need Help?

If you continue to experience issues:

1. Check the server console for detailed error messages
2. Verify your SMTP provider's documentation
3. Test with a different email provider
4. Ensure your network/firewall allows SMTP connections
