import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import CustomerUserModel, { createCustomerUserPayload } from "@/lib/models/CustomerUser";
import { BusinessUnit, CustomerUser } from "@/lib/types";
import { issueCustomerToken, setAuthCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, username, companyName, password, passwordConfirmation, businessUnit } = body as {
    email?: string;
    username?: string;
    companyName?: string;
    password?: string;
    passwordConfirmation?: string;
    businessUnit?: BusinessUnit;
  };

  if (!email || !username || !password || !passwordConfirmation || !businessUnit) {
    return NextResponse.json(
      { error: "Email, username, password, password confirmation and business unit are required" },
      { status: 400 }
    );
  }

  if (password !== passwordConfirmation) {
    return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters long" },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const normalizedEmail = String(email).toLowerCase().trim();
  const normalizedUsername = String(username).trim();

  const existing = await CustomerUserModel.findOne({
    $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
  });
  if (existing) {
    return NextResponse.json(
      { error: "Email or username already in use" },
      { status: 409 }
    );
  }

  const payload = createCustomerUserPayload({
    email: normalizedEmail,
    username: normalizedUsername,
    companyName: companyName?.trim(),
    password,
    businessUnit,
  });

  const created = await CustomerUserModel.create(payload);
  const createdObj = created.toObject();

  const customerUser: CustomerUser = {
    id: (createdObj as { id?: string; _id: string }).id ?? createdObj._id,
    email: createdObj.email,
    username: createdObj.username,
    companyName: createdObj.companyName,
    passwordHash: createdObj.passwordHash,
    businessUnit: createdObj.businessUnit,
    role: "customer",
  };

  const token = issueCustomerToken(customerUser);
  const response = NextResponse.json({
    token,
    customer: {
      id: customerUser.id,
      email: customerUser.email,
      username: customerUser.username,
      companyName: customerUser.companyName,
      businessUnit: customerUser.businessUnit,
      role: customerUser.role,
    },
  });

  setAuthCookie(response, token);
  return response;
}

