import { NextRequest, NextResponse } from "next/server";
import { requireAuth, verifyToken, getAuthFromHeaderOrCookie } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import EmployeeModel from "@/lib/models/Employee";

export async function GET(request: NextRequest) {
  try {
    const token = getAuthFromHeaderOrCookie(request);
    const payload = verifyToken(token);
    
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // If user is employee, fetch feature access from database
    if (payload.role === "employee") {
      await connectToDatabase();
      const employee = await EmployeeModel.findById(payload.id);
      if (employee) {
        const employeeObj = employee.toObject();
        return NextResponse.json({
          user: {
            ...payload,
            featureAccess: (employeeObj as any).featureAccess || [],
          },
        });
      }
    }

    // For admin and customer, return payload as-is
    return NextResponse.json({ user: payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

