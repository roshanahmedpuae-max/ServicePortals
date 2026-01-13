import { NextRequest, NextResponse } from "next/server";
import { serviceOrderSchema } from "@/lib/validation";
import { mapFormDataToServiceOrderData } from "@/lib/pdf-mappers";
import { generatePdfFromHtml, generatePdfFilename } from "@/lib/pdf-puppeteer";
import { generateWorkOrderHtml } from "@/lib/pdf-html-template";
import { sendEmail, generateEmailHTML } from "@/lib/email";
import { connectToDatabase } from "@/lib/db";
import WorkOrderModel from "@/lib/models/WorkOrder";
import CustomerModel from "@/lib/models/Customer";
import EmployeeModel from "@/lib/models/Employee";
import { BusinessUnit } from "@/lib/types";
import { uploadImage } from "@/lib/cloudinary";

// Ensure this route runs in the Node.js runtime for Puppeteer and DB operations
export const runtime = "nodejs";

// Allow up to 60 seconds for PDF generation + DB operations + email
export const maxDuration = 60;

/**
 * Map portal type to business unit
 */
function getBusinessUnit(portalType: string): BusinessUnit {
  const mapping: Record<string, BusinessUnit> = {
    "printers-uae": "PrintersUAE",
    "g3-facility": "G3",
    "it-service": "IT",
  };
  return mapping[portalType] || "PrintersUAE";
}

/**
 * Get employee ID by name (case-insensitive search)
 */
async function getEmployeeIdByName(name: string, businessUnit: BusinessUnit): Promise<string | undefined> {
  if (!name || name.trim() === "") return undefined;
  
  try {
    const employee = await EmployeeModel.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
      businessUnit,
    });
    return employee?._id?.toString();
  } catch (error) {
    console.warn("[submit-order] Could not find employee by name:", name, error);
    return undefined;
  }
}

/**
 * Upload base64 image to Cloudinary if it's a data URL
 */
async function uploadImageIfNeeded(imageData: string | undefined, folder: string): Promise<string> {
  if (!imageData) return "";
  if (!imageData.startsWith("data:")) return imageData; // Already a URL
  
  try {
    return await uploadImage(imageData, folder);
  } catch (error) {
    console.warn("[submit-order] Failed to upload image:", error);
    return imageData; // Return original if upload fails
  }
}

