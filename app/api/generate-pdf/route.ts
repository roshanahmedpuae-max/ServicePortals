import { NextRequest, NextResponse } from "next/server";
import { serviceOrderSchema } from "@/lib/validation";
import { mapFormDataToServiceOrderData } from "@/lib/pdf-mappers";
import { generatePdfFromHtml, generatePdfFilename } from "@/lib/pdf-puppeteer";
import { generateWorkOrderHtml } from "@/lib/pdf-html-template";

// Ensure this route runs in the Node.js runtime for Puppeteer
export const runtime = "nodejs";

// Allow up to 30 seconds for PDF generation (Puppeteer can take time on cold starts)
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  // Generate request ID for tracking
  const requestId = `pdf-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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

    // Normalize data BEFORE validation
    const normalizedData = mapFormDataToServiceOrderData(body, portalType);

    // Lightweight debug logging (keys only)
    if (isDev) {
      try {
        console.log(`[${requestId}] PDF generation request received`, {
          runtime: process.env.NEXT_RUNTIME || "unknown",
          serviceType: body?.serviceType,
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

    // Generate PDF using Puppeteer (faster and better quality than @react-pdf/renderer)
    let pdfBuffer: Buffer;
    let filename: string;
    try {
      console.log(`[${requestId}] Starting PDF generation via Puppeteer...`);

      // Generate HTML template from form data
      const html = generateWorkOrderHtml(data, portalType);
      filename = generatePdfFilename(data.requesterName);

      // Generate PDF from HTML using Puppeteer
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
            message: errorMessage || "Failed to generate PDF preview.",
            details: isDev ? { rawError: "PDF_GENERATION_FAILED" } : undefined,
          },
          requestId: isDev ? requestId : undefined,
        },
        { status: 500 }
      );
    }

    console.log(`[${requestId}] PDF generation completed successfully`);

    // Convert buffer to base64 for client consumption
    const base64 = Buffer.from(pdfBuffer).toString("base64");

    return NextResponse.json({
      success: true,
      message: "PDF generated successfully!",
      pdf: {
        base64,
        filename,
        mimeType: "application/pdf",
      },
      requestId: isDev ? requestId : undefined,
    });
  } catch (error) {
    console.error(`[${requestId}] Unexpected error generating PDF`, {
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
