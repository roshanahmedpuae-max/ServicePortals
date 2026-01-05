import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import EmployeeNotificationModel from "@/lib/models/EmployeeNotification";

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request, ["employee"]);
    await connectToDatabase();

    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50", 10);

    const notifications = await EmployeeNotificationModel.find({
      employeeId: user.id,
      businessUnit: user.businessUnit,
    })
      .sort({ sentAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json(notifications.map((n: any) => ({
      id: n._id,
      type: n.type,
      title: n.title,
      message: n.message,
      relatedId: n.relatedId,
      sentAt: n.sentAt,
      readAt: n.readAt,
    })));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request, ["employee"]);
    const body = await request.json().catch(() => null);

    if (!body?.id) {
      return NextResponse.json({ error: "Notification id is required" }, { status: 400 });
    }

    await connectToDatabase();

    const notification = await EmployeeNotificationModel.findOne({
      _id: body.id,
      employeeId: user.id,
      businessUnit: user.businessUnit,
    });

    if (!notification) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (body.action === "read" && !notification.readAt) {
      notification.readAt = new Date();
      await notification.save();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
