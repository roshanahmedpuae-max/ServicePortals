import { NextRequest, NextResponse } from "next/server";
import { verifyToken, refreshToken, setAuthCookie, getAuthFromHeaderOrCookie } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import EmployeeModel from "@/lib/models/Employee";

/**
 * Refresh authentication token endpoint
 * 
 * This endpoint:
 * 1. Verifies the current token is valid
 * 2. Issues a new token with updated issuedAt timestamp
 * 3. For employees, fetches latest featureAccess from database
 * 4. Sets new cookie with refreshed token
 * 
 * This allows sessions to be extended while users are active,
 * preventing "Unauthorized" errors during normal use.
 */
export async function POST(request: NextRequest) {
  try {
    // Get token from cookie or Authorization header
    const token = getAuthFromHeaderOrCookie(request);
    
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    // Verify current token is valid
    const payload = verifyToken(token);
    
    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    // For employees, fetch latest featureAccess from database
    let updatedPayload = { ...payload };
    if (payload.role === "employee") {
      try {
        await connectToDatabase();
        const employee = await EmployeeModel.findById(payload.id);
        if (employee) {
          const employeeObj = employee.toObject();
          updatedPayload.featureAccess = (employeeObj as any).featureAccess || [];
        }
      } catch (error) {
        // If we can't fetch, keep existing featureAccess
        console.warn("[auth/refresh] Failed to fetch employee feature access:", error);
      }
    }

    // Issue new token with updated issuedAt
    const newToken = refreshToken(updatedPayload);

    // Create response with new token
    const response = NextResponse.json({
      success: true,
      message: "Token refreshed successfully",
      user: updatedPayload,
    });

    // Set new cookie with refreshed token
    setAuthCookie(response, newToken);

    return response;
  } catch (error) {
    console.error("[auth/refresh] Error refreshing token:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
