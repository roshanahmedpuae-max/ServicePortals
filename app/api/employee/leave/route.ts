import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import LeaveRequestModel from "@/lib/models/LeaveRequest";
import LeaveNotificationModel from "@/lib/models/LeaveNotification";
import { LeaveRequest, LeaveType, LeaveUnit } from "@/lib/types";
import { isLeaveOverlapping, validateLeaveRange } from "@/lib/leave-validation";
import { uploadFile } from "@/lib/cloudinary";

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request, ["employee"]);
    await connectToDatabase();

    const leaves = await LeaveRequestModel.find({
      employeeId: user.id,
      businessUnit: user.businessUnit,
    })
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
    const user = requireAuth(request, ["employee"]);
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const type = body.type as LeaveType | undefined;
    const unit = body.unit as LeaveUnit | undefined;
    const startDate = body.startDate as string | undefined;
    const endDate = (body.endDate as string | undefined) || undefined;
    const startTime = (body.startTime as string | undefined) || undefined;
    const endTime = (body.endTime as string | undefined) || undefined;
    const reasonRaw = (body.reason as string | undefined) ?? "";
    const reason = reasonRaw.trim();

    if (!type || !["Annual", "SickWithCertificate", "SickWithoutCertificate"].includes(type)) {
      return NextResponse.json({ error: "Invalid leave type" }, { status: 400 });
    }
    if (!unit || !["FullDay", "HalfDay"].includes(unit)) {
      return NextResponse.json({ error: "Invalid leave unit" }, { status: 400 });
    }
    if (!reason || reason.length < 5) {
      return NextResponse.json({ error: "Reason must be at least 5 characters" }, { status: 400 });
    }
    if (reason.length > 2000) {
      return NextResponse.json({ error: "Reason is too long" }, { status: 400 });
    }

    // Validate certificate upload for SickWithCertificate
    let certificateUrl: string | undefined;
    if (type === "SickWithCertificate") {
      const certificateFile = body.certificateFile as string | undefined;
      if (!certificateFile || typeof certificateFile !== "string" || !certificateFile.trim()) {
        return NextResponse.json(
          { error: "Certificate file is required for sick leave with certificate" },
          { status: 400 }
        );
      }
      if (certificateFile.startsWith("data:")) {
        try {
          certificateUrl = await uploadFile(certificateFile, "leave-certificates");
        } catch (error) {
          return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to upload certificate" },
            { status: 400 }
          );
        }
      } else if (certificateFile.trim().length > 0) {
        certificateUrl = certificateFile;
      } else {
        return NextResponse.json(
          { error: "Certificate file is required for sick leave with certificate" },
          { status: 400 }
        );
      }
    }

    // Handle document uploads for Annual leave
    let employeeDocuments: Array<{ fileName: string; fileUrl: string; uploadedAt: string }> = [];
    if (type === "Annual") {
      const documents = body.documents as Array<{ fileName: string; fileData: string }> | undefined;
      if (documents && Array.isArray(documents) && documents.length > 0) {
        for (const doc of documents) {
          if (!doc.fileName || !doc.fileData) {
            continue;
          }
          let fileUrl: string;
          if (doc.fileData.startsWith("data:")) {
            try {
              fileUrl = await uploadFile(doc.fileData, "leave-documents");
            } catch (error) {
              return NextResponse.json(
                { error: error instanceof Error ? error.message : `Failed to upload document: ${doc.fileName}` },
                { status: 400 }
              );
            }
          } else if (doc.fileData.trim().length > 0) {
            fileUrl = doc.fileData;
          } else {
            continue;
          }
          employeeDocuments.push({
            fileName: doc.fileName,
            fileUrl,
            uploadedAt: new Date().toISOString(),
          });
        }
      }
    }

    const validation = validateLeaveRange({
      type,
      unit,
      startDate: startDate || "",
      endDate,
      startTime,
      endTime,
    });

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error ?? "Invalid leave range" }, { status: 400 });
    }

    await connectToDatabase();

    const existing = await LeaveRequestModel.find({
      employeeId: user.id,
      businessUnit: user.businessUnit,
    })
      .select("startDate endDate startTime endTime unit status")
      .lean();

    const hasOverlap = isLeaveOverlapping(existing as any, {
      startDate: startDate!,
      endDate,
      startTime,
      endTime,
      unit,
    });

    if (hasOverlap) {
      return NextResponse.json(
        {
          error:
            "You already have a pending or approved leave that overlaps with this period. Please adjust the dates or times.",
        },
        { status: 400 }
      );
    }

    const created = await LeaveRequestModel.create({
      employeeId: user.id,
      employeeName: user.name,
      businessUnit: user.businessUnit,
      type,
      unit,
      startDate,
      endDate,
      startTime,
      endTime,
      reason,
      certificateUrl,
      employeeDocuments: employeeDocuments.length > 0 ? employeeDocuments.map(doc => ({
        fileName: doc.fileName,
        fileUrl: doc.fileUrl,
        uploadedAt: new Date(doc.uploadedAt),
      })) : undefined,
      status: "Pending",
    });

    // Create notification for admin
    await LeaveNotificationModel.create({
      leaveRequestId: created._id,
      employeeId: user.id,
      employeeName: user.name,
      businessUnit: user.businessUnit,
      leaveType: type,
      startDate,
      endDate,
      status: "Pending",
    });

    const obj = created.toObject() as any;
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
      certificateUrl: obj.certificateUrl,
      employeeDocuments: obj.employeeDocuments
        ? obj.employeeDocuments.map((doc: any) => ({
            fileName: doc.fileName,
            fileUrl: doc.fileUrl,
            uploadedAt: doc.uploadedAt ? new Date(doc.uploadedAt).toISOString() : new Date().toISOString(),
          }))
        : undefined,
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
      return NextResponse.json({ error: "Leave request id is required" }, { status: 400 });
    }

    await connectToDatabase();
    const leave = await LeaveRequestModel.findOne({
      _id: body.id,
      employeeId: user.id,
      businessUnit: user.businessUnit,
    });

    if (!leave) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
    }

    if (leave.status !== "Pending") {
      return NextResponse.json(
        { error: "Only pending leave requests can be cancelled" },
        { status: 400 }
      );
    }

    leave.status = "Cancelled";
    await leave.save();

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
      certificateUrl: obj.certificateUrl,
      employeeDocuments: obj.employeeDocuments
        ? obj.employeeDocuments.map((doc: any) => ({
            fileName: doc.fileName,
            fileUrl: doc.fileUrl,
            uploadedAt: doc.uploadedAt ? new Date(doc.uploadedAt).toISOString() : new Date().toISOString(),
          }))
        : undefined,
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

