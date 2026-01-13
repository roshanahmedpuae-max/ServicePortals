import { ServiceOrderFormData } from "./validation";
import { WorkOrder } from "./types";

/**
 * Portal-specific data mappers
 * These functions normalize form data from different portals into a consistent ServiceOrderFormData structure
 */

/**
 * Sanitize and normalize workPhotos array
 */
function sanitizeWorkPhotos(workPhotos: any[] | undefined | null): Array<{ id: string; beforePhoto: string; afterPhoto: string }> {
  if (!Array.isArray(workPhotos)) {
    return [];
  }

  return workPhotos
    .filter((pair): pair is { id?: string; beforePhoto?: string; afterPhoto?: string } => 
      pair !== null && 
      pair !== undefined && 
      typeof pair === 'object'
    )
    .filter(pair => pair.beforePhoto || pair.afterPhoto) // Only include pairs with at least one photo
    .map((pair, index) => ({
      id: pair.id || `photo-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 9)}`,
      beforePhoto: pair.beforePhoto || "",
      afterPhoto: pair.afterPhoto || "",
    }));
}

/**
 * Map Printers UAE form data to ServiceOrderFormData
 */
export function mapPrintersFormToServiceOrderData(data: any): ServiceOrderFormData {
  return {
    requesterName: data.requesterName || "",
    locationAddress: data.locationAddress || "",
    phone: data.phone || "",
    email: data.email || "",
    customerType: data.customerType || "Service and Repair",
    priorityLevel: data.priorityLevel || "Normal",
    orderDateTime: data.orderDateTime || new Date().toISOString().slice(0, 16),
    quotationReferenceNumber: data.quotationReferenceNumber || "",
    workAssignedTo: data.workAssignedTo || "",
    workBilledTo: data.workBilledTo || "",
    requestDescription: data.requestDescription || "",
    incompleteWorkExplanation: data.incompleteWorkExplanation || "",
    countReportPhoto: data.countReportPhoto || "",
    workPhotos: sanitizeWorkPhotos(data.workPhotos),
    workCompletedBy: data.workCompletedBy || "",
    completionDate: data.completionDate || new Date().toISOString().slice(0, 10),
    technicianSignature: data.technicianSignature || "",
    customerApprovalName: data.customerApprovalName || "",
    customerSignature: data.customerSignature || "",
    customerApprovalDate: data.customerApprovalDate || new Date().toISOString().slice(0, 10),
    paymentMethod: data.paymentMethod || "",
  };
}

/**
 * Map G3 Facility form data to ServiceOrderFormData
 * G3 Facility forms typically include multiple workPhotos pairs
 */
export function mapG3FormToServiceOrderData(data: any): ServiceOrderFormData {
  return {
    requesterName: data.requesterName || "",
    locationAddress: data.locationAddress || "",
    phone: data.phone || "",
    email: data.email || "",
    customerType: data.customerType || "General Maintenance",
    priorityLevel: data.priorityLevel || "Normal",
    orderDateTime: data.orderDateTime || new Date().toISOString().slice(0, 16),
    quotationReferenceNumber: data.quotationReferenceNumber || "",
    workAssignedTo: data.workAssignedTo || "",
    workBilledTo: data.workBilledTo || "",
    requestDescription: data.requestDescription || "",
    incompleteWorkExplanation: data.incompleteWorkExplanation || "",
    countReportPhoto: data.countReportPhoto || "",
    workPhotos: sanitizeWorkPhotos(data.workPhotos), // G3 forms use MultiplePhotoAttachment
    workCompletedBy: data.workCompletedBy || "",
    completionDate: data.completionDate || new Date().toISOString().slice(0, 10),
    technicianSignature: data.technicianSignature || "",
    customerApprovalName: data.customerApprovalName || "",
    customerSignature: data.customerSignature || "",
    customerApprovalDate: data.customerApprovalDate || new Date().toISOString().slice(0, 10),
    paymentMethod: data.paymentMethod || "",
  };
}

/**
 * Map IT Service form data to ServiceOrderFormData
 */
