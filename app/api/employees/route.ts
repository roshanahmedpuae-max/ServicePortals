import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import EmployeeModel, { createEmployeePayload } from "@/lib/models/Employee";
import WorkOrderModel from "@/lib/models/WorkOrder";
import { hashPassword } from "@/lib/models/utils";

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    await connectToDatabase();
    const employees = await EmployeeModel.find({ businessUnit: user.businessUnit });
    return NextResponse.json(employees.map((e) => e.toJSON()));
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
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
      })
    );
    return NextResponse.json(employee.toJSON(), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
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
    const user = requireAuth(request, ["admin"]);
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

