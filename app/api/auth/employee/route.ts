import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import EmployeeModel, { verifyEmployeeCredentials } from "@/lib/models/Employee";
import { issueEmployeeToken, setAuthCookie } from "@/lib/auth";
import { BusinessUnit } from "@/lib/types";
import { Employee } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.name || !body?.password) {
    return NextResponse.json(
      { error: "Name and password are required" },
      { status: 400 }
    );
  }
  const bu = body.businessUnit as BusinessUnit | undefined;
  await connectToDatabase();

  const employee =
    (bu && (await verifyEmployeeCredentials(body.name, body.password, bu))) ||
    (await verifyEmployeeCredentials(body.name, body.password));

  if (!employee) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const employeeObj = employee.toObject();
  const employeePayload: Employee = {
    id: (employeeObj as { id?: string; _id: string }).id ?? employeeObj._id,
    name: employeeObj.name,
    passwordHash: employeeObj.passwordHash,
    businessUnit: employeeObj.businessUnit,
    role: employeeObj.role,
    status: employeeObj.status,
  };

  const token = issueEmployeeToken(employeePayload);
  const response = NextResponse.json({
    token,
    employee: {
      id: employeePayload.id,
      name: employeePayload.name,
      businessUnit: employeePayload.businessUnit,
      role: employeePayload.role,
      status: employeePayload.status,
    },
  });
  setAuthCookie(response, token);
  return response;
}

