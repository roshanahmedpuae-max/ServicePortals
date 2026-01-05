import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import TicketNotificationModel from "@/lib/models/TicketNotification";

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    const body = await request.json().catch(() => null);

    if (!body?.id) {
      return NextResponse.json({ error: "Notification id is required" }, { status: 400 });
    }

    await connectToDatabase();

    const notification = await TicketNotificationModel.findOne({
      _id: body.id,
      businessUnit: user.businessUnit,
    });

    if (!notification) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (body.action === "read" && !notification.readAt) {
      notification.readAt = new Date();
      notification.readByAdminId = user.id;
      await notification.save();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = message === "Unauthorized" ? 401 : 500;
    console.error("POST /api/admin/ticket-notification failed", error);
    return NextResponse.json({ error: message }, { status });
  }
}
