import { ServiceOrderFormData } from "./validation";

// Service type configurations matching the application
const SERVICE_CONFIG = {
  "printers-uae": {
    name: "Printers UAE",
    shortName: "P",
    gradient: "linear-gradient(to right, #2563EB, #3B5CE8, #5155E5, #674EE2, #7D47DF, #9341DC, #9333EA)",
    primaryColor: "#2563EB",
    sectionColor: "#2563EB",
    tel: "(+971)-2-675",
    mobile: "(+971)-54-387-0181",
    email: "info@printersuae.com",
    locations: ["Business Bay, Dubai", "Mussafah & Sila, Abu Dhabi"],
  },
  "g3-facility": {
    name: "G3 Facility",
    shortName: "G3",
    gradient: "linear-gradient(to right, #059669, #10B981)",
    primaryColor: "#059669",
    sectionColor: "#059669",
    tel: "(+971)-2-675",
    mobile: "(+971)-54-387-0181",
    email: "info@g3facility.com",
    locations: ["Business Bay, Dubai", "Mussafah & Sila, Abu Dhabi"],
  },
  "it-service": {
    name: "IT Service",
    shortName: "IT",
    gradient: "linear-gradient(to right, #9333EA, #A855F7)",
    primaryColor: "#9333EA",
    sectionColor: "#9333EA",
    tel: "(+971)-2-675",
    mobile: "(+971)-54-387-0181",
    email: "info@itservice.com",
    locations: ["Business Bay, Dubai", "Mussafah & Sila, Abu Dhabi"],
  },
};

type ServiceType = keyof typeof SERVICE_CONFIG;

// Format date for display
function formatDate(dateString: string): string {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateString || "N/A";
  }
}

