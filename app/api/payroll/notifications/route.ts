import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import EmployeeModel from "@/lib/models/Employee";
import PayrollModel from "@/lib/models/Payroll";

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    await connectToDatabase();

    // Get current date
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentDay = now.getDate();

    // Current period in YYYY-MM format
    const currentPeriod = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;

    // Get all employees with payrollDate set for this business unit
    const employees = await EmployeeModel.find({
      businessUnit: user.businessUnit,
      payrollDate: { $exists: true, $ne: null },
    }).lean();

    const notifications: Array<{
      employeeId: string;
      employeeName: string;
      payrollDate: number;
      daysOverdue: number;
      period: string;
    }> = [];

    for (const emp of employees) {
      const employee = emp as any;
      const employeeId = employee._id;
      const payrollDate = employee.payrollDate as number;

      // Check if payroll date has passed this month
      if (payrollDate <= currentDay) {
        // Check if payroll already exists for this period
        const existingPayroll = await PayrollModel.findOne({
          employeeId,
          period: currentPeriod,
        });

        if (!existingPayroll) {
          // Calculate days overdue
          const daysOverdue = currentDay - payrollDate;

          notifications.push({
            employeeId,
            employeeName: employee.name,
            payrollDate,
            daysOverdue,
            period: currentPeriod,
          });
        }
      }
    }

    // Sort by days overdue (most overdue first)
    notifications.sort((a, b) => b.daysOverdue - a.daysOverdue);

    return NextResponse.json({
      count: notifications.length,
      notifications,
      period: currentPeriod,
    });
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
