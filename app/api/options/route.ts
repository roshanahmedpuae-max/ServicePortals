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
      CustomerModel.find({ businessUnit: bu }),
      ServiceTypeModel.find({ businessUnit: bu }),
      EmployeeModel.find({ businessUnit: bu }),
    ]);

    return NextResponse.json({
      customers: customers.map((c) => c.toJSON()),
      serviceTypes: serviceTypes.map((s) => s.toJSON()),
      employees: employees.map((e) => {
        const obj = e.toObject();
        return {
          id: (obj as { id?: string; _id: string }).id ?? obj._id,
          name: obj.name,
          role: obj.role,
          status: obj.status,
          businessUnit: obj.businessUnit,
        };
      }),
    });
  } catch (error) {
    console.error("GET /api/options failed:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