// Format datetime for display
function formatDateTime(dateTimeString: string): string {
  if (!dateTimeString) return "N/A";
  try {
    const date = new Date(dateTimeString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateTimeString || "N/A";
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Generate work photos HTML
function generateWorkPhotosHtml(workPhotos: ServiceOrderFormData["workPhotos"]): string {
  if (!workPhotos || workPhotos.length === 0) return "";

  const validPhotos = workPhotos.filter(
    (pair) => pair && (pair.beforePhoto || pair.afterPhoto)
  );

  if (validPhotos.length === 0) return "";

  return `
    <div class="photo-section">
      <p class="text-block-label">Before and After Work Photos:</p>
      ${validPhotos
        .map(
          (pair, index) => `
        <div class="photo-set">
          <p class="photo-set-title">Photo Set ${index + 1}</p>
          <div class="photo-grid">
            ${
              pair.beforePhoto
                ? `
              <div class="photo-item">
                <p class="photo-label">Before</p>
                <img src="${pair.beforePhoto}" alt="Before work ${index + 1}" class="photo-image" />
              </div>
            `
                : ""
            }
            ${
              pair.afterPhoto
                ? `
              <div class="photo-item">
                <p class="photo-label">After</p>
                <img src="${pair.afterPhoto}" alt="After work ${index + 1}" class="photo-image" />
              </div>
            `
                : ""
            }
          </div>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

/**
 * Generate HTML template for work order PDF
 * This template matches the design in PDFPreviewModal and pdf-template.tsx
 */
export function generateWorkOrderHtml(
  data: ServiceOrderFormData,
  serviceType: ServiceType = "printers-uae"
): string {
  const config = SERVICE_CONFIG[serviceType];

  // Sanitize data with defaults
  const safeData = {
    requesterName: escapeHtml(data.requesterName || ""),
    locationAddress: escapeHtml(data.locationAddress || ""),
    phone: escapeHtml(data.phone || ""),
    email: escapeHtml(data.email || ""),
    customerType: escapeHtml(data.customerType || "Service and Repair"),
    priorityLevel: data.priorityLevel || "Normal",
    orderDateTime: data.orderDateTime || new Date().toISOString(),
    quotationReferenceNumber: escapeHtml(data.quotationReferenceNumber || ""),
    workAssignedTo: escapeHtml(data.workAssignedTo || ""),
    workBilledTo: escapeHtml(data.workBilledTo || ""),
    requestDescription: escapeHtml(data.requestDescription || ""),
    incompleteWorkExplanation: escapeHtml(data.incompleteWorkExplanation || ""),
    countReportPhoto: data.countReportPhoto || "",
    workPhotos: data.workPhotos || [],
    workCompletedBy: escapeHtml(data.workCompletedBy || ""),
    completionDate: data.completionDate || new Date().toISOString().slice(0, 10),
    technicianSignature: data.technicianSignature || "",
    customerApprovalName: escapeHtml(data.customerApprovalName || ""),
    customerSignature: data.customerSignature || "",
    customerApprovalDate: data.customerApprovalDate || new Date().toISOString().slice(0, 10),
    paymentMethod: escapeHtml(data.paymentMethod || ""),
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Work Order - ${config.name}</title>
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 10px;
      line-height: 1.4;
      color: #1F2937;
      background: white;
    }
    
    .page {
      width: 595px;
      min-height: 842px;
      position: relative;
      background: white;
      padding-top: 70px;
      padding-bottom: 65px;
      padding-left: 35px;
      padding-right: 35px;
    }
    
    /* Header Styles */
    .header {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 70px;
      background: ${config.gradient};
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 35px;
    }
    
    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .logo-circle {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .logo-text {
      font-size: 18px;
      font-weight: bold;
      color: ${config.primaryColor};
    }
    
    .company-name {
      font-size: 18px;
      font-weight: bold;
      color: white;
    }
    
    .header-title {
      font-size: 14px;
      font-weight: bold;
      color: white;
    }
    
    /* Footer Styles */
    .footer {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 65px;
      background: ${config.gradient};
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 10px 20px;
    }
    
    .footer-column {
      flex: 1;
      padding: 0 8px;
    }
    
    .footer-divider {
      width: 1px;
      height: 35px;
      background: rgba(255, 255, 255, 0.3);
    }
    
    .footer-row {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 2px;
    }
    
    .footer-icon {
      width: 10px;
      height: 10px;
      fill: white;
    }
    
    .footer-text {
      font-size: 8px;
      color: white;
      line-height: 1.4;
    }
    
    /* Content Styles */
    .content {
      padding-top: 15px;
    }
    
    .section {
      margin-bottom: 12px;
    }
    
    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      padding-bottom: 5px;
      border-bottom: 1.5px solid #E5E7EB;
    }
    
    .section-icon {
      width: 22px;
      height: 22px;
      border-radius: 5px;
      background: ${config.sectionColor};
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 10px;
      font-weight: bold;
    }
    
    .section-title {
      font-size: 11px;
      font-weight: bold;
      color: #1F2937;
    }
    
    .grid {
      display: flex;
      gap: 15px;
    }
    
    .grid-col {
      flex: 1;
    }
    
    .row {
      display: flex;
      margin-bottom: 5px;
      padding: 3px 0;
    }
    
    .label {
      font-size: 9px;
      color: #6B7280;
      width: 130px;
      font-weight: bold;
    }
    
    .value {
      font-size: 9px;
      color: #1F2937;
      flex: 1;
    }
    
    .text-block {
      margin-bottom: 8px;
    }
    
    .text-block-label {
      font-size: 9px;
      color: #6B7280;
      font-weight: bold;
      margin-bottom: 3px;
    }
    
    .text-block-value {
      font-size: 9px;
      color: #1F2937;
      line-height: 1.4;
      padding: 8px;
      background: #F9FAFB;
      border-radius: 4px;
      border: 1px solid #E5E7EB;
    }
    
    /* Photo Styles */
    .photo-section {
      margin-top: 6px;
    }
    
    .photo-image {
      width: 160px;
      height: 120px;
      object-fit: contain;
      border-radius: 4px;
      border: 1px solid #E5E7EB;
    }
    
    .photo-set {
      margin-bottom: 12px;
      padding: 8px;
      background: #F9FAFB;
      border-radius: 4px;
      border: 1px solid #E5E7EB;
    }
    
    .photo-set-title {
      font-size: 8px;
      color: #6B7280;
      font-weight: bold;
      margin-bottom: 6px;
    }
    
    .photo-grid {
      display: flex;
      gap: 8px;
    }
    
    .photo-item {
      flex: 1;
    }
    
    .photo-label {
      font-size: 7px;
      color: #6B7280;
      margin-bottom: 4px;
    }
    
    .photo-item .photo-image {
      width: 120px;
      height: 90px;
    }
    
    /* Signature Styles */
    .signature-section {
      margin-top: 8px;
    }
    
    .signature-row {
      display: flex;
      justify-content: space-between;
      gap: 15px;
      margin-top: 8px;
    }
    
    .signature-box {
      flex: 1;
      padding: 8px;
      background: #F9FAFB;
      border-radius: 5px;
      border: 1px solid #E5E7EB;
    }
    
    .signature-label {
      font-size: 7px;
      color: #6B7280;
      font-weight: bold;
      margin-bottom: 4px;
    }
    
    .signature-image {
      height: 45px;
      object-fit: contain;
      margin-bottom: 4px;
      display: block;
    }
    
    .signature-name {
      font-size: 8px;
      color: #1F2937;
      border-top: 1px solid #1F2937;
      padding-top: 3px;
      text-align: center;
    }
    
    .signature-date {
      font-size: 7px;
      color: #6B7280;
      text-align: center;
      margin-top: 2px;
    }

    .count-report-photo {
      margin-top: 6px;
    }

    .count-report-photo .photo-image {
      width: 160px;
      height: 120px;
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <div class="logo-circle">
          <span class="logo-text">${config.shortName}</span>
        </div>
        <span class="company-name">${config.name}</span>
      </div>
      <span class="header-title">Work Order</span>
    </div>

    <!-- Content -->
    <div class="content">
      <!-- Section 1: Customer Details -->
      <div class="section">
        <div class="section-header">
          <div class="section-icon">1</div>
          <span class="section-title">Customer Details</span>
        </div>
        <div class="grid">
          <div class="grid-col">
            <div class="row">
              <span class="label">Customer Name:</span>
              <span class="value">${safeData.requesterName}</span>
            </div>
            <div class="row">
              <span class="label">Customer Phone Number:</span>
              <span class="value">${safeData.phone || "N/A"}</span>
            </div>
          </div>
          <div class="grid-col">
            <div class="row">
              <span class="label">Service Type:</span>
              <span class="value">${safeData.customerType}</span>
            </div>
          </div>
        </div>
        <div class="row">
          <span class="label">Location Address:</span>
          <span class="value">${safeData.locationAddress}</span>
        </div>
      </div>

      <!-- Section 2: Work Order Details -->
      <div class="section">
        <div class="section-header">
          <div class="section-icon">2</div>
          <span class="section-title">Work Order Details</span>
        </div>
        <div class="grid">
          <div class="grid-col">
            <div class="row">
              <span class="label">Order Date & Time:</span>
              <span class="value">${formatDateTime(safeData.orderDateTime)}</span>
            </div>
            ${
              safeData.quotationReferenceNumber
                ? `
            <div class="row">
              <span class="label">Quotation/Reference Number:</span>
              <span class="value">${safeData.quotationReferenceNumber}</span>
            </div>
            `
                : ""
            }
          </div>
        </div>
      </div>

      <!-- Section 3: Assigned Employee -->
      <div class="section">
        <div class="section-header">
          <div class="section-icon">3</div>
          <span class="section-title">Assigned Employee</span>
        </div>
        <div class="row">
          <span class="label">Work Assigned To:</span>
          <span class="value">${safeData.workAssignedTo}</span>
        </div>
      </div>

      <!-- Section 4: Work Descriptions -->
      <div class="section">
        <div class="section-header">
          <div class="section-icon">4</div>
          <span class="section-title">Work Descriptions</span>
        </div>
        
        <div class="text-block">
          <p class="text-block-label">Work Description:</p>
          <div class="text-block-value">${safeData.requestDescription}</div>
        </div>

        <div class="text-block">
          <p class="text-block-label">Findings:</p>
          <div class="text-block-value">${safeData.incompleteWorkExplanation || "N/A"}</div>
        </div>

        ${
          safeData.countReportPhoto
            ? `
        <div class="count-report-photo">
          <p class="text-block-label">Count Report Photo:</p>
          <img src="${safeData.countReportPhoto}" alt="Count Report" class="photo-image" />
        </div>
        `
            : ""
        }

        ${generateWorkPhotosHtml(safeData.workPhotos)}
      </div>

      <!-- Section 5: Approval & Sign-Off -->
      <div class="signature-section">
        <div class="section-header">
          <div class="section-icon">5</div>
          <span class="section-title">Approval & Sign-Off</span>
        </div>
        
        <div class="grid">
          <div class="grid-col">
            <div class="row">
              <span class="label">Work Completed By:</span>
              <span class="value">${safeData.workCompletedBy}</span>
            </div>
          </div>
          <div class="grid-col">
            <div class="row">
              <span class="label">Completion Date:</span>
              <span class="value">${formatDate(safeData.completionDate)}</span>
            </div>
          </div>
          ${
            safeData.paymentMethod
              ? `
          <div class="grid-col">
            <div class="row">
              <span class="label">Payment Method:</span>
              <span class="value">${safeData.paymentMethod}</span>
            </div>
          </div>
          `
              : ""
          }
        </div>

        <div class="signature-row">
          <div class="signature-box">
            <p class="signature-label">Technician Signature</p>
            ${
              safeData.technicianSignature
                ? `<img src="${safeData.technicianSignature}" alt="Technician Signature" class="signature-image" />`
                : ""
            }
            <p class="signature-name">${safeData.workCompletedBy}</p>
            <p class="signature-date">${formatDate(safeData.completionDate)}</p>
          </div>
          <div class="signature-box">
            <p class="signature-label">Customer Signature</p>
            ${
              safeData.customerSignature
                ? `<img src="${safeData.customerSignature}" alt="Customer Signature" class="signature-image" />`
                : ""
            }
            <p class="signature-name">${safeData.customerApprovalName}</p>
            <p class="signature-date">${formatDate(safeData.customerApprovalDate)}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-column">
        <div class="footer-row">
          <svg class="footer-icon" viewBox="0 0 16 16">
            <path d="M1.885.511a1.745 1.745 0 0 1 2.61.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z"/>
          </svg>
          <span class="footer-text">${config.tel}</span>
        </div>
        <div class="footer-row">
          <svg class="footer-icon" viewBox="0 0 320 512">
            <path d="M272 0H48C21.5 0 0 21.5 0 48v416c0 26.5 21.5 48 48 48h224c26.5 0 48-21.5 48-48V48c0-26.5-21.5-48-48-48zM160 480c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32z"/>
          </svg>
          <span class="footer-text">${config.mobile}</span>
        </div>
      </div>
      
      <div class="footer-divider"></div>
      
      <div class="footer-column">
        <div class="footer-row">
          <svg class="footer-icon" viewBox="0 0 512 512">
            <path d="M48 64C21.5 64 0 85.5 0 112c0 15.1 7.1 29.3 19.2 38.4L236.8 313.6c11.4 8.5 27 8.5 38.4 0L492.8 150.4c12.1-9.1 19.2-23.3 19.2-38.4c0-26.5-21.5-48-48-48H48zM0 176V384c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V176L294.4 339.2c-22.8 17.1-54 17.1-76.8 0L0 176z"/>
          </svg>
          <span class="footer-text">${config.email}</span>
        </div>
      </div>
      
      <div class="footer-divider"></div>
      
      <div class="footer-column">
        ${config.locations
          .map(
            (location) => `
        <div class="footer-row">
          <svg class="footer-icon" viewBox="0 0 384 512">
            <path d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/>
          </svg>
          <span class="footer-text">${location}</span>
        </div>
        `
          )
          .join("")}
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}
