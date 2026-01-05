import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import CustomerUserModel from "@/lib/models/CustomerUser";
import { BusinessUnit, CustomerUser } from "@/lib/types";
import { hashPassword } from "@/lib/models/utils";
import { issueCustomerToken, setAuthCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { identifier, password, businessUnit } = body as {
    identifier?: string;
    password?: string;
    businessUnit?: BusinessUnit;
  };

  if (!identifier || !password || !businessUnit) {
    return NextResponse.json(
      { error: "Username/email, password and business unit are required" },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const normalizedIdentifier = String(identifier).trim();
  const passwordHash = hashPassword(password);

  const user = await CustomerUserModel.findOne({
    businessUnit,
    passwordHash,
    $or: [
      { email: normalizedIdentifier.toLowerCase() },
      { username: new RegExp(`^${normalizedIdentifier}$`, "i") },
    ],
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const userObj = user.toObject();

  const customerUser: CustomerUser = {
    id: (userObj as { id?: string; _id: string }).id ?? userObj._id,
    email: userObj.email,
    username: userObj.username,
    passwordHash: userObj.passwordHash,
    businessUnit: userObj.businessUnit,
    role: "customer",
  };

  const token = issueCustomerToken(customerUser);
  const response = NextResponse.json({
    token,
    customer: {
      id: customerUser.id,
      email: customerUser.email,
      username: customerUser.username,
      businessUnit: customerUser.businessUnit,
      role: customerUser.role,
    },
  });

  setAuthCookie(response, token);
  return response;
}

