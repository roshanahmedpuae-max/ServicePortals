import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { AdminUser, BusinessUnit, Employee, Role, CustomerUser } from "@/lib/types";

const secret = process.env.AUTH_SECRET || "dev-secret-change-me";
const COOKIE_NAME = "auth_token";
// Token & cookie lifetime: 7 days (in seconds)
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const MAX_AGE_MS = MAX_AGE * 1000;

type TokenPayload = {
  id: string;
  role: Role;
  businessUnit: BusinessUnit;
  name?: string;
  email?: string;
  issuedAt: number;
};

export const signToken = (payload: TokenPayload) => {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64url");
  return `${data}.${signature}`;
};

export const verifyToken = (token?: string): TokenPayload | null => {
  if (!token) return null;
  const [data, signature] = token.split(".");
  if (!data || !signature) return null;
  const expected = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  if (expected !== signature) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as TokenPayload;

    // Enforce max lifetime based on issuedAt so that even if a cookie
    // lingers, the token itself cannot be used beyond 7 days.
    if (typeof payload.issuedAt !== "number") {
      return null;
    }
    const ageMs = Date.now() - payload.issuedAt;
    if (ageMs > MAX_AGE_MS || ageMs < 0) {
      // Too old or from the future – treat as invalid
      return null;
    }

    return payload;
  } catch (e) {
    return null;
  }
};

export const requireAuth = (request: NextRequest, allowedRoles: Role[]): TokenPayload => {
  const header = request.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const cookieToken = request.cookies.get(COOKIE_NAME)?.value;
  const payload = verifyToken(bearer || cookieToken);
  if (!payload || !allowedRoles.includes(payload.role)) {
    throw new Error("Unauthorized");
  }
  return payload;
};

export const issueAdminToken = (admin: AdminUser) =>
  signToken({
    id: admin.id,
    role: "admin",
    businessUnit: admin.businessUnit,
    email: admin.email,
    issuedAt: Date.now(),
  });

export const issueEmployeeToken = (employee: Employee) =>
  signToken({
    id: employee.id,
    role: "employee",
    businessUnit: employee.businessUnit,
    name: employee.name,
    issuedAt: Date.now(),
  });

export const issueCustomerToken = (customer: CustomerUser) =>
  signToken({
    id: customer.id,
    role: "customer",
    businessUnit: customer.businessUnit,
    name: customer.username,
    email: customer.email,
    issuedAt: Date.now(),
  });

export const setAuthCookie = (response: NextResponse, token: string) => {
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
  return response;
};

export const clearAuthCookie = (response: NextResponse) => {
  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    maxAge: 0,
    path: "/",
  });
  return response;
};

export const getAuthFromHeaderOrCookie = (request: NextRequest) => {
  const header = request.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const cookieToken = request.cookies.get(COOKIE_NAME)?.value;
  return bearer || cookieToken;
};

