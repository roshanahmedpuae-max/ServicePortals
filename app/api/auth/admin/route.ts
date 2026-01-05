import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import AdminModel, { ensureAdminSeeds } from "@/lib/models/Admin";
import { hashPassword } from "@/lib/models/utils";
import { issueAdminToken, setAuthCookie } from "@/lib/auth";
import { AdminUser } from "@/lib/types";
import { BusinessUnit } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.businessUnit || !body?.password) {
    return NextResponse.json({ error: "Business unit and password required" }, { status: 400 });
  }
  await connectToDatabase();
  await ensureAdminSeeds();

  const businessUnit = body.businessUnit as BusinessUnit;
  const admin = await AdminModel.findOne({ businessUnit });
  const isValid = admin?.passwordHash === hashPassword(body.password);
  if (!admin || !isValid) {
    return NextResponse.json({ error: "Invalid credentials for this business unit" }, { status: 401 });
  }

  const adminObj = admin.toObject();
  const adminPayload: AdminUser = {
    id: (adminObj as { id?: string; _id: string }).id ?? adminObj._id,
    email: adminObj.email,
    passwordHash: adminObj.passwordHash,
    businessUnit: adminObj.businessUnit,
    role: "admin",
  };

  const token = issueAdminToken(adminPayload);
  const response = NextResponse.json({
    token,
    admin: {
      id: adminPayload.id,
      email: adminPayload.email,
      businessUnit: adminPayload.businessUnit,
      role: adminPayload.role,
    },
  });
  setAuthCookie(response, token);
  return response;
}

