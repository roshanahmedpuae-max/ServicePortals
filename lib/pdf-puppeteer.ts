import puppeteerCore from "puppeteer-core";
import chromium from "@sparticuz/chromium";

interface PdfOptions {
  html: string;
  filename: string;
}

interface PdfResult {
  buffer: Buffer;
  filename: string;
}

/**
 * Generate PDF from HTML using Puppeteer
 * Uses full puppeteer in local/dev, and @sparticuz/chromium + puppeteer-core in serverless (Vercel).
 * 
 * Benefits over @react-pdf/renderer:
 * - 5-10x faster PDF generation
 * - Perfect CSS/HTML fidelity - same as browser preview
 * - No data sanitization issues
 * - Supports all modern CSS features including gradients
 */
export async function generatePdfFromHtml({ html, filename }: PdfOptions): Promise<PdfResult> {
  const isServerless = !!process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION !== undefined;

  let browser: any = null;
  
  try {
    if (isServerless) {
      // Serverless (Vercel) – use chromium + puppeteer-core
      chromium.setHeadlessMode = true;
      chromium.setGraphicsMode = false;

      browser = await puppeteerCore.launch({
        args: [
          ...chromium.args,
          "--disable-gpu",
          "--disable-dev-shm-usage",
          "--disable-setuid-sandbox",
          "--no-first-run",
          "--no-sandbox",
          "--no-zygote",
          "--single-process",
          "--disable-extensions",
        ],
        defaultViewport: {
          width: 595, // A4 width in points at 72 DPI
          height: 842, // A4 height in points
          deviceScaleFactor: 2, // Higher quality rendering
        },
        executablePath: await chromium.executablePath(),
        headless: true,
      });
    } else {
      // Local/dev – use full puppeteer (bundled Chromium) for easier setup on Windows
      const puppeteer = await import("puppeteer");
      browser = await puppeteer.launch({
        headless: true,
        defaultViewport: {
          width: 595,
          height: 842,
          deviceScaleFactor: 2,
        },
      });
    }

    const page = await browser.newPage();
    
    // Set content with proper wait conditions
    await page.setContent(html, { 
      waitUntil: ["networkidle0", "domcontentloaded"],
      timeout: 30000,
    });

    // Wait for any images to load (signatures, photos)
    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images)
          .filter(img => !img.complete)
          .map(img => new Promise((resolve) => {
            img.onload = img.onerror = resolve;
          }))
      );
    });

    // Generate PDF with A4 format
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "0mm",
        right: "0mm",
        bottom: "0mm",
        left: "0mm",
      },
    });

    return {
      buffer: Buffer.from(pdfBuffer),
      filename,
    };
  } catch (error) {
    console.error("[pdf-puppeteer] Error generating PDF:", error);
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Generate PDF filename from work order data
 */
export function generatePdfFilename(customerName: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeName = (customerName || "WorkOrder")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "");
  return `WorkOrder_${safeName}_${timestamp}.pdf`;
}
