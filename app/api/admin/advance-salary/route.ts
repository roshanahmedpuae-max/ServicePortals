import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import AdvanceSalaryModel from "@/lib/models/AdvanceSalary";
import AdvanceSalaryNotificationModel from "@/lib/models/AdvanceSalaryNotification";
import EmployeeNotificationModel from "@/lib/models/EmployeeNotification";

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");

    const query: Record<string, unknown> = {
      businessUnit: user.businessUnit,
    };

    if (employeeId) {
      query.employeeId = employeeId;
    }

    const advances = await AdvanceSalaryModel.find(query)
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
    const user = requireAuth(request, ["admin"]);
    const body = await request.json().catch(() => null);

    if (!body?.id || !body?.action) {
      return NextResponse.json({ error: "Advance salary id and action are required" }, { status: 400 });
    }

    const action = body.action as "approve" | "reject" | "view";
    await connectToDatabase();

    const advance = await AdvanceSalaryModel.findOne({
      _id: body.id,
      businessUnit: user.businessUnit,
    });

    if (!advance) {
      return NextResponse.json({ error: "Advance salary request not found" }, { status: 404 });
    }

    if (action === "view") {
      // Just mark notification as read
      await AdvanceSalaryNotificationModel.updateMany(
        {
          advanceSalaryId: advance._id,
          businessUnit: user.businessUnit,
          readAt: null,
        },
        {
          readAt: new Date(),
          readByAdminId: user.id,
        }
      );
      const obj = advance.toObject() as any;
      return NextResponse.json({
        id: obj._id,
        employeeId: obj.employeeId,
        employeeName: obj.employeeName,
        businessUnit: obj.businessUnit,
        amount: obj.amount,
        reason: obj.reason,
        requestedDate: obj.requestedDate,
        status: obj.status,
        approvedByAdminId: obj.approvedByAdminId,
        approvedAt: obj.approvedAt ? new Date(obj.approvedAt).toISOString() : undefined,
        rejectedByAdminId: obj.rejectedByAdminId,
        rejectedAt: obj.rejectedAt ? new Date(obj.rejectedAt).toISOString() : undefined,
        rejectionReason: obj.rejectionReason,
        approvalMessage: obj.approvalMessage,
        createdAt: obj.createdAt ? new Date(obj.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: obj.updatedAt ? new Date(obj.updatedAt).toISOString() : new Date().toISOString(),
      });
    }

    if (action === "approve") {
      const approvalMessage = (body.approvalMessage as string | undefined)?.trim() ?? "";
      if (approvalMessage.length > 2000) {
        return NextResponse.json({ error: "Approval message is too long" }, { status: 400 });
      }

      advance.status = "Approved";
      advance.approvedByAdminId = user.id;
      advance.approvedAt = new Date();
      if (approvalMessage) {
        advance.approvalMessage = approvalMessage;
      }
      advance.rejectedByAdminId = undefined;
      advance.rejectedAt = undefined;
      advance.rejectionReason = undefined;

      // Create notification for employee
      await EmployeeNotificationModel.create({
        employeeId: advance.employeeId,
        businessUnit: user.businessUnit,
        type: "payroll",
        title: "Advance Salary Approved",
        message: `Your advance salary request of ${advance.amount.toFixed(2)} has been approved.${approvalMessage ? ` Message: ${approvalMessage}` : ""}`,
        relatedId: advance._id,
        createdByAdminId: user.id,
      });
    } else if (action === "reject") {
      const rejectionReason = (body.rejectionReason as string | undefined)?.trim() ?? "";
      if (!rejectionReason) {
        return NextResponse.json(
          { error: "Rejection reason is required when rejecting an advance salary request" },
          { status: 400 }
        );
      }
      if (rejectionReason.length > 2000) {
        return NextResponse.json({ error: "Rejection reason is too long" }, { status: 400 });
      }

      advance.status = "Rejected";
      advance.rejectedByAdminId = user.id;
      advance.rejectedAt = new Date();
      advance.rejectionReason = rejectionReason;
      advance.approvedByAdminId = undefined;
      advance.approvedAt = undefined;
      advance.approvalMessage = undefined;

      // Create notification for employee
      await EmployeeNotificationModel.create({
        employeeId: advance.employeeId,
        businessUnit: user.businessUnit,
        type: "payroll",
        title: "Advance Salary Rejected",
        message: `Your advance salary request of ${advance.amount.toFixed(2)} has been rejected. Reason: ${rejectionReason}`,
        relatedId: advance._id,
        createdByAdminId: user.id,
      });
    }

    await advance.save();

    // Mark related notifications as read
    await AdvanceSalaryNotificationModel.updateMany(
      {
        advanceSalaryId: advance._id,
        businessUnit: user.businessUnit,
        readAt: null,
      },
      {
        readAt: new Date(),
        readByAdminId: user.id,
      }
    );

    const obj = advance.toObject() as any;
    return NextResponse.json({
      id: obj._id,
      employeeId: obj.employeeId,
      employeeName: obj.employeeName,
      businessUnit: obj.businessUnit,
      amount: obj.amount,
      reason: obj.reason,
      requestedDate: obj.requestedDate,
      status: obj.status,
      approvedByAdminId: obj.approvedByAdminId,
      approvedAt: obj.approvedAt ? new Date(obj.approvedAt).toISOString() : undefined,
      rejectedByAdminId: obj.rejectedByAdminId,
      rejectedAt: obj.rejectedAt ? new Date(obj.rejectedAt).toISOString() : undefined,
      rejectionReason: obj.rejectionReason,
      approvalMessage: obj.approvalMessage,
      createdAt: obj.createdAt ? new Date(obj.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: obj.updatedAt ? new Date(obj.updatedAt).toISOString() : new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
