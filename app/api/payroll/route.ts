import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireFeatureAccess } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import PayrollModel from "@/lib/models/Payroll";
import EmployeeModel from "@/lib/models/Employee";
import EmployeeNotificationModel from "@/lib/models/EmployeeNotification";
import { getPayrollDateForPeriod } from "@/lib/payroll-utils";

export async function GET(request: NextRequest) {
  try {
    // Employees can access their own payroll from employee portal without feature access
    // Admins accessing from admin portal need feature access
    const user = requireAuth(request, ["admin", "employee"]);
    
    // Admins need feature access for admin portal, employees don't need it for employee portal
    if (user.role === "admin") {
      await requireFeatureAccess(request, "payroll", ["admin"]);
    }
    
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const period = searchParams.get("period");
    const status = searchParams.get("status");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    const query: Record<string, unknown> = {};

    if (user.role === "employee") {
      // Employees can only see their own payrolls
      query.employeeId = user.id;
    } else {
      // Admins see all payrolls for their business unit
      query.businessUnit = user.businessUnit;
      if (employeeId) query.employeeId = employeeId;
    }

    if (period) {
      query.period = period;
    } else if (month && year) {
      const monthNum = String(Number(month)).padStart(2, "0");
      query.period = `${year}-${monthNum}`;
    }
    if (status) query.status = status;

    // Add pagination support (backward compatible)
    const usePagination = searchParams.has("limit") || searchParams.has("page") || searchParams.has("skip");
    const limit = usePagination ? parseInt(searchParams.get("limit") || "100", 10) : 10000;
    const skip = parseInt(searchParams.get("skip") || "0", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const actualSkip = skip || (page - 1) * limit;

    const payrolls = await PayrollModel.find(query)
      .sort({ period: -1, createdAt: -1 })
      .skip(usePagination ? actualSkip : 0)
      .limit(usePagination ? limit : 10000)
      .lean();

    const result = payrolls.map((p) => {
      const payroll = p as any;
      return {
        id: payroll._id.toString(),
        employeeId: payroll.employeeId,
        employeeName: payroll.employeeName,
        businessUnit: payroll.businessUnit,
        period: payroll.period,
        payrollDate: payroll.payrollDate ? new Date(payroll.payrollDate).toISOString() : undefined,
        baseSalary: payroll.baseSalary,
        allowances: payroll.allowances,
        deductions: payroll.deductions,
        grossPay: payroll.grossPay,
        netPay: payroll.netPay,
        status: payroll.status,
        notes: payroll.notes,
        employeeSignature: payroll.employeeSignature,
        signedAt: payroll.signedAt ? new Date(payroll.signedAt).toISOString() : undefined,
        employeeRejectionReason: payroll.employeeRejectionReason,
        employeeRejectedAt: payroll.employeeRejectedAt ? new Date(payroll.employeeRejectedAt).toISOString() : undefined,
        generatedBy: payroll.generatedBy,
        generatedAt: payroll.generatedAt ? new Date(payroll.generatedAt).toISOString() : undefined,
        completedAt: payroll.completedAt ? new Date(payroll.completedAt).toISOString() : undefined,
        createdByAdminId: payroll.createdByAdminId,
        updatedByAdminId: payroll.updatedByAdminId,
        employeeSignIp: payroll.employeeSignIp,
        employeeSignUserAgent: payroll.employeeSignUserAgent,
        createdAt: payroll.createdAt ? new Date(payroll.createdAt).toISOString() : undefined,
        updatedAt: payroll.updatedAt ? new Date(payroll.updatedAt).toISOString() : undefined,
      };
    });
    
    // Return paginated format if pagination params provided, otherwise return array for backward compatibility
    if (usePagination) {
      const total = await PayrollModel.countDocuments(query);
      return NextResponse.json({
        data: result,
        pagination: {
          total,
          page: page || Math.floor(actualSkip / limit) + 1,
          limit,
          skip: actualSkip,
          hasMore: actualSkip + limit < total,
        },
      });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireFeatureAccess(request, "payroll", ["admin"]);
    const body = await request.json().catch(() => null);

    if (
      !body?.employeeId ||
      !body?.period ||
      body?.baseSalary === undefined ||
      body?.baseSalary === null
    ) {
      return NextResponse.json(
        { error: "Employee ID, period, and base salary are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Validate employee exists and belongs to same business unit
    const employee = await EmployeeModel.findOne({
      _id: body.employeeId,
      businessUnit: user.businessUnit,
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Check if payroll already exists for this employee and period
    const existing = await PayrollModel.findOne({
      employeeId: body.employeeId,
      period: body.period,
    });

    if (existing) {
      return NextResponse.json(
        { error: "Payroll already exists for this employee and period" },
        { status: 400 }
      );
    }

    // Validate period format (YYYY-MM)
    const periodRegex = /^\d{4}-\d{2}$/;
    if (!periodRegex.test(body.period)) {
      return NextResponse.json(
        { error: "Period must be in format YYYY-MM" },
        { status: 400 }
      );
    }

    const allowances = body.allowances ?? 0;
    const deductions = body.deductions ?? 0;
    const grossPay = body.baseSalary + allowances;
    const netPay = grossPay - deductions;

    if (netPay < 0) {
      return NextResponse.json(
        { error: "Net pay cannot be negative" },
        { status: 400 }
      );
    }

    const employeeObj = employee.toObject();
    const employeeId = (employeeObj as { id?: string; _id: string }).id ?? employeeObj._id;

    // Derive default payroll date from employee payrollDate (day-of-month) if available
    let payrollDate: Date | undefined;
    if (typeof employee.payrollDate === "number") {
      try {
        payrollDate = getPayrollDateForPeriod(employee.payrollDate, body.period);
      } catch {
        payrollDate = undefined;
      }
    }

    // Allow optional override from body (ISO date string)
    if (body.payrollDate) {
      const override = new Date(body.payrollDate);
      if (Number.isNaN(override.getTime())) {
        return NextResponse.json(
          { error: "Invalid payrollDate. Expected ISO date string." },
          { status: 400 }
        );
      }
      payrollDate = override;
    }

    const payroll = await PayrollModel.create({
      employeeId,
      employeeName: employee.name,
      businessUnit: user.businessUnit,
      period: body.period,
      payrollDate,
      baseSalary: body.baseSalary,
      allowances,
      deductions,
      grossPay,
      netPay,
      status: "Generated",
      notes: body.notes ?? undefined,
      generatedBy: user.id,
      generatedAt: new Date(),
      createdByAdminId: user.id,
    });

    // Create notification for employee
    await EmployeeNotificationModel.create({
      employeeId,
      businessUnit: user.businessUnit,
      type: "payroll",
      title: "Payroll Created",
      message: `Your payroll for period ${body.period} has been created. Net Pay: ${netPay.toFixed(2)}`,
      relatedId: payroll._id,
      createdByAdminId: user.id,
    });

    const payrollObj = payroll.toObject();
    return NextResponse.json(payrollObj, { status: 201 });
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

export async function PUT(request: NextRequest) {
  try {
    const user = await requireFeatureAccess(request, "payroll", ["admin"]);
    const body = await request.json().catch(() => null);

    if (!body?.id) {
      return NextResponse.json({ error: "Payroll ID is required" }, { status: 400 });
    }

    await connectToDatabase();

    const payroll = await PayrollModel.findOne({
      _id: body.id,
      businessUnit: user.businessUnit,
    });

    if (!payroll) {
      return NextResponse.json({ error: "Payroll not found" }, { status: 404 });
    }

    // Allow editing monetary fields & notes for all statuses (including Completed)
    const hasMonetaryUpdates =
      body.baseSalary !== undefined ||
      body.allowances !== undefined ||
      body.deductions !== undefined ||
      body.notes !== undefined ||
      body.payrollDate !== undefined;

    if (hasMonetaryUpdates) {
      if (body.baseSalary !== undefined) {
        if (typeof body.baseSalary !== "number" || body.baseSalary <= 0) {
          return NextResponse.json(
            { error: "Base salary must be a positive number" },
            { status: 400 }
          );
        }
        payroll.baseSalary = body.baseSalary;
      }
      if (body.allowances !== undefined) {
        if (typeof body.allowances !== "number" || body.allowances < 0) {
          return NextResponse.json(
            { error: "Allowances cannot be negative" },
            { status: 400 }
          );
        }
        payroll.allowances = body.allowances;
      }
      if (body.deductions !== undefined) {
        if (typeof body.deductions !== "number" || body.deductions < 0) {
          return NextResponse.json(
            { error: "Deductions cannot be negative" },
            { status: 400 }
          );
        }
        payroll.deductions = body.deductions;
      }

      // Recalculate totals
      const grossPay = payroll.baseSalary + (payroll.allowances ?? 0);
      const netPay = grossPay - (payroll.deductions ?? 0);
      if (netPay < 0) {
        return NextResponse.json(
          { error: "Net pay cannot be negative" },
          { status: 400 }
        );
      }
      payroll.grossPay = grossPay;
      payroll.netPay = netPay;

      if (body.notes !== undefined) {
        payroll.notes = body.notes || undefined;
      }

      if (body.payrollDate !== undefined) {
        if (!body.payrollDate) {
          payroll.payrollDate = undefined;
        } else {
          const override = new Date(body.payrollDate);
          if (Number.isNaN(override.getTime())) {
            return NextResponse.json(
              { error: "Invalid payrollDate. Expected ISO date string." },
              { status: 400 }
            );
          }
          payroll.payrollDate = override;
        }
      }
    }

    if (body.status) {
      const from = payroll.status;
      const to = body.status as string;

      // Enforce simple status transition rules
      const allowTransition =
        (from === "Generated" && (to === "Pending Signature" || to === "Generated")) ||
        (from === "Rejected" && (to === "Pending Signature" || to === "Generated")) ||
        (from === "Signed" && (to === "Completed" || to === "Signed")) ||
        (from === "Completed" && to === "Completed");

      if (!allowTransition) {
        return NextResponse.json(
          { error: `Cannot change payroll status from ${from} to ${to}` },
          { status: 400 }
        );
      }

      if (to === "Completed" && payroll.status !== "Signed") {
        return NextResponse.json(
          { error: "Only signed payrolls can be marked as completed" },
          { status: 400 }
        );
      }

      payroll.status = to as any;
      if (to === "Completed") {
        payroll.completedAt = new Date();
      }
    }

    payroll.updatedByAdminId = user.id;

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

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireFeatureAccess(request, "payroll", ["admin"]);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Payroll ID is required" }, { status: 400 });
    }

    await connectToDatabase();

    const payroll = await PayrollModel.findOne({
      _id: id,
      businessUnit: user.businessUnit,
    });

    if (!payroll) {
      return NextResponse.json({ error: "Payroll not found" }, { status: 404 });
    }

    await PayrollModel.deleteOne({ _id: id });

    return NextResponse.json({ success: true, message: "Payroll deleted successfully" });
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
