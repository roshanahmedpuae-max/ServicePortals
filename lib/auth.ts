import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { AdminUser, BusinessUnit, Employee, Role, CustomerUser } from "@/lib/types";

const secret = process.env.AUTH_SECRET || "dev-secret-change-me";
const COOKIE_NAME = "auth_token";
// Token & cookie lifetime: 1 day (in seconds)
const MAX_AGE = 60 * 60 * 24; // 1 day
const MAX_AGE_MS = MAX_AGE * 1000;
// Refresh threshold: refresh token when it's older than 12 hours
const REFRESH_THRESHOLD_MS = 12 * 60 * 60 * 1000; // 12 hours

type TokenPayload = {
  id: string;
  role: Role;
  businessUnit: BusinessUnit;
  name?: string;
  email?: string;
  featureAccess?: string[]; // Array of feature access permissions
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
    // lingers, the token itself cannot be used beyond 1 day.
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
    featureAccess: employee.featureAccess || [],
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

export const hasFeatureAccess = (payload: TokenPayload, feature: string): boolean => {
  // Admins always have full access
  if (payload.role === "admin") {
    return true;
  }
  // Employees need explicit feature access
  return payload.featureAccess?.includes(feature) ?? false;
};

export const requireFeatureAccess = async (
  request: NextRequest,
  feature: string,
  allowedRoles: Role[] = ["admin", "employee"]
): Promise<TokenPayload> => {
  const payload = requireAuth(request, allowedRoles);
  // Admins always have full access - bypass feature check
  if (payload.role === "admin") {
    return payload;
  }
  
  // For employees, always fetch latest feature access from database to ensure we have current data
  if (payload.role === "employee") {
    try {
      const { connectToDatabase } = await import("@/lib/db");
      const EmployeeModel = (await import("@/lib/models/Employee")).default;
      await connectToDatabase();
      const employee = await EmployeeModel.findById(payload.id);
      if (employee) {
        const employeeObj = employee.toObject();
        payload.featureAccess = (employeeObj as any).featureAccess || [];
      } else {
        // Employee not found, set empty array
        payload.featureAccess = [];
      }
    } catch (error) {
      // If we can't fetch, use token's featureAccess or empty array
      payload.featureAccess = payload.featureAccess || [];
    }
  }
  
  // Check feature access
  if (!hasFeatureAccess(payload, feature)) {
    // Log for debugging (remove in production if needed)
    if (payload.role === "employee") {
      console.log(`Employee ${payload.id} attempted to access feature "${feature}" but has access to:`, payload.featureAccess);
    }
    const error = new Error(`Forbidden: Feature access required for "${feature}"`);
    (error as any).statusCode = 403;
    throw error;
  }
  return payload;
};

/**
 * Check if a token should be refreshed based on its age
 * Returns true if token is older than REFRESH_THRESHOLD_MS (12 hours)
 */
export const shouldRefreshToken = (payload: TokenPayload): boolean => {
  const ageMs = Date.now() - payload.issuedAt;
  return ageMs > REFRESH_THRESHOLD_MS;
};

/**
 * Refresh a token by issuing a new one with updated issuedAt timestamp
 * Preserves all user data from the original token
 */
export const refreshToken = (payload: TokenPayload): string => {
  return signToken({
    ...payload,
    issuedAt: Date.now(), // Update issuedAt to current time
  });
};
