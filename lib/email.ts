import nodemailer from "nodemailer";
import type { BusinessUnit } from "@/lib/types";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  /**
   * Optional business unit so we can route through BU-specific SMTP accounts.
   * If omitted, global SMTP_* env vars are used as a fallback.
   */
  businessUnit?: BusinessUnit;
  attachments?: {
    filename: string;
    content: Buffer;
    contentType: string;
  }[];
}

function getSmtpEnvKey(base: "SMTP_HOST" | "SMTP_PORT" | "SMTP_USER" | "SMTP_PASS", bu?: BusinessUnit): string {
  if (!bu) return base;
  if (bu === "PrintersUAE") return `${base}_PRINTERS`;
  if (bu === "G3") return `${base}_G3`;
  if (bu === "IT") return `${base}_IT`;
  return base;
}

function getSmtpConfig(bu?: BusinessUnit) {
  const hostKey = getSmtpEnvKey("SMTP_HOST", bu);
  const portKey = getSmtpEnvKey("SMTP_PORT", bu);
  const userKey = getSmtpEnvKey("SMTP_USER", bu);
  const passKey = getSmtpEnvKey("SMTP_PASS", bu);

  const host = process.env[hostKey] || process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env[portKey] || process.env.SMTP_PORT || "587");
  const user = process.env[userKey] || process.env.SMTP_USER;
  const pass = process.env[passKey] || process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error(
      `SMTP credentials are not configured for ${
        bu ? `business unit ${bu}` : "default"
      }. Please set ${userKey} and ${passKey} (or global SMTP_USER/SMTP_PASS) environment variables.`
    );
  }

  return { host, port, user, pass };
}

function getFromName(bu?: BusinessUnit): string {
  if (bu === "G3") return "G3 Facility Service";
  if (bu === "IT") return "IT Service";
  return "PrintersUAE Service";
}

// Create reusable transporter using SMTP (per business unit if provided)
function createTransporter(businessUnit?: BusinessUnit) {
  const { host, port, user, pass } = getSmtpConfig(businessUnit);

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user,
      pass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const transporter = createTransporter(options.businessUnit);

  const fromUser =
    (options.businessUnit &&
      process.env[getSmtpEnvKey("SMTP_USER", options.businessUnit)]) ||
    process.env.SMTP_USER;

  const mailOptions = {
    from: `"${getFromName(options.businessUnit)}" <${fromUser}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    attachments: options.attachments,
  };

  try {
    await transporter.verify();
  } catch (error) {
    console.error("SMTP connection verification failed:", error);
    throw new Error(
      `SMTP connection failed for ${
        options.businessUnit ?? "default"
      }: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  const result = await transporter.sendMail(mailOptions);

  if (!result.messageId) {
    throw new Error("Email was not sent successfully");
  }

  console.log(
    `Email sent successfully via ${
      options.businessUnit ?? "default"
    } SMTP. Message ID: ${result.messageId}`
  );
}

// Generate HTML email template
export function generateEmailHTML(data: {
  requesterName: string;
  orderDateTime: string;
  priorityLevel: string;
  isAdmin?: boolean;
}): string {
  const formattedDate = new Date(data.orderDateTime).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const priorityColors: Record<string, string> = {
    Normal: "#10b981",
    High: "#f59e0b",
    Urgent: "#ef4444",
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f7;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f7; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); padding: 30px 40px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Work Order ${data.isAdmin ? "Received" : "Confirmation"}</h1>
                  <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">PrintersUAE Service</p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                    ${data.isAdmin
                      ? `A new service order has been submitted by <strong>${data.requesterName}</strong>.`
                      : `Dear <strong>${data.requesterName}</strong>,<br><br>Thank you for submitting your service order. We have received your request and will process it shortly.`
                    }
                  </p>

                  <!-- Order Details Box -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fc; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <tr>
                      <td style="padding: 20px;">
                        <h3 style="margin: 0 0 15px; color: #1a1a2e; font-size: 16px;">Order Details</h3>
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Order Date:</td>
                            <td style="padding: 8px 0; color: #1a1a2e; font-size: 14px; font-weight: 500;">${formattedDate}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Priority:</td>
                            <td style="padding: 8px 0;">
                              <span style="display: inline-block; padding: 4px 12px; background-color: ${priorityColors[data.priorityLevel]}; color: #ffffff; border-radius: 20px; font-size: 12px; font-weight: 600;">${data.priorityLevel}</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 20px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                    ${data.isAdmin
                      ? "Please review the attached PDF for complete order details."
                      : "Please find attached the complete work order PDF for your records. A technician will contact you shortly to confirm the service appointment."
                    }
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f9fc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0; color: #64748b; font-size: 12px;">
                    © ${new Date().getFullYear()} PrintersUAE. All rights reserved.
                  </p>
                  <p style="margin: 10px 0 0; color: #94a3b8; font-size: 11px;">
                    This is an automated email. Please do not reply directly.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}









