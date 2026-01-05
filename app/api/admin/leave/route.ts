import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import LeaveRequestModel from "@/lib/models/LeaveRequest";
import LeaveNotificationModel from "@/lib/models/LeaveNotification";
import EmployeeNotificationModel from "@/lib/models/EmployeeNotification";
import { LeaveRequest } from "@/lib/types";
import { isLeaveOverlapping } from "@/lib/leave-validation";
import { uploadFile } from "@/lib/cloudinary";

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

    const leaves = await LeaveRequestModel.find(query)
      .sort({ startDate: -1, createdAt: -1 })
      .lean();

    const result: LeaveRequest[] = leaves.map((l: any) => ({
      id: l._id,
      employeeId: l.employeeId,
      employeeName: l.employeeName,
      businessUnit: l.businessUnit,
      type: l.type,
      unit: l.unit,
      startDate: l.startDate,
      endDate: l.endDate,
      startTime: l.startTime,
      endTime: l.endTime,
      reason: l.reason,
      certificateUrl: l.certificateUrl,
      employeeDocuments: l.employeeDocuments
        ? l.employeeDocuments.map((doc: any) => ({
            fileName: doc.fileName,
            fileUrl: doc.fileUrl,
            uploadedAt: doc.uploadedAt ? new Date(doc.uploadedAt).toISOString() : new Date().toISOString(),
          }))
        : undefined,
      status: l.status,
      approvedByAdminId: l.approvedByAdminId,
      approvedAt: l.approvedAt ? new Date(l.approvedAt).toISOString() : undefined,
      rejectedByAdminId: l.rejectedByAdminId,
      rejectedAt: l.rejectedAt ? new Date(l.rejectedAt).toISOString() : undefined,
      rejectionReason: l.rejectionReason,
      approvalDocuments: l.approvalDocuments
        ? l.approvalDocuments.map((doc: any) => ({
            fileName: doc.fileName,
            fileUrl: doc.fileUrl,
            uploadedAt: doc.uploadedAt ? new Date(doc.uploadedAt).toISOString() : new Date().toISOString(),
          }))
        : undefined,
      approvalMessage: l.approvalMessage,
      createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: l.updatedAt ? new Date(l.updatedAt).toISOString() : new Date().toISOString(),
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
      return NextResponse.json({ error: "Leave id and action are required" }, { status: 400 });
    }

    const action = body.action as "approve" | "reject" | "view";
    if (action === "view") {
      // Just mark notification as read, don't change leave status
      await LeaveNotificationModel.updateMany(
        {
          leaveRequestId: body.id,
          businessUnit: user.businessUnit,
          readAt: null,
        },
        {
          readAt: new Date(),
          readByAdminId: user.id,
        }
      );
      const leave = await LeaveRequestModel.findOne({
        _id: body.id,
        businessUnit: user.businessUnit,
      });
      if (!leave) {
        return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
      }
      const obj = leave.toObject() as any;
      const response: LeaveRequest = {
        id: obj._id,
        employeeId: obj.employeeId,
        employeeName: obj.employeeName,
        businessUnit: obj.businessUnit,
        type: obj.type,
        unit: obj.unit,
        startDate: obj.startDate,
        endDate: obj.endDate,
        startTime: obj.startTime,
        endTime: obj.endTime,
        reason: obj.reason,
        status: obj.status,
        approvedByAdminId: obj.approvedByAdminId,
        approvedAt: obj.approvedAt ? new Date(obj.approvedAt).toISOString() : undefined,
        rejectedByAdminId: obj.rejectedByAdminId,
        rejectedAt: obj.rejectedAt ? new Date(obj.rejectedAt).toISOString() : undefined,
        rejectionReason: obj.rejectionReason,
        approvalDocuments: obj.approvalDocuments
          ? obj.approvalDocuments.map((doc: any) => ({
              fileName: doc.fileName,
              fileUrl: doc.fileUrl,
              uploadedAt: doc.uploadedAt ? new Date(doc.uploadedAt).toISOString() : new Date().toISOString(),
            }))
          : undefined,
        approvalMessage: obj.approvalMessage,
        createdAt: obj.createdAt ? new Date(obj.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: obj.updatedAt ? new Date(obj.updatedAt).toISOString() : new Date().toISOString(),
      };
      return NextResponse.json(response);
    }
    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await connectToDatabase();

    const leave = await LeaveRequestModel.findOne({
      _id: body.id,
      businessUnit: user.businessUnit,
    });

    if (!leave) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
    }

    if (leave.status !== "Pending") {
      return NextResponse.json(
        { error: "Only pending leave requests can be approved or rejected" },
        { status: 400 }
      );
    }

    if (action === "approve") {
      // Re-check overlap against other approved/pending leaves at decision time
      const existing = await LeaveRequestModel.find({
        employeeId: leave.employeeId,
        businessUnit: leave.businessUnit,
        _id: { $ne: leave._id },
      })
        .select("startDate endDate startTime endTime unit status")
        .lean();

      const hasOverlap = isLeaveOverlapping(existing as any, {
        startDate: leave.startDate,
        endDate: leave.endDate,
        startTime: leave.startTime,
        endTime: leave.endTime,
        unit: leave.unit,
      });

      if (hasOverlap) {
        return NextResponse.json(
          {
            error:
              "This leave now overlaps with another approved or pending leave for the employee. Please review before approving.",
          },
          { status: 400 }
        );
      }

      // Handle document uploads for Annual/Vacation leave
      let approvalDocuments: Array<{ fileName: string; fileUrl: string; uploadedAt: Date }> = [];
      if (body.approvalDocuments && Array.isArray(body.approvalDocuments) && body.approvalDocuments.length > 0) {
        // Upload documents to Cloudinary
        for (const doc of body.approvalDocuments) {
          if (doc.fileName && doc.fileData) {
            // fileData should be base64 encoded
            const folder = `leave-requests/${user.businessUnit}/${leave.employeeId}`;
            try {
              const fileUrl = await uploadFile(doc.fileData, folder);
              approvalDocuments.push({
                fileName: doc.fileName,
                fileUrl,
                uploadedAt: new Date(),
              });
            } catch (uploadError) {
              console.error("Failed to upload document:", uploadError);
              // Continue with other documents even if one fails
            }
          } else if (doc.fileName && doc.fileUrl) {
            // Already uploaded, just store the reference
            approvalDocuments.push({
              fileName: doc.fileName,
              fileUrl: doc.fileUrl,
              uploadedAt: doc.uploadedAt ? new Date(doc.uploadedAt) : new Date(),
            });
          }
        }
      }

      leave.status = "Approved";
      leave.approvedByAdminId = user.id;
      leave.approvedAt = new Date();
      if (approvalDocuments.length > 0) {
        leave.approvalDocuments = approvalDocuments;
      }
      if (body.approvalMessage) {
        const message = (body.approvalMessage as string).trim();
        if (message.length > 0 && message.length <= 2000) {
          leave.approvalMessage = message;
        }
      }
      // Clear any previous rejection metadata if present
      leave.rejectedByAdminId = undefined;
      leave.rejectedAt = undefined;
      leave.rejectionReason = undefined;

      // Create notification for employee
      await EmployeeNotificationModel.create({
        employeeId: leave.employeeId,
        businessUnit: user.businessUnit,
        type: "leave_approval",
        title: "Leave Request Approved",
        message: `Your ${leave.type} leave request from ${leave.startDate}${leave.endDate ? ` to ${leave.endDate}` : ""} has been approved.${body.approvalMessage ? ` Message: ${body.approvalMessage}` : ""}`,
        relatedId: leave._id,
        createdByAdminId: user.id,
      });
    } else if (action === "reject") {
      const rejectionReason = (body.rejectionReason as string | undefined)?.trim() ?? "";
      if (!rejectionReason) {
        return NextResponse.json(
          { error: "Rejection reason is required when rejecting a leave request" },
          { status: 400 }
        );
      }
      if (rejectionReason.length > 2000) {
        return NextResponse.json({ error: "Rejection reason is too long" }, { status: 400 });
      }

      leave.status = "Rejected";
      leave.rejectedByAdminId = user.id;
      leave.rejectedAt = new Date();
      leave.rejectionReason = rejectionReason;
      // Clear any previous approval metadata if present
      leave.approvedByAdminId = undefined;
      leave.approvedAt = undefined;

      // Create notification for employee
      await EmployeeNotificationModel.create({
        employeeId: leave.employeeId,
        businessUnit: user.businessUnit,
        type: "leave_approval",
        title: "Leave Request Rejected",
        message: `Your ${leave.type} leave request from ${leave.startDate}${leave.endDate ? ` to ${leave.endDate}` : ""} has been rejected. Reason: ${rejectionReason}`,
        relatedId: leave._id,
        createdByAdminId: user.id,
      });
    }

    await leave.save();

    // Mark related notifications as read
    await LeaveNotificationModel.updateMany(
      {
        leaveRequestId: leave._id,
        businessUnit: user.businessUnit,
        readAt: null,
      },
      {
        readAt: new Date(),
        readByAdminId: user.id,
      }
    );

    const obj = leave.toObject() as any;
    const response: LeaveRequest = {
      id: obj._id,
      employeeId: obj.employeeId,
      employeeName: obj.employeeName,
      businessUnit: obj.businessUnit,
      type: obj.type,
      unit: obj.unit,
      startDate: obj.startDate,
      endDate: obj.endDate,
      startTime: obj.startTime,
      endTime: obj.endTime,
      reason: obj.reason,
      status: obj.status,
      approvedByAdminId: obj.approvedByAdminId,
      approvedAt: obj.approvedAt ? new Date(obj.approvedAt).toISOString() : undefined,
      rejectedByAdminId: obj.rejectedByAdminId,
      rejectedAt: obj.rejectedAt ? new Date(obj.rejectedAt).toISOString() : undefined,
      rejectionReason: obj.rejectionReason,
      approvalDocuments: obj.approvalDocuments
        ? obj.approvalDocuments.map((doc: any) => ({
            fileName: doc.fileName,
            fileUrl: doc.fileUrl,
            uploadedAt: doc.uploadedAt ? new Date(doc.uploadedAt).toISOString() : new Date().toISOString(),
          }))
        : undefined,
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