export function mapITFormToServiceOrderData(data: any): ServiceOrderFormData {
  return {
    requesterName: data.requesterName || "",
    locationAddress: data.locationAddress || "",
    phone: data.phone || "",
    email: data.email || "",
    customerType: data.customerType || "Hardware Repair",
    priorityLevel: data.priorityLevel || "Normal",
    orderDateTime: data.orderDateTime || new Date().toISOString().slice(0, 16),
    quotationReferenceNumber: data.quotationReferenceNumber || "",
    workAssignedTo: data.workAssignedTo || "",
    workBilledTo: data.workBilledTo || "",
    requestDescription: data.requestDescription || "",
    incompleteWorkExplanation: data.incompleteWorkExplanation || "",
    countReportPhoto: data.countReportPhoto || "",
    workPhotos: sanitizeWorkPhotos(data.workPhotos),
    workCompletedBy: data.workCompletedBy || "",
    completionDate: data.completionDate || new Date().toISOString().slice(0, 10),
    technicianSignature: data.technicianSignature || "",
    customerApprovalName: data.customerApprovalName || "",
    customerSignature: data.customerSignature || "",
    customerApprovalDate: data.customerApprovalDate || new Date().toISOString().slice(0, 10),
    paymentMethod: data.paymentMethod || "",
  };
}

/**
 * Universal mapper that detects portal type and applies appropriate mapping
 */
export function mapFormDataToServiceOrderData(data: any, portalType?: "printers-uae" | "g3-facility" | "it-service"): ServiceOrderFormData {
  // Auto-detect portal type if not provided
  if (!portalType) {
    const serviceType = data.serviceType;
    if (serviceType === "g3-facility") {
      portalType = "g3-facility";
    } else if (serviceType === "it-service") {
      portalType = "it-service";
    } else {
      portalType = "printers-uae"; // Default
    }
  }

  switch (portalType) {
    case "g3-facility":
      return mapG3FormToServiceOrderData(data);
    case "it-service":
      return mapITFormToServiceOrderData(data);
    case "printers-uae":
    default:
      return mapPrintersFormToServiceOrderData(data);
  }
}

/**
 * Convert WorkOrder document back to ServiceOrderFormData format for PDF generation
 * This is the reverse mapping of mapFormDataToServiceOrderData
 */
export function mapWorkOrderToFormData(
  workOrder: WorkOrder,
  employeeName?: string,
  serviceTypeName?: string
): ServiceOrderFormData {
  // Merge beforePhotos and afterPhotos into workPhotos array
  const workPhotos: Array<{ id: string; beforePhoto: string; afterPhoto: string }> = [];
  
  const maxLength = Math.max(
    workOrder.beforePhotos?.length || 0,
    workOrder.afterPhotos?.length || 0
  );
  
  for (let i = 0; i < maxLength; i++) {
    workPhotos.push({
      id: `photo-${i}-${Date.now()}`,
      beforePhoto: workOrder.beforePhotos?.[i] || "",
      afterPhoto: workOrder.afterPhotos?.[i] || "",
    });
  }

  // Format orderDateTime for datetime-local input (YYYY-MM-DDTHH:mm)
  const orderDate = workOrder.orderDateTime ? new Date(workOrder.orderDateTime) : new Date();
  const orderDateTimeFormatted = orderDate.toISOString().slice(0, 16);

  // Format completion date for date input (YYYY-MM-DD)
  const completionDateFormatted = workOrder.workCompletionDate
    ? new Date(workOrder.workCompletionDate).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  // Format approval date for date input (YYYY-MM-DD)
  const approvalDateFormatted = workOrder.approvalDate
    ? new Date(workOrder.approvalDate).toISOString().slice(0, 10)
    : completionDateFormatted;

  return {
    requesterName: workOrder.customerName || "",
    locationAddress: workOrder.locationAddress || "",
    phone: workOrder.customerPhone || "",
    email: "", // Not stored in WorkOrder
    customerType: serviceTypeName || "Service and Repair", // Default, should be fetched from serviceTypeId
    priorityLevel: "Normal", // Not stored in WorkOrder, use default
    orderDateTime: orderDateTimeFormatted,
    quotationReferenceNumber: workOrder.quotationReferenceNumber || "",
    workAssignedTo: employeeName || "", // Should be fetched from assignedEmployeeId
    workBilledTo: "", // Not stored in WorkOrder
    requestDescription: workOrder.workDescription || "",
    incompleteWorkExplanation: workOrder.findings || "",
    countReportPhoto: "", // Not stored in WorkOrder
    workPhotos: workPhotos,
    workCompletedBy: employeeName || "", // Should be fetched from assignedEmployeeId
    completionDate: completionDateFormatted,
    technicianSignature: workOrder.employeeSignature || "",
    customerApprovalName: workOrder.customerNameAtCompletion || workOrder.customerName || "",
    customerSignature: workOrder.customerSignature || "",
    customerApprovalDate: approvalDateFormatted,
    paymentMethod: (workOrder.paymentMethod && ["Cash", "Bank transfer", "POS Sale"].includes(workOrder.paymentMethod)) ? (workOrder.paymentMethod as "Cash" | "Bank transfer" | "POS Sale") : "",
  };
}
