import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import WorkOrderModel from "@/lib/models/WorkOrder";
import EmployeeModel from "@/lib/models/Employee";
import ServiceTypeModel from "@/lib/models/ServiceType";
import { mapWorkOrderToFormData } from "@/lib/pdf-mappers";
import { generatePdfFromHtml } from "@/lib/pdf-puppeteer";
import { generateWorkOrderHtml } from "@/lib/pdf-html-template";

export const runtime = "nodejs";
export const maxDuration = 60; // Allow up to 60s for PDF generation

/**
 * GET /api/work-orders/[id]/pdf
 * Generate and download PDF for a work order
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = `pdf-download-${Date.now()}`;
  const isDev = process.env.NODE_ENV !== "production";

  try {
    // Authenticate user
    const user = requireAuth(request, ["admin", "employee"]);

    await connectToDatabase();

    // Await params (Next.js 15+)
    const { id } = await params;

    // Fetch work order
    const workOrder = await WorkOrderModel.findById(id).lean();
    if (!workOrder) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 }
      );
    }

    // Authorization check: employees can only download their own work orders
    if (user.role === "employee" && workOrder.assignedEmployeeId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized: You can only download your own work orders" },
        { status: 403 }
      );
    }

    // Business unit check
    if (workOrder.businessUnit !== user.businessUnit) {
      return NextResponse.json(
        { error: "Unauthorized: Work order belongs to different business unit" },
        { status: 403 }
      );
    }

    // Fetch employee name if assigned
    let employeeName: string | undefined;
    if (workOrder.assignedEmployeeId) {
      const employee = await EmployeeModel.findById(workOrder.assignedEmployeeId).lean();
      employeeName = employee?.name;
    }

    // Fetch service type name if available
    let serviceTypeName: string | undefined;
    if (workOrder.serviceTypeId) {
      const serviceType = await ServiceTypeModel.findById(workOrder.serviceTypeId).lean();
      serviceTypeName = serviceType?.name;
    }

    // Determine portal type from business unit
    const portalTypeMap: Record<string, "printers-uae" | "g3-facility" | "it-service"> = {
      PrintersUAE: "printers-uae",
      G3: "g3-facility",
      IT: "it-service",
    };
    const portalType = portalTypeMap[workOrder.businessUnit] || "printers-uae";

    // Convert work order to form data
    const formData = mapWorkOrderToFormData(
      workOrder as any,
      employeeName,
      serviceTypeName
    );

    // Generate PDF
    const html = generateWorkOrderHtml(formData, portalType);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const safeName = (workOrder.customerName || "WorkOrder").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
    const filename = `WorkOrder_${safeName}_${timestamp}.pdf`;

    const pdfResult = await generatePdfFromHtml({ html, filename });

    // Return PDF as base64 for download
    return NextResponse.json({
      success: true,
      pdf: {
        base64: pdfResult.buffer.toString("base64"),
        filename: pdfResult.filename,
        mimeType: "application/pdf",
      },
    });
  } catch (error) {
    console.error(`[${requestId}] PDF download failed:`, error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate PDF";
    return NextResponse.json(
      {
        error: errorMessage,
        requestId: isDev ? requestId : undefined,
      },
      { status: 500 }
    );
  }
}
