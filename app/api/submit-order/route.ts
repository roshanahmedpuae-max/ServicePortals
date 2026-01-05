import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import { serviceOrderSchema, ServiceOrderFormData } from "@/lib/validation";
import WorkOrderPDF from "@/lib/pdf-template";
import { sendEmail, generateEmailHTML } from "@/lib/email";
import React from "react";

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();

    // Validate the form data
    const validationResult = serviceOrderSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      return NextResponse.json(
        { 
          error: "Validation failed", 
          details: errors 
        },
        { status: 400 }
      );
    }

    const data: ServiceOrderFormData = validationResult.data;

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      React.createElement(WorkOrderPDF, { data }) as React.ReactElement<DocumentProps>
    );

    // Convert to base64 for client-side download
    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `WorkOrder_${data.requesterName.replace(/\s+/g, "_")}_${timestamp}.pdf`;

    // Check if email configuration is available
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;

      try {
        // Send email to customer if email provided
        if (data.email) {
          await sendEmail({
            to: data.email,
            subject: `Work Order Confirmation - PrintersUAE`,
            html: generateEmailHTML({
              requesterName: data.requesterName,
              orderDateTime: data.orderDateTime,
              priorityLevel: data.priorityLevel,
              isAdmin: false,
            }),
            attachments: [
              {
                filename,
                content: Buffer.from(pdfBuffer),
                contentType: "application/pdf",
              },
            ],
          });
        }

        // Send email to admin
        await sendEmail({
          to: adminEmail,
          subject: `New Work Order - ${data.requesterName} [${data.priorityLevel}]`,
          html: generateEmailHTML({
            requesterName: data.requesterName,
            orderDateTime: data.orderDateTime,
            priorityLevel: data.priorityLevel,
            isAdmin: true,
          }),
          attachments: [
            {
              filename,
              content: Buffer.from(pdfBuffer),
              contentType: "application/pdf",
            },
          ],
        });
      } catch (emailError) {
        console.error("Email sending failed:", emailError);
        // Continue even if email fails - still return PDF
      }
    }

    return NextResponse.json({
      success: true,
      message: "Work order submitted successfully!",
      pdf: {
        base64: pdfBase64,
        filename,
        mimeType: "application/pdf",
      },
    });
  } catch (error) {
    console.error("Error processing work order:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to process work order. Please try again." },
      { status: 500 }
    );
  }
}
