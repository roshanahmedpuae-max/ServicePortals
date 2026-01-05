import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import AdvanceSalaryModel from "@/lib/models/AdvanceSalary";
import AdvanceSalaryNotificationModel from "@/lib/models/AdvanceSalaryNotification";

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request, ["employee"]);
    await connectToDatabase();

    const advances = await AdvanceSalaryModel.find({
      employeeId: user.id,
      businessUnit: user.businessUnit,
    })
      .sort({ requestedDate: -1, createdAt: -1 })
      .lean();

    return NextResponse.json(advances.map((a: any) => ({
      id: a._id,
      employeeId: a.employeeId,
      employeeName: a.employeeName,
      businessUnit: a.businessUnit,
      amount: a.amount,
      reason: a.reason,
      requestedDate: a.requestedDate,
      status: a.status,
      approvedByAdminId: a.approvedByAdminId,
      approvedAt: a.approvedAt ? new Date(a.approvedAt).toISOString() : undefined,
      rejectedByAdminId: a.rejectedByAdminId,
      rejectedAt: a.rejectedAt ? new Date(a.rejectedAt).toISOString() : undefined,
      rejectionReason: a.rejectionReason,
      approvalMessage: a.approvalMessage,
      createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: a.updatedAt ? new Date(a.updatedAt).toISOString() : new Date().toISOString(),
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

    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const amount = typeof body.amount === "number" ? body.amount : parseFloat(body.amount);
    const reason = (body.reason as string | undefined)?.trim() ?? "";
    const requestedDate = (body.requestedDate as string | undefined) || new Date().toISOString().slice(0, 10);

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
    }
    if (!reason || reason.length < 5) {
      return NextResponse.json({ error: "Reason must be at least 5 characters" }, { status: 400 });
    }
    if (reason.length > 2000) {
      return NextResponse.json({ error: "Reason is too long" }, { status: 400 });
    }

    await connectToDatabase();

    const created = await AdvanceSalaryModel.create({
      employeeId: user.id,
      employeeName: user.name,
      businessUnit: user.businessUnit,
      amount,
      reason,
      requestedDate,
      status: "Pending",
    });

    // Create notification for admin
    await AdvanceSalaryNotificationModel.create({
      advanceSalaryId: created._id,
      employeeId: user.id,
      employeeName: user.name,
      businessUnit: user.businessUnit,
      amount,
      requestedDate,
      status: "Pending",
    });

    const obj = created.toObject() as any;
    return NextResponse.json({
      id: obj._id,
      employeeId: obj.employeeId,
      employeeName: obj.employeeName,
      businessUnit: obj.businessUnit,
      amount: obj.amount,
      reason: obj.reason,
      requestedDate: obj.requestedDate,
      status: obj.status,
      createdAt: obj.createdAt ? new Date(obj.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: obj.updatedAt ? new Date(obj.updatedAt).toISOString() : new Date().toISOString(),
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
