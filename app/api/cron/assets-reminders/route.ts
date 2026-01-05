import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { AssetDateModel, AssetReminderModel } from "@/lib/models/Assets";
import AdminModel from "@/lib/models/Admin";
import { sendEmail } from "@/lib/email";

type ReminderConfig = {
  categoryKey: "vehicles" | "registrations" | "rental_machines";
  dateType: string;
  offsets: number[];
  overdueEscalationEveryDays?: number;
  subject: string;
};

const REMINDER_CONFIGS: ReminderConfig[] = [
  {
    categoryKey: "vehicles",
    dateType: "registration_expiry",
    offsets: [60, 30, 7, 2],
    overdueEscalationEveryDays: 1,
    subject: "Vehicle Registration Expiry Reminder",
  },
  {
    categoryKey: "vehicles",
    dateType: "insurance_expiry",
    offsets: [45, 15, 3, 2],
    overdueEscalationEveryDays: 1,
    subject: "Vehicle Insurance Expiry Reminder",
  },
  {
    categoryKey: "vehicles",
    dateType: "next_service_date",
    offsets: [14, 3, 2],
    subject: "Vehicle Service Due Reminder",
  },
  {
    categoryKey: "registrations",
    dateType: "registration_expiry",
    offsets: [90, 60, 30, 15, 7, 2],
    overdueEscalationEveryDays: 3,
    subject: "Company Registration / License Expiry Reminder",
  },
  {
    categoryKey: "rental_machines",
    dateType: "rental_end",
    offsets: [5],
    overdueEscalationEveryDays: 1,
    subject: "Rental Machine End Date Reminder",
  },
];

export async function GET(_request: NextRequest) {
  try {
    await connectToDatabase();

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    for (const config of REMINDER_CONFIGS) {
      const maxOffset = Math.max(...config.offsets);
      const horizon = new Date(startOfToday);
      horizon.setDate(horizon.getDate() + maxOffset);

      const upcomingDates = await AssetDateModel.find({
        categoryKey: config.categoryKey,
        dateType: config.dateType,
        status: "upcoming",
        dateValue: { $gte: startOfToday, $lte: horizon },
      }).limit(2000);

      for (const assetDate of upcomingDates) {
        const dateValue = assetDate.dateValue;
        const diffMs = dateValue.getTime() - startOfToday.getTime();
        const daysUntil = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (!config.offsets.includes(daysUntil)) continue;

        const alreadySent = await AssetReminderModel.exists({
          assetDateId: assetDate._id,
          reminderOffsetDays: daysUntil,
        });
        if (alreadySent) continue;

        if (!assetDate.businessUnit) continue;

        const admins = await AdminModel.find({ businessUnit: assetDate.businessUnit });
        const recipients = admins.map((a) => a.email).filter(Boolean);
        if (recipients.length === 0) continue;

        const formattedDate = assetDate.dateValue.toISOString().slice(0, 10);
        const html = `
          <p>Dear Admin,</p>
          <p>This is a reminder that a <strong>${config.dateType.replace(/_/g, " ")}</strong> is due in <strong>${daysUntil}</strong> day(s).</p>
          <ul>
            <li><strong>Business Unit:</strong> ${assetDate.businessUnit}</li>
            <li><strong>Category:</strong> ${config.categoryKey}</li>
            <li><strong>Asset ID:</strong> ${assetDate.assetId}</li>
            <li><strong>Event Date:</strong> ${formattedDate}</li>
          </ul>
          <p>Please log in to the admin portal and review the relevant asset.</p>
        `;

        for (const to of recipients) {
          await sendEmail({
            to,
            subject: config.subject,
            html,
            businessUnit: assetDate.businessUnit as any,
          });
        }

        await AssetReminderModel.create({
          assetDateId: assetDate._id,
          reminderOffsetDays: daysUntil,
          sentAt: new Date(),
          sentTo: recipients,
          channel: "email",
          isOverdueEscalation: false,
        });
      }

      if (config.overdueEscalationEveryDays) {
        const overdueDates = await AssetDateModel.find({
          categoryKey: config.categoryKey,
          dateType: config.dateType,
          status: "overdue",
        }).limit(2000);

        for (const assetDate of overdueDates) {
          if (!assetDate.businessUnit) continue;

          const daysOverdue = Math.floor(
            (startOfToday.getTime() - assetDate.dateValue.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysOverdue <= 0 || daysOverdue % config.overdueEscalationEveryDays !== 0) {
            continue;
          }

          const alreadySent = await AssetReminderModel.exists({
            assetDateId: assetDate._id,
            isOverdueEscalation: true,
            reminderOffsetDays: -daysOverdue,
          });
          if (alreadySent) continue;

          const admins = await AdminModel.find({ businessUnit: assetDate.businessUnit });
          const recipients = admins.map((a) => a.email).filter(Boolean);
          if (recipients.length === 0) continue;

          const formattedDate = assetDate.dateValue.toISOString().slice(0, 10);
          const html = `
            <p>Dear Admin,</p>
            <p>The following item is <strong>overdue by ${daysOverdue} day(s)</strong>:</p>
            <ul>
              <li><strong>Business Unit:</strong> ${assetDate.businessUnit}</li>
              <li><strong>Category:</strong> ${config.categoryKey}</li>
              <li><strong>Asset ID:</strong> ${assetDate.assetId}</li>
              <li><strong>Event Date:</strong> ${formattedDate}</li>
            </ul>
            <p>Please take immediate action in the admin portal.</p>
          `;

          for (const to of recipients) {
            await sendEmail({
              to,
              subject: `Overdue: ${config.subject}`,
              html,
              businessUnit: assetDate.businessUnit as any,
            });
          }

          await AssetReminderModel.create({
            assetDateId: assetDate._id,
            reminderOffsetDays: -daysOverdue,
            sentAt: new Date(),
            sentTo: recipients,
            channel: "email",
            isOverdueEscalation: true,
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("assets-reminders cron failed", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

