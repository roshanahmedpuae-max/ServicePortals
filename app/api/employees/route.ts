import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireFeatureAccess } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import EmployeeModel, { createEmployeePayload } from "@/lib/models/Employee";
import WorkOrderModel from "@/lib/models/WorkOrder";
import { hashPassword } from "@/lib/models/utils";

export async function GET(request: NextRequest) {
  try {
    // Admins can always view employees, employees with setup access can also view
    const { verifyToken, getAuthFromHeaderOrCookie, hasFeatureAccess } = await import("@/lib/auth");
    const token = getAuthFromHeaderOrCookie(request);
    const payload = verifyToken(token);
    
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Admins always have access, employees need setup feature
    if (payload.role === "employee" && !hasFeatureAccess(payload, "setup")) {
      return NextResponse.json({ error: "Forbidden: Setup access required" }, { status: 403 });
    }
    
    if (payload.role !== "admin" && payload.role !== "employee") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    await connectToDatabase();
    const employees = await EmployeeModel.find({ businessUnit: payload.businessUnit }).lean();
    return NextResponse.json(employees.map((e: any) => ({
      id: e._id.toString(),
      name: e.name,
      role: e.role,
      status: e.status,
      businessUnit: e.businessUnit,
      featureAccess: e.featureAccess || [],
      payrollDate: e.payrollDate,
    })));
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireFeatureAccess(request, "setup", ["admin"]);
    const body = await request.json().catch(() => null);
    if (!body?.name || !body?.password || !body?.role) {
      return NextResponse.json(
        { error: "Name, password, and role are required" },
        { status: 400 }
      );
    }
    await connectToDatabase();
    const employee = await EmployeeModel.create(
      createEmployeePayload({
        name: body.name,
        password: body.password,
        role: body.role,
        businessUnit: user.businessUnit,
        status: body.status,
        payrollDate: body.payrollDate,
        featureAccess: body.featureAccess || [],
      })
    );
    return NextResponse.json(employee.toJSON(), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireFeatureAccess(request, "setup", ["admin"]);
    const body = await request.json().catch(() => null);
    if (!body?.id) {
      return NextResponse.json({ error: "Employee id is required" }, { status: 400 });
    }
    await connectToDatabase();
    const updates: Record<string, unknown> = {};
    if (body.name) updates.name = body.name;
    if (body.role) updates.role = body.role;
    if (body.status) updates.status = body.status;
    if (body.password) updates.passwordHash = hashPassword(body.password);
    if (body.payrollDate !== undefined) updates.payrollDate = body.payrollDate;
    if (body.featureAccess !== undefined) updates.featureAccess = body.featureAccess;

    const updated = await EmployeeModel.findOneAndUpdate(
      { _id: body.id, businessUnit: user.businessUnit },
      updates,
      { new: true }
    );
    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(updated.toJSON());
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireFeatureAccess(request, "setup", ["admin"]);
    const body = await request.json().catch(() => null);
    if (!body?.id) {
      return NextResponse.json({ error: "Employee id is required" }, { status: 400 });
    }
    await connectToDatabase();
    const existing = await EmployeeModel.findOne({
      _id: body.id,
      businessUnit: user.businessUnit,
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const existingId = (existing as { id?: string; _id: string }).id ?? existing._id;

    await WorkOrderModel.updateMany(
      { assignedEmployeeId: existingId, businessUnit: user.businessUnit },
      { $set: { status: "Draft" }, $unset: { assignedEmployeeId: "" } }
    );

    await existing.deleteOne();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