export async function POST(request: NextRequest) {
  // Generate request ID for tracking
  const requestId = `submit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const isDev = process.env.NODE_ENV !== "production";

  try {
    // Parse the request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error(`[${requestId}] JSON parse error:`, parseError);
      return NextResponse.json(
        {
          success: false,
          error: {
            type: "validation",
            message: "Invalid request format. Please check your form data.",
            details: undefined,
          },
          requestId: isDev ? requestId : undefined,
        },
        { status: 400 }
      );
    }

    // Determine portal/portalType from incoming body
    const portalType =
      (body?.serviceType as "printers-uae" | "g3-facility" | "it-service") || "printers-uae";
    const businessUnit = getBusinessUnit(portalType);

    // Normalize data BEFORE validation
    const normalizedData = mapFormDataToServiceOrderData(body, portalType);

    // Lightweight debug logging (keys only)
    if (isDev) {
      try {
        console.log(`[${requestId}] Work order submission request received`, {
          runtime: process.env.NEXT_RUNTIME || "unknown",
          serviceType: body?.serviceType,
          businessUnit,
          dataKeys: Object.keys(normalizedData || {}),
        });
      } catch {
        // ignore logging failures
      }
    }

    // Validate the normalized form data
    const validationResult = serviceOrderSchema.safeParse(normalizedData);

    if (!validationResult.success) {
      const errors = validationResult.error.flatten();
      console.error(`[${requestId}] Validation errors`, {
        fields: Object.keys(errors.fieldErrors || {}),
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            type: "validation",
            message: "Please fix the highlighted errors in the form.",
            details: errors.fieldErrors,
          },
          requestId: isDev ? requestId : undefined,
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Connect to database
    await connectToDatabase();
    console.log(`[${requestId}] Connected to database`);

    // Find or create customer
    let customer = await CustomerModel.findOne({
      name: { $regex: new RegExp(`^${data.requesterName.trim()}$`, "i") },
      businessUnit,
    });

    if (!customer) {
      console.log(`[${requestId}] Creating new customer: ${data.requesterName}`);
      customer = await CustomerModel.create({
        name: data.requesterName,
        contact: data.phone || data.email,
        businessUnit,
      });
    }

    // Get employee ID if work is assigned
    const assignedEmployeeId = await getEmployeeIdByName(data.workAssignedTo, businessUnit);

    // Upload images to Cloudinary
    const workOrderId = `wo-${Date.now()}`;
    const [technicianSignatureUrl, customerSignatureUrl, countReportPhotoUrl] = await Promise.all([
      uploadImageIfNeeded(data.technicianSignature, `work-orders/${workOrderId}/signatures`),
      uploadImageIfNeeded(data.customerSignature, `work-orders/${workOrderId}/signatures`),
      uploadImageIfNeeded(data.countReportPhoto, `work-orders/${workOrderId}/photos`),
    ]);

    // Upload before/after photos
    const beforePhotos: string[] = [];
    const afterPhotos: string[] = [];
    
    if (data.workPhotos && data.workPhotos.length > 0) {
      for (let i = 0; i < data.workPhotos.length; i++) {
        const pair = data.workPhotos[i];
        if (pair.beforePhoto) {
          const url = await uploadImageIfNeeded(pair.beforePhoto, `work-orders/${workOrderId}/before`);
          if (url) beforePhotos.push(url);
        }
        if (pair.afterPhoto) {
          const url = await uploadImageIfNeeded(pair.afterPhoto, `work-orders/${workOrderId}/after`);
          if (url) afterPhotos.push(url);
        }
      }
    }

    const now = new Date().toISOString();

    // Create work order in database
    const workOrder = await WorkOrderModel.create({
      businessUnit,
      customerId: customer._id,
      customerName: data.requesterName,
      serviceTypeId: undefined, // Could be mapped if needed
      assignedEmployeeId,
      workDescription: data.requestDescription,
      locationAddress: data.locationAddress,
      customerPhone: data.phone,
      orderDateTime: data.orderDateTime,
      quotationReferenceNumber: data.quotationReferenceNumber || undefined,
      paymentMethod: data.paymentMethod || undefined,
      findings: data.incompleteWorkExplanation || undefined,
      beforePhotos,
      afterPhotos,
      workCompletionDate: data.completionDate,
      approvalDate: data.customerApprovalDate,
      employeeSignature: technicianSignatureUrl,
      customerSignature: customerSignatureUrl,
      customerNameAtCompletion: data.customerApprovalName,
      status: "Submitted", // Form submission = completed work
      audit: {
        createdAt: now,
        updatedAt: now,
        createdBy: "form-submission",
        updatedBy: "form-submission",
      },
    });

    console.log(`[${requestId}] Work order created in database: ${workOrder._id}`);

    // Generate PDF using Puppeteer
    let pdfBuffer: Buffer;
    let filename: string;
    try {
      console.log(`[${requestId}] Starting PDF generation for submission via Puppeteer...`);
      
      // Generate HTML template from form data
      const html = generateWorkOrderHtml(data, portalType);
      filename = generatePdfFilename(data.requesterName);

      // Generate PDF from HTML
      const result = await generatePdfFromHtml({ html, filename });
      pdfBuffer = result.buffer;
      
      console.log(
        `[${requestId}] PDF generated successfully, size: ${pdfBuffer.length} bytes, filename: ${filename}`
      );

      // Fail fast if buffer somehow invalid at this stage
      if (!pdfBuffer || pdfBuffer.length < 1000) {
        throw new Error("Generated PDF buffer is empty or corrupted");
      }
    } catch (pdfError: unknown) {
      const errorMessage = pdfError instanceof Error ? pdfError.message : String(pdfError);
      console.error(`[${requestId}] PDF generation error:`, {
        type: "PDF_GENERATION_FAILED",
        message: errorMessage,
        stack: pdfError instanceof Error ? pdfError.stack : undefined,
      });
      return NextResponse.json(
        {
          success: false,
          error: {
            type: "pdf",
            message: errorMessage || "Failed to generate PDF for submission.",
            details: isDev ? { rawError: "PDF_GENERATION_FAILED" } : undefined,
          },
          workOrderId: workOrder._id, // Still return the created work order ID
          requestId: isDev ? requestId : undefined,
        },
        { status: 500 }
      );
    }

    // Check if email configuration is available
    let emailSent = false;
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;

      try {
        // Send email to customer if email provided
        if (data.email) {
          await sendEmail({
            to: data.email,
            subject: `Work Order Confirmation - ${businessUnit === "G3" ? "G3 Facility" : businessUnit === "IT" ? "IT Service" : "PrintersUAE"}`,
            html: generateEmailHTML({
              requesterName: data.requesterName,
              orderDateTime: data.orderDateTime,
              priorityLevel: data.priorityLevel,
              isAdmin: false,
            }),
            attachments: [
              {
                filename,
                content: pdfBuffer,
                contentType: "application/pdf",
              },
            ],
          });
        }

        // Send email to admin
        await sendEmail({
          to: adminEmail,
          subject: `New Work Order - ${data.requesterName} [${data.priorityLevel || "Normal"}]`,
          html: generateEmailHTML({
            requesterName: data.requesterName,
            orderDateTime: data.orderDateTime,
            priorityLevel: data.priorityLevel,
            isAdmin: true,
          }),
          attachments: [
            {
              filename,
              content: pdfBuffer,
              contentType: "application/pdf",
            },
          ],
        });
        emailSent = true;
      } catch (emailError) {
        console.error(`[${requestId}] Email sending failed:`, emailError);
        // Continue even if email fails - still return PDF
        // The PDF download should still work
      }
    }

    console.log(`[${requestId}] Work order submission completed successfully, workOrderId: ${workOrder._id}, emailSent: ${emailSent}`);

    // Convert buffer to base64 for client consumption (same shape as preview route)
    const base64 = Buffer.from(pdfBuffer).toString("base64");

    return NextResponse.json({
      success: true,
      message: emailSent
        ? "Work order submitted and saved successfully! Email notifications sent."
        : "Work order submitted and saved successfully! (Email notifications not configured or failed)",
      workOrderId: workOrder._id,
      pdf: {
        base64,
        filename,
        mimeType: "application/pdf",
      },
      requestId: isDev ? requestId : undefined,
    });
  } catch (error) {
    console.error(`[${requestId}] Unexpected error processing work order`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        success: false,
        error: {
          type: "internal",
          message: errorMessage,
          details: isDev && error instanceof Error ? { stack: error.stack } : undefined,
        },
        requestId: isDev ? requestId : undefined,
      },
      { status: 500 }
    );
  }
}
