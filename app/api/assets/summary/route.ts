import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { VehicleModel, CompanyRegistrationModel, BillContractModel, ITEquipmentModel } from "@/lib/models/Assets";
import { AssetDateModel } from "@/lib/models/Assets";

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    await connectToDatabase();

    const businessUnit = user.businessUnit;

    const [vehicleCount, registrationCount, billCount, itCount, upcomingDates, overdueDates] = await Promise.all([
      VehicleModel.countDocuments({ businessUnit }),
      CompanyRegistrationModel.countDocuments({
        $or: [{ businessUnit }, { businessUnit: { $exists: false } }],
      }),
      BillContractModel.countDocuments({ businessUnit }),
      ITEquipmentModel.countDocuments({ businessUnit }),
      AssetDateModel.countDocuments({ businessUnit, status: "upcoming" }),
      AssetDateModel.countDocuments({ businessUnit, status: "overdue" }),
    ]);

    return NextResponse.json({
      businessUnit,
      categories: {
        vehicles: { active: vehicleCount },
        registrations: { active: registrationCount },
        bills_contracts: { active: billCount },
        it_equipment: { active: itCount },
      },
      dates: {
        upcoming: upcomingDates,
        overdue: overdueDates,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

