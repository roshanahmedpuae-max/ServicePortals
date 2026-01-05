import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import { serviceOrderSchema, ServiceOrderFormData } from "@/lib/validation";
import WorkOrderPDF from "@/lib/pdf-template";
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

    return NextResponse.json({
      success: true,
      message: "PDF generated successfully!",
      pdf: {
        base64: pdfBase64,
        filename,
        mimeType: "application/pdf",
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate PDF. Please try again." },
      { status: 500 }
    );
  }
}

