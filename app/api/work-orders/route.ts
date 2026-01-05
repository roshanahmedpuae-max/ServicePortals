import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import WorkOrderModel from "@/lib/models/WorkOrder";
import EmployeeModel from "@/lib/models/Employee";
import CustomerModel from "@/lib/models/Customer";
import WorkOrderNotificationModel from "@/lib/models/WorkOrderNotification";
import { uploadImage } from "@/lib/cloudinary";

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin", "employee"]);
    await connectToDatabase();
    const query: Record<string, unknown> = { businessUnit: user.businessUnit };
    if (user.role === "employee") {
      query.assignedEmployeeId = user.id;
    }
    const orders = await WorkOrderModel.find(query);
    if (user.role === "employee") {
      return NextResponse.json(orders.map((o) => o.toJSON()));
    }
    return NextResponse.json(orders.map((o) => o.toJSON()));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = message === "Unauthorized" ? 401 : 500;
    console.error("GET /api/work-orders failed", error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    const body = await request.json().catch(() => null);
    if (!body?.customerId || !body?.workDescription || !body?.locationAddress || !body?.customerPhone || !body?.orderDateTime) {
      return NextResponse.json(
        { error: "customerId, workDescription, locationAddress, customerPhone, and orderDateTime are required" },
        { status: 400 }
      );
    }
    await connectToDatabase();
    const now = new Date().toISOString();
    const customer = await CustomerModel.findOne({ _id: body.customerId, businessUnit: user.businessUnit });
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    const workOrder = await WorkOrderModel.create({
      customerId: body.customerId,
      customerName: customer.name,
      serviceTypeId: body.serviceTypeId,
      assignedEmployeeId: body.assignedEmployeeId,
      workDescription: body.workDescription,
      locationAddress: body.locationAddress,
      customerPhone: body.customerPhone,
      orderDateTime: body.orderDateTime,
      quotationReferenceNumber: body.quotationReferenceNumber,
      paymentMethod: body.paymentMethod,
      businessUnit: user.businessUnit,
      status: body.assignedEmployeeId ? "Assigned" : "Draft",
      audit: {
        createdAt: now,
        updatedAt: now,
        createdBy: user.id,
        updatedBy: user.id,
      },
    });

    return NextResponse.json(workOrder.toJSON(), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = message === "Unauthorized" ? 401 : 500;
    console.error("POST /api/work-orders failed", error);
    return NextResponse.json({ error: message }, { status });
  }
}

const isDataUrl = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("data:");

const uploadImagesIfNeeded = async (items: unknown, folder: string) => {
  if (!Array.isArray(items)) return [];
  const results: string[] = [];
  for (const item of items) {
    if (typeof item !== "string" || item.trim() === "") continue;
    if (isDataUrl(item)) {
      const uploaded = await uploadImage(item, folder);
      results.push(uploaded);
    } else {
      results.push(item);
    }
  }
  return results;
};

