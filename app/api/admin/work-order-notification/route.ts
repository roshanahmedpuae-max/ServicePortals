import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import WorkOrderNotificationModel from "@/lib/models/WorkOrderNotification";

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    const body = await request.json().catch(() => null);

    if (!body?.id || !body?.action) {
      return NextResponse.json({ error: "Work order notification id and action are required" }, { status: 400 });
    }

    const action = body.action as "read" | "view";
    await connectToDatabase();

    if (action === "read" || action === "view") {
      // Mark notification as read
      await WorkOrderNotificationModel.updateMany(
        {
          _id: body.id,
          businessUnit: user.businessUnit,
          readAt: null,
        },
        {
          readAt: new Date(),
          readByAdminId: user.id,
        }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
