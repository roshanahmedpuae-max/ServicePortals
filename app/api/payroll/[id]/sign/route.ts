import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import PayrollModel from "@/lib/models/Payroll";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request, ["employee"]);
    const body = await request.json().catch(() => null);

    if (!body?.signature) {
      return NextResponse.json(
        { error: "Signature is required" },
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
        { error: "Payroll not found or you don't have permission to sign it" },
        { status: 404 }
      );
    }

    // Validate payroll status - only allow signing when pending or generated
    if (payroll.status === "Signed" || payroll.status === "Completed") {
      return NextResponse.json(
        { error: "Payroll has already been signed" },
        { status: 400 }
      );
    }

    if (payroll.status === "Rejected") {
      return NextResponse.json(
        { error: "Rejected payrolls cannot be signed" },
        { status: 400 }
      );
    }

    // Optional confirmation checkbox from client
    if (body.confirmationChecked === false) {
      return NextResponse.json(
        { error: "You must confirm that the payroll details are correct before signing" },
        { status: 400 }
      );
    }

    // Capture basic audit metadata where available
    const ipHeader =
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      undefined;
    const ip = ipHeader ? ipHeader.split(",")[0].trim() : undefined;
    const userAgent = request.headers.get("user-agent") ?? undefined;

    // Update payroll with signature
    payroll.employeeSignature = body.signature;
    payroll.signedAt = new Date();
    payroll.status = "Signed";
    if (ip) {
      payroll.employeeSignIp = ip;
    }
    if (userAgent) {
      payroll.employeeSignUserAgent = userAgent;
    }
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
