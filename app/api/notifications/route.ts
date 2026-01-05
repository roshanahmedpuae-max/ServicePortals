import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { AssetReminderModel, AssetDateModel } from "@/lib/models/Assets";
import LeaveNotificationModel from "@/lib/models/LeaveNotification";
import TicketNotificationModel from "@/lib/models/TicketNotification";
import AdvanceSalaryNotificationModel from "@/lib/models/AdvanceSalaryNotification";
import WorkOrderNotificationModel from "@/lib/models/WorkOrderNotification";

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    await connectToDatabase();

    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20", 10);

    const reminders = await AssetReminderModel.find({})
      .sort({ sentAt: -1 })
      .limit(limit);

    const dateIds = reminders.map((r) => r.assetDateId);
    const dates = await AssetDateModel.find({ _id: { $in: dateIds }, businessUnit: user.businessUnit });
    const dateMap = new Map<string, any>();
    dates.forEach((d) => {
      const obj = d.toObject() as any;
      dateMap.set(String(d._id), obj);
    });

    const assetItems = reminders
      .map((r) => {
        const obj = r.toObject() as any;
        const date = dateMap.get(String(r.assetDateId));
        if (!date) return null;
        return {
          id: obj.id ?? obj._id,
          sentAt: obj.sentAt,
          categoryKey: date.categoryKey,
          assetId: date.assetId,
          dateType: date.dateType,
          dateValue: date.dateValue,
          isOverdueEscalation: obj.isOverdueEscalation,
          type: "asset",
        };
      })
      .filter(Boolean);

    // Get unread leave notifications for this business unit
    const leaveNotifications = await LeaveNotificationModel.find({
      businessUnit: user.businessUnit,
      readAt: null,
    })
      .sort({ sentAt: -1 })
      .limit(limit)
      .lean();

    const leaveItems = leaveNotifications.map((n: any) => ({
      id: n._id,
      sentAt: n.sentAt,
      categoryKey: "leave_requests",
      assetId: n.leaveRequestId,
      dateType: "Leave Request",
      dateValue: n.startDate,
      employeeId: n.employeeId,
      employeeName: n.employeeName,
      leaveType: n.leaveType,
      endDate: n.endDate,
      type: "leave",
    }));

    // Get unread ticket notifications for this business unit
    const ticketNotifications = await TicketNotificationModel.find({
      businessUnit: user.businessUnit,
      readAt: null,
    })
      .sort({ sentAt: -1 })
      .limit(limit)
      .lean();

    const ticketItems = ticketNotifications.map((n: any) => ({
      id: n._id,
      sentAt: n.sentAt,
      categoryKey: "tickets",
      assetId: n.ticketId,
      dateType: "New Ticket",
      dateValue: n.sentAt,
      customerId: n.customerId,
      customerName: n.customerName,
      subject: n.subject,
      priority: n.priority,
      status: n.status,
      type: "ticket",
    }));

    // Get unread advance salary notifications for this business unit
    const advanceSalaryNotifications = await AdvanceSalaryNotificationModel.find({
      businessUnit: user.businessUnit,
      readAt: null,
    })
      .sort({ sentAt: -1 })
      .limit(limit)
      .lean();

    const advanceSalaryItems = advanceSalaryNotifications.map((n: any) => ({
      id: n._id,
      sentAt: n.sentAt,
      categoryKey: "advance_salary",
      assetId: n.advanceSalaryId,
      dateType: "Advance Salary Request",
      dateValue: n.requestedDate,
      employeeId: n.employeeId,
      employeeName: n.employeeName,
      amount: n.amount,
      status: n.status,
      type: "advance_salary",
    }));

    // Get unread work order notifications for this business unit
    const workOrderNotifications = await WorkOrderNotificationModel.find({
      businessUnit: user.businessUnit,
      readAt: null,
    })
      .sort({ sentAt: -1 })
      .limit(limit)
      .lean();

    const workOrderItems = workOrderNotifications.map((n: any) => ({
      id: n._id,
      sentAt: n.sentAt,
      categoryKey: "work_orders",
      assetId: n.workOrderId,
      dateType: "Work Order Submitted",
      dateValue: n.orderDateTime,
      employeeId: n.employeeId,
      employeeName: n.employeeName,
      customerName: n.customerName,
      workDescription: n.workDescription,
      locationAddress: n.locationAddress,
      status: n.status,
      type: "work_order",
    }));

    // Get asset dates approaching within 3 days
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const threeDaysFromNow = new Date(startOfToday);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    // Date types to monitor for 3-day alerts
    const monitoredDateTypes = [
      "registration_expiry", // Mulkiya Expiry Date
      "insurance_expiry", // Insurance Expiry Date
      "next_service_date", // Next Service Date
      "warranty_end", // Warranty End Date
      "next_payment_due", // Bill Date
      "contract_end", // Expiry Date (bills/contracts)
    ];

    const approachingDates = await AssetDateModel.find({
      businessUnit: user.businessUnit,
      dateType: { $in: monitoredDateTypes },
      dateValue: {
        $gte: startOfToday,
        $lte: threeDaysFromNow,
      },
      status: { $in: ["upcoming", "overdue"] },
    })
      .sort({ dateValue: 1 })
      .limit(limit)
      .lean();

    const dateTypeLabels: Record<string, string> = {
      registration_expiry: "Mulkiya Expiry Date",
      insurance_expiry: "Insurance Expiry Date",
      next_service_date: "Next Service Date",
      warranty_end: "Warranty End Date",
      next_payment_due: "Bill Date",
      contract_end: "Expiry Date",
    };

    const approachingItems = approachingDates.map((d: any) => {
      const dateValue = d.dateValue;
      const diffMs = dateValue.getTime() - startOfToday.getTime();
      const daysUntil = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const isOverdue = daysUntil < 0;
      
      return {
        id: `approaching_${d._id}`,
        sentAt: new Date().toISOString(), // Use current time for sorting
        categoryKey: d.categoryKey,
        assetId: d.assetId,
        dateType: dateTypeLabels[d.dateType] || d.dateType.replace(/_/g, " "),
        dateValue: dateValue,
        daysUntil: daysUntil,
        isOverdue: isOverdue,
        isApproaching: true,
        type: "asset_approaching",
      };
    });

    const allItems = [...assetItems, ...leaveItems, ...ticketItems, ...advanceSalaryItems, ...workOrderItems, ...approachingItems].sort(
      (a, b) => {
        const aTime = a?.sentAt ? new Date(a.sentAt).getTime() : 0;
        const bTime = b?.sentAt ? new Date(b.sentAt).getTime() : 0;
        return bTime - aTime;
      }
    );

    return NextResponse.json(allItems.slice(0, limit));
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}



