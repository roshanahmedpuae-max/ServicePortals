import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import CustomerUserModel from "@/lib/models/CustomerUser";
import { hashPassword } from "@/lib/models/utils";
import { sendEmail } from "@/lib/email";
import { BusinessUnit } from "@/lib/types";

type Action = "request" | "confirm";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { action, email, businessUnit, otp, newPassword } = body as {
    action?: Action;
    email?: string;
    businessUnit?: BusinessUnit;
    otp?: string;
    newPassword?: string;
  };

  if (!action || !email || !businessUnit) {
    return NextResponse.json(
      { error: "action, email and business unit are required" },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const normalizedEmail = String(email).toLowerCase().trim();
  const user = await CustomerUserModel.findOne({
    email: normalizedEmail,
    businessUnit,
  });

  if (!user) {
    // Do not leak whether the email exists
    return NextResponse.json(
      { success: true, message: "If this email exists, an OTP has been sent." },
      { status: 200 }
    );
  }

  if (action === "request") {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    (user as any).resetOtp = code;
    (user as any).resetOtpExpiresAt = expiresAt;
    await user.save();

    const html = `
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
                <tr>
                  <td style="background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); padding: 30px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Password Reset OTP</h1>
                    <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Customer Portal</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                      Dear <strong>${user.username}</strong>,
                    </p>
                    <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                      Your one-time password (OTP) for resetting your customer portal password is:
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                      <p style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 4px; margin: 0;">${code}</p>
                    </div>
                    <p style="margin: 20px 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                      This code will expire in <strong>15 minutes</strong>.
                    </p>
                    <p style="margin: 20px 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                      If you did not request this password reset, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
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

    try {
      // Validate SMTP configuration
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error("SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS environment variables.");
        return NextResponse.json(
          { error: "Email service is not configured. Please contact support." },
          { status: 500 }
        );
      }

      await sendEmail({
        to: user.email,
        subject: "Customer Portal Password Reset OTP",
        html,
        businessUnit,
      });
      
      console.log(`Password reset OTP sent successfully to ${user.email}`);
    } catch (error) {
      console.error("Failed to send password reset email:", error);
      // Return error to help with debugging, but don't expose sensitive details
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json(
        { error: `Failed to send email: ${errorMessage}. Please check SMTP configuration.` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  }

  if (action === "confirm") {
    if (!otp || !newPassword) {
      return NextResponse.json(
        { error: "OTP and newPassword are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const currentOtp = (user as any).resetOtp as string | undefined;
    const expiresAt = (user as any).resetOtpExpiresAt as Date | undefined;

    if (!currentOtp || !expiresAt) {
      return NextResponse.json({ error: "OTP not requested or already used" }, { status: 400 });
    }

    const now = new Date();
    if (expiresAt.getTime() < now.getTime()) {
      return NextResponse.json({ error: "OTP has expired" }, { status: 400 });
    }

    if (String(currentOtp).trim() !== String(otp).trim()) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    user.passwordHash = hashPassword(newPassword);
    (user as any).resetOtp = undefined;
    (user as any).resetOtpExpiresAt = undefined;
    await user.save();

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}

