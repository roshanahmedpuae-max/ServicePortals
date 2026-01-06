import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireFeatureAccess } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import EmployeeNotificationModel from "@/lib/models/EmployeeNotification";
import CustomerNotificationModel from "@/lib/models/CustomerNotification";
import EmployeeModel from "@/lib/models/Employee";
import CustomerUserModel from "@/lib/models/CustomerUser";

export async function POST(request: NextRequest) {
  try {
    const user = await requireFeatureAccess(request, "notifications", ["admin"]);
    const body = await request.json().catch(() => null);

    if (!body?.title || !body?.message) {
      return NextResponse.json(
        { error: "Title and message are required" },
        { status: 400 }
      );
    }

    if (!body?.recipientType || !["employee", "customer", "both"].includes(body.recipientType)) {
      return NextResponse.json(
        { error: "recipientType must be 'employee', 'customer', or 'both'" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const notifications = [];

    // Helper function to send to employees
    const sendToEmployees = async (employeeIds?: string[]) => {
      if (employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0) {
        // Send to specific employees
        for (const employeeId of employeeIds) {
          const notification = await EmployeeNotificationModel.create({
            employeeId,
            businessUnit: user.businessUnit,
            type: "manual",
            title: body.title,
            message: body.message,
            createdByAdminId: user.id,
          });
          notifications.push(notification);
        }
      } else {
        // Send to all employees in business unit
        const employees = await EmployeeModel.find({
          businessUnit: user.businessUnit,
        }).lean();

        for (const employee of employees) {
          const notification = await EmployeeNotificationModel.create({
            employeeId: employee._id,
            businessUnit: user.businessUnit,
            type: "manual",
            title: body.title,
            message: body.message,
            createdByAdminId: user.id,
          });
          notifications.push(notification);
        }
      }
    };

    // Helper function to send to customers
    const sendToCustomers = async (customerIds?: string[]) => {
      if (customerIds && Array.isArray(customerIds) && customerIds.length > 0) {
        // Send to specific customers
        for (const customerId of customerIds) {
          const notification = await CustomerNotificationModel.create({
            customerId,
            businessUnit: user.businessUnit,
            type: "manual",
            title: body.title,
            message: body.message,
            createdByAdminId: user.id,
          });
          notifications.push(notification);
        }
      } else {
        // Send to all customers in business unit
        const customers = await CustomerUserModel.find({
          businessUnit: user.businessUnit,
        }).lean();

        for (const customer of customers) {
          const notification = await CustomerNotificationModel.create({
            customerId: customer._id,
            businessUnit: user.businessUnit,
            type: "manual",
            title: body.title,
            message: body.message,
            createdByAdminId: user.id,
          });
          notifications.push(notification);
        }
      }
    };

    if (body.recipientType === "employee") {
      await sendToEmployees(body.employeeIds);
    } else if (body.recipientType === "customer") {
      await sendToCustomers(body.customerIds);
    } else if (body.recipientType === "both") {
      // Send to both employees and customers
      await sendToEmployees(body.employeeIds);
      await sendToCustomers(body.customerIds);
    }

    return NextResponse.json({
      success: true,
      count: notifications.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = message === "Unauthorized" ? 401 : 500;
    console.error("POST /api/admin/notifications/manual failed", error);
    return NextResponse.json({ error: message }, { status });
  }
}
