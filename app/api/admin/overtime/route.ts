import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import OvertimeRequestModel from "@/lib/models/OvertimeRequest";
import OvertimeNotificationModel from "@/lib/models/OvertimeNotification";
import EmployeeNotificationModel from "@/lib/models/EmployeeNotification";
import { OvertimeRequest } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    await connectToDatabase();

    const status = request.nextUrl.searchParams.get("status");
    const employeeId = request.nextUrl.searchParams.get("employeeId");

    const query: Record<string, unknown> = {
      businessUnit: user.businessUnit,
    };

    if (status && ["Pending", "Approved", "Rejected", "Cancelled"].includes(status)) {
      query.status = status;
    }

    if (employeeId) {
      query.employeeId = employeeId;
    }

    const overtimes = await OvertimeRequestModel.find(query)
      .sort({ date: -1, createdAt: -1 })
      .lean();

    const result: OvertimeRequest[] = overtimes.map((o: any) => ({
      id: o._id,
      employeeId: o.employeeId,
      employeeName: o.employeeName,
      businessUnit: o.businessUnit,
      date: o.date,
      startTime: o.startTime,
      endTime: o.endTime,
      hours: o.hours,
      project: o.project,
      description: o.description,
      status: o.status,
      approvedByAdminId: o.approvedByAdminId,
      approvedAt: o.approvedAt ? new Date(o.approvedAt).toISOString() : undefined,
      rejectedByAdminId: o.rejectedByAdminId,
      rejectedAt: o.rejectedAt ? new Date(o.rejectedAt).toISOString() : undefined,
      rejectionReason: o.rejectionReason,
      approvalMessage: o.approvalMessage,
      createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: o.updatedAt ? new Date(o.updatedAt).toISOString() : new Date().toISOString(),
    }));

    return NextResponse.json(result);
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
      return NextResponse.json({ error: "Overtime id and action are required" }, { status: 400 });
    }

    const action = body.action as "approve" | "reject" | "view";
    if (action === "view") {
      // Just mark notification as read, don't change overtime status
      await OvertimeNotificationModel.updateMany(
        {
          overtimeRequestId: body.id,
          businessUnit: user.businessUnit,
          readAt: null,
        },
        {
          readAt: new Date(),
          readByAdminId: user.id,
        }
      );
      const overtime = await OvertimeRequestModel.findOne({
        _id: body.id,
        businessUnit: user.businessUnit,
      });
      if (!overtime) {
        return NextResponse.json({ error: "Overtime request not found" }, { status: 404 });
      }
      const obj = overtime.toObject() as any;
      const response: OvertimeRequest = {
        id: obj._id,
        employeeId: obj.employeeId,
        employeeName: obj.employeeName,
        businessUnit: obj.businessUnit,
        date: obj.date,
        startTime: obj.startTime,
        endTime: obj.endTime,
        hours: obj.hours,
        project: obj.project,
        description: obj.description,
        status: obj.status,
        approvedByAdminId: obj.approvedByAdminId,
        approvedAt: obj.approvedAt ? new Date(obj.approvedAt).toISOString() : undefined,
        rejectedByAdminId: obj.rejectedByAdminId,
        rejectedAt: obj.rejectedAt ? new Date(obj.rejectedAt).toISOString() : undefined,
        rejectionReason: obj.rejectionReason,
        approvalMessage: obj.approvalMessage,
        createdAt: obj.createdAt ? new Date(obj.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: obj.updatedAt ? new Date(obj.updatedAt).toISOString() : new Date().toISOString(),
      };
      return NextResponse.json(response);
    }

    await connectToDatabase();
    const overtime = await OvertimeRequestModel.findOne({
      _id: body.id,
      businessUnit: user.businessUnit,
    });

    if (!overtime) {
      return NextResponse.json({ error: "Overtime request not found" }, { status: 404 });
    }

    if (overtime.status !== "Pending") {
      return NextResponse.json(
        { error: "Only pending overtime requests can be approved or rejected" },
        { status: 400 }
      );
    }

    if (action === "approve") {
      const approvalMessage = (body.approvalMessage as string | undefined)?.trim() ?? "";
      if (approvalMessage.length > 2000) {
        return NextResponse.json({ error: "Approval message is too long" }, { status: 400 });
      }

      overtime.status = "Approved";
      overtime.approvedByAdminId = user.id;
      overtime.approvedAt = new Date();
      if (approvalMessage) {
        overtime.approvalMessage = approvalMessage;
      }
      overtime.rejectedByAdminId = undefined;
      overtime.rejectedAt = undefined;
      overtime.rejectionReason = undefined;

      // Create notification for employee
      await EmployeeNotificationModel.create({
        employeeId: overtime.employeeId,
        businessUnit: user.businessUnit,
        type: "overtime_approval",
        title: "Overtime Request Approved",
        message: `Your overtime request for ${overtime.date} (${overtime.hours} hours) has been approved.${approvalMessage ? ` Message: ${approvalMessage}` : ""}`,
        relatedId: overtime._id,
        createdByAdminId: user.id,
      });
    } else if (action === "reject") {
      const rejectionReason = (body.rejectionReason as string | undefined)?.trim() ?? "";
      if (!rejectionReason) {
        return NextResponse.json(
          { error: "Rejection reason is required when rejecting an overtime request" },
          { status: 400 }
        );
      }
      if (rejectionReason.length > 2000) {
        return NextResponse.json({ error: "Rejection reason is too long" }, { status: 400 });
      }

      overtime.status = "Rejected";
      overtime.rejectedByAdminId = user.id;
      overtime.rejectedAt = new Date();
      overtime.rejectionReason = rejectionReason;
      overtime.approvedByAdminId = undefined;
      overtime.approvedAt = undefined;
      overtime.approvalMessage = undefined;

      // Create notification for employee
      await EmployeeNotificationModel.create({
        employeeId: overtime.employeeId,
        businessUnit: user.businessUnit,
        type: "overtime_approval",
        title: "Overtime Request Rejected",
        message: `Your overtime request for ${overtime.date} (${overtime.hours} hours) has been rejected. Reason: ${rejectionReason}`,
        relatedId: overtime._id,
        createdByAdminId: user.id,
      });
    }

    await overtime.save();

    // Mark related notifications as read
    await OvertimeNotificationModel.updateMany(
      {
        overtimeRequestId: overtime._id,
        businessUnit: user.businessUnit,
        readAt: null,
      },
      {
        readAt: new Date(),
        readByAdminId: user.id,
      }
    );

    const obj = overtime.toObject() as any;
    const response: OvertimeRequest = {
      id: obj._id,
      employeeId: obj.employeeId,
      employeeName: obj.employeeName,
      businessUnit: obj.businessUnit,
      date: obj.date,
      startTime: obj.startTime,
      endTime: obj.endTime,
      hours: obj.hours,
      project: obj.project,
      description: obj.description,
      status: obj.status,
      approvedByAdminId: obj.approvedByAdminId,
      approvedAt: obj.approvedAt ? new Date(obj.approvedAt).toISOString() : undefined,
      rejectedByAdminId: obj.rejectedByAdminId,
      rejectedAt: obj.rejectedAt ? new Date(obj.rejectedAt).toISOString() : undefined,
      rejectionReason: obj.rejectionReason,
      approvalMessage: obj.approvalMessage,
      createdAt: obj.createdAt ? new Date(obj.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: obj.updatedAt ? new Date(obj.updatedAt).toISOString() : new Date().toISOString(),
    };

    return NextResponse.json(response);
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

