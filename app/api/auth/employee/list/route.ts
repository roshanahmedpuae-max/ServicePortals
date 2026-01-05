import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import EmployeeModel from "@/lib/models/Employee";

// Public endpoint to list employees for login selection.
// Only exposes non-sensitive fields.
export async function GET() {
  try {
    await connectToDatabase();
    const employees = await EmployeeModel.find({}, "name businessUnit role status").sort({ name: 1 });
    return NextResponse.json(
      employees.map((e) => ({
        id: e._id,
        name: e.name,
        businessUnit: e.businessUnit,
        role: e.role,
        status: e.status,
      }))
    );
  } catch (error) {
    console.error("GET /api/auth/employee/list failed:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

