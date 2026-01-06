import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import CustomerModel from "@/lib/models/Customer";
import ServiceTypeModel from "@/lib/models/ServiceType";
import EmployeeModel from "@/lib/models/Employee";
import { BusinessUnit } from "@/lib/types";

const isBusinessUnit = (value: string): value is BusinessUnit =>
  value === "G3" || value === "PrintersUAE" || value === "IT";

export async function GET(request: NextRequest) {
  try {
    const bu = request.nextUrl.searchParams.get("bu") || "";
    if (!isBusinessUnit(bu)) {
      return NextResponse.json({ error: "Invalid business unit" }, { status: 400 });
    }

    await connectToDatabase();

    const [customers, serviceTypes, employees] = await Promise.all([
      CustomerModel.find({ businessUnit: bu }).lean(),
      ServiceTypeModel.find({ businessUnit: bu }).lean(),
      EmployeeModel.find({ businessUnit: bu }).lean(),
    ]);

    return NextResponse.json({
      customers: customers.map((c: any) => ({
        id: c._id.toString(),
        name: c.name,
        contact: c.contact,
      })),
      serviceTypes: serviceTypes.map((s: any) => ({
        id: s._id.toString(),
        name: s.name,
        description: s.description,
      })),
      employees: employees.map((e: any) => ({
        id: e._id.toString(),
        name: e.name,
        role: e.role,
        status: e.status,
        businessUnit: e.businessUnit,
      })),
    });
  } catch (error) {
    console.error("GET /api/options failed:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

