# Service Order Form - PrintersUAE

A professional service order form built with Next.js that generates PDF work orders and sends them via email.

## Features

- **Complete Service Order Form** with all required fields
- **Digital Signature Capture** for customer approval
- **PDF Generation** matching the official work order layout
- **Email Delivery** to both customer and admin
- **Form Validation** with real-time error feedback
- **Responsive Design** works on desktop and mobile

## Getting Started

### Prerequisites

- Node.js 18+ installed
- SMTP email credentials (Gmail, Outlook, or custom SMTP server)
- MongoDB connection string
- Cloudinary account (for photo uploads)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env.local` (create if missing):
```env
# MongoDB
MONGODB_URI=mongodb+srv://serviceportals52_db_user:sJxHoRmB3KrtgmbU@serviceportals.af83wcm.mongodb.net/?appName=Serviceportals

# Auth
AUTH_SECRET=generate-a-strong-secret

# Cloudinary (used for work-order photos)
CLOUDINARY_URL=cloudinary://918819468594936:1cFnudWByPDK4m3OayN9RtBItUs@dxcb27m9q

# Email (existing)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ADMIN_EMAIL=admin@printersuae.com
```

   **For Gmail users:**
   1. Enable 2-Factor Authentication on your Google account
   2. Go to Google Account > Security > 2-Step Verification > App passwords
   3. Generate a new App Password for "Mail"
   4. Use that password in `SMTP_PASS` (NOT your regular Gmail password)

   **For detailed SMTP setup instructions, see [SMTP_SETUP_GUIDE.md](./SMTP_SETUP_GUIDE.md)**

   **For Gmail users:**
   1. Enable 2-Factor Authentication on your Google account
   2. Go to Google Account > Security > 2-Step Verification > App passwords
   3. Generate a new App Password for "Mail"
   4. Use that password in `SMTP_PASS`

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Form Sections

### A. Customer Details
- Customer Name (required)
- Location Address (required)
- Phone (required, 7-15 digits)
- Email (required, valid email format)

### B. Work Order Details
- Order Date and Time (auto-filled)

### C. Assignment & Billing
- Work Assigned To (technician dropdown)

### D. Work Descriptions
- Request Description (required)
- Description of Work Completed
- Findings

### E. Approval & Sign-Off
- Work Completed By (technician)
- Completion Date
- Customer Name
- Customer Signature (digital)
- Approval Date

## PDF Output

The generated PDF includes:
- Company header
- All customer and work order details
- Work descriptions
- Customer signature image
- Completion and approval dates

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **PDF Generation**: @react-pdf/renderer
- **Digital Signature**: react-signature-canvas
- **Form Handling**: React Hook Form + Zod
- **Email**: Nodemailer

## Production Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes |
| `AUTH_SECRET` | Secret for signing auth tokens | Yes |
| `CLOUDINARY_URL` | Cloudinary credentials URL | Yes |
| `SMTP_HOST` | SMTP server hostname | Yes |
| `SMTP_PORT` | SMTP server port (usually 587) | Yes |
| `SMTP_USER` | SMTP username/email | Yes |
| `SMTP_PASS` | SMTP password/app password | Yes |
| `ADMIN_EMAIL` | Admin email for notifications | No (defaults to SMTP_USER) |
| `COMPANY_NAME` | Company name for PDF header | No |

## License

© 2024 PrintersUAE. All rights reserved.



