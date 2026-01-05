import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import OvertimeRequestModel from "@/lib/models/OvertimeRequest";
import OvertimeNotificationModel from "@/lib/models/OvertimeNotification";
import { OvertimeRequest, OvertimeStatus } from "@/lib/types";
import { isOvertimeOverlapping, validateOvertimeRequest, calculateHours } from "@/lib/overtime-validation";

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request, ["employee"]);
    await connectToDatabase();

    const overtimes = await OvertimeRequestModel.find({
      employeeId: user.id,
      businessUnit: user.businessUnit,
    })
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
    const user = requireAuth(request, ["employee"]);
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const date = body.date as string | undefined;
    const startTime = body.startTime as string | undefined;
    const endTime = body.endTime as string | undefined;
    const project = (body.project as string | undefined)?.trim() || undefined;
    const descriptionRaw = (body.description as string | undefined) ?? "";
    const description = descriptionRaw.trim();

    if (!date || !startTime || !endTime) {
      return NextResponse.json({ error: "Date, start time, and end time are required" }, { status: 400 });
    }

    const validation = validateOvertimeRequest({
      date,
      startTime,
      endTime,
      description,
    });

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error ?? "Invalid overtime request" }, { status: 400 });
    }

    const hours = calculateHours(startTime, endTime);

    await connectToDatabase();

    const existing = await OvertimeRequestModel.find({
      employeeId: user.id,
      businessUnit: user.businessUnit,
    })
      .select("date startTime endTime status")
      .lean();

    const hasOverlap = isOvertimeOverlapping(existing as any, {
      date,
      startTime,
      endTime,
    });

    if (hasOverlap) {
      return NextResponse.json(
        {
          error:
            "You already have a pending or approved overtime that overlaps with this time period on the same date. Please adjust the times.",
        },
        { status: 400 }
      );
    }

    const created = await OvertimeRequestModel.create({
      employeeId: user.id,
      employeeName: user.name,
      businessUnit: user.businessUnit,
      date,
      startTime,
      endTime,
      hours,
      project,
      description,
      status: "Pending",
    });

    // Create notification for admin
    await OvertimeNotificationModel.create({
      overtimeRequestId: created._id,
      employeeId: user.id,
      employeeName: user.name,
      businessUnit: user.businessUnit,
      date,
      hours,
      status: "Pending",
    });

    const obj = created.toObject() as any;
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

    return NextResponse.json(response, { status: 201 });
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

export async function PATCH(request: NextRequest) {
  try {
    const user = requireAuth(request, ["employee"]);
    const body = await request.json().catch(() => null);
    if (!body?.id) {
      return NextResponse.json({ error: "Overtime request id is required" }, { status: 400 });
    }

    await connectToDatabase();
    const overtime = await OvertimeRequestModel.findOne({
      _id: body.id,
      employeeId: user.id,
      businessUnit: user.businessUnit,
    });

    if (!overtime) {
      return NextResponse.json({ error: "Overtime request not found" }, { status: 404 });
    }

    if (overtime.status !== "Pending") {
      return NextResponse.json(
        { error: "Only pending overtime requests can be cancelled" },
        { status: 400 }
      );
    }

    overtime.status = "Cancelled";
    await overtime.save();

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

