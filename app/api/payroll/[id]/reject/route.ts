import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import PayrollModel from "@/lib/models/Payroll";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request, ["employee"]);
    const body = await request.json().catch(() => null);

    if (!body?.reason || typeof body.reason !== "string" || !body.reason.trim()) {
      return NextResponse.json(
        { error: "Rejection reason is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const resolvedParams = await params;

    const payroll = await PayrollModel.findOne({
      _id: resolvedParams.id,
      employeeId: user.id,
    });

    if (!payroll) {
      return NextResponse.json(
        { error: "Payroll not found or you don't have permission to reject it" },
        { status: 404 }
      );
    }

    if (payroll.status === "Signed" || payroll.status === "Completed") {
      return NextResponse.json(
        { error: "Signed or completed payrolls cannot be rejected" },
        { status: 400 }
      );
    }

    if (payroll.status !== "Pending Signature") {
      return NextResponse.json(
        { error: "Only payrolls pending your signature can be rejected" },
        { status: 400 }
      );
    }

    payroll.status = "Rejected";
    payroll.employeeRejectionReason = body.reason.trim();
    payroll.employeeRejectedAt = new Date();

    await payroll.save();

    const payrollObj = payroll.toObject();
    return NextResponse.json(payrollObj);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