export async function PUT(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin", "employee"]);
    const body = await request.json().catch(() => null);
    if (!body?.id) {
      return NextResponse.json({ error: "Work order id is required" }, { status: 400 });
    }
    await connectToDatabase();
    const existing = await WorkOrderModel.findOne({
      _id: body.id,
      businessUnit: user.businessUnit,
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (user.role === "admin") {
      const previousEmployee = existing.assignedEmployeeId;

      if (body.customerId) {
        const customer = await CustomerModel.findOne({ _id: body.customerId, businessUnit: user.businessUnit });
        if (!customer) {
          return NextResponse.json({ error: "Customer not found" }, { status: 404 });
        }
        existing.customerId = body.customerId;
        existing.customerName = customer.name;
      }
      if (body.serviceTypeId !== undefined) {
        existing.serviceTypeId = body.serviceTypeId || undefined;
      }
      if (body.workDescription) existing.workDescription = body.workDescription;
      if (body.locationAddress) existing.locationAddress = body.locationAddress;
      if (body.customerPhone) existing.customerPhone = body.customerPhone;
      if (body.orderDateTime) existing.orderDateTime = body.orderDateTime;
      if (body.quotationReferenceNumber !== undefined) existing.quotationReferenceNumber = body.quotationReferenceNumber || undefined;
      if (body.paymentMethod !== undefined) existing.paymentMethod = body.paymentMethod || undefined;
      if (body.assignedEmployeeId !== undefined) {
        existing.assignedEmployeeId = body.assignedEmployeeId || undefined;
        existing.status = body.assignedEmployeeId ? "Assigned" : "Draft";
      }

      existing.audit.updatedBy = user.id;
      existing.audit.updatedAt = new Date().toISOString();

      // Save work order first
      await existing.save();

      // Reload the work order to ensure we have the latest data
      const updated = await WorkOrderModel.findById(existing._id);
      return NextResponse.json(updated?.toJSON() || existing.toJSON());
    }

    if (existing.assignedEmployeeId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

  if (!body.workCompletionDate) {
    return NextResponse.json({ error: "Completion date is required" }, { status: 400 });
  }
  if (!body.employeeSignature) {
    return NextResponse.json({ error: "Employee signature is required" }, { status: 400 });
  }
  if (!body.customerSignature) {
    return NextResponse.json({ error: "Customer signature is required" }, { status: 400 });
  }

    const existingId = (existing as { id?: string; _id: string }).id ?? existing._id;

    const beforePhotos = await uploadImagesIfNeeded(
      Array.isArray(body.beforePhotos) ? body.beforePhotos : existing.beforePhotos,
      `work-orders/${existingId}/before`
    );
    const afterPhotos = await uploadImagesIfNeeded(
      Array.isArray(body.afterPhotos) ? body.afterPhotos : existing.afterPhotos,
      `work-orders/${existingId}/after`
    );

    existing.findings = body.findings;
    existing.beforePhotos = beforePhotos;
    existing.afterPhotos = afterPhotos;
  existing.workCompletionDate = body.workCompletionDate;
  existing.approvalDate = body.workCompletionDate;
  existing.employeeSignature = body.employeeSignature;
  existing.customerSignature = body.customerSignature;
  existing.customerNameAtCompletion = body.customerNameAtCompletion || existing.customerName;
    existing.status = "Submitted";
    existing.audit.updatedBy = user.id;
    existing.audit.updatedAt = new Date().toISOString();

    await existing.save();

    if (existing.assignedEmployeeId) {
      await EmployeeModel.findByIdAndUpdate(existing.assignedEmployeeId, { status: "Available" });
    }

    // Get employee name for notification
    const employee = await EmployeeModel.findById(user.id).lean();
    const employeeName = employee?.name || "Employee";

    // Create notification for admin
    await WorkOrderNotificationModel.create({
      workOrderId: existing._id,
      employeeId: user.id,
      employeeName: employeeName,
      businessUnit: user.businessUnit,
      customerName: existing.customerName || "Customer",
      workDescription: existing.workDescription || "Work order",
      locationAddress: existing.locationAddress || "",
      orderDateTime: existing.orderDateTime || new Date().toISOString(),
      status: "Submitted",
    });

    return NextResponse.json(existing.toJSON());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = message === "Unauthorized" ? 401 : 500;
    console.error("PUT /api/work-orders failed", error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    const body = await request.json().catch(() => null);
    if (!body?.id) {
      return NextResponse.json({ error: "Work order id is required" }, { status: 400 });
    }
    await connectToDatabase();
    const existing = await WorkOrderModel.findOne({
      _id: body.id,
      businessUnit: user.businessUnit,
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Store the assigned employee ID before deletion
    const assignedEmployeeId = existing.assignedEmployeeId;

    // Delete the work order
    await existing.deleteOne();

    // If work order had an assigned employee, make them available again
    // This happens after deletion to ensure the work order is removed from database
    if (assignedEmployeeId) {
      await EmployeeModel.findByIdAndUpdate(assignedEmployeeId, { status: "Available" });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = message === "Unauthorized" ? 401 : 500;
    console.error("DELETE /api/work-orders failed", error);
    return NextResponse.json({ error: message }, { status });
  }
}

