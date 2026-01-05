import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import CustomerUserModel from "@/lib/models/CustomerUser";

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    await connectToDatabase();
    
    const customerUsers = await CustomerUserModel.find({
      businessUnit: user.businessUnit,
    })
      .select("_id email username companyName")
      .lean();

    return NextResponse.json(
      customerUsers.map((cu) => ({
        id: cu._id,
        email: cu.email,
        username: cu.username,
        companyName: cu.companyName,
      }))
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = message === "Unauthorized" ? 401 : 500;
    console.error("GET /api/admin/customer-users failed", error);
    return NextResponse.json({ error: message }, { status });
  }
}

