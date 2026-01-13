"use client";

/**
 * G3FacilityForm - G3 Facility Management Form
 * 
 * This is a separate, standalone form component for G3 Facility service orders.
 * It should remain as a distinct entity and not be merged with other service forms.
 * 
 * Related forms:
 * - ServiceOrderForm.tsx (Printers UAE)
 * - ITServiceForm.tsx (IT Service & Support)
 */

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

import { serviceOrderSchema, ServiceOrderFormData, G3_TECHNICIANS, G3_SERVICE_TYPE_OPTIONS } from "@/lib/validation";
import { G3_CUSTOMERS } from "@/lib/customers";
import { BusinessUnit, WorkOrder } from "@/lib/types";
import { useBuOptions } from "@/lib/hooks/useBuOptions";
import Input from "./ui/Input";
import Textarea from "./ui/Textarea";
import Select from "./ui/Select";
import Button from "./ui/Button";
import AutocompleteInput from "./ui/AutocompleteInput";
import FormSection from "./FormSection";
import SignaturePad from "./SignaturePad";
import PhotoAttachment from "./PhotoAttachment";
import MultiplePhotoAttachment from "./MultiplePhotoAttachment";

// Get current date/time formatted for datetime-local input
function getCurrentDateTime() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

// Get current date formatted for date input
function getCurrentDate() {
  return new Date().toISOString().slice(0, 10);
}

interface G3FacilityFormProps {
  onBack: () => void;
  businessUnit: BusinessUnit;
  prefilledData?: WorkOrder;
}

export default function G3FacilityForm({ onBack, businessUnit, prefilledData }: G3FacilityFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { customers, serviceTypes, employees, loading, error } = useBuOptions(businessUnit);

  // Initialize with one empty photo pair
  const initialWorkPhotos = [{ id: `pair-${Date.now()}-${Math.random()}`, beforePhoto: "", afterPhoto: "" }];

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ServiceOrderFormData>({
    resolver: zodResolver(serviceOrderSchema),
    defaultValues: {
      requesterName: "",
      locationAddress: "",
      phone: "",
      customerType: "General Maintenance",
      priorityLevel: "Normal",
      orderDateTime: getCurrentDateTime(),
      quotationReferenceNumber: "",
      workAssignedTo: "",
      workBilledTo: "",
      requestDescription: "",
      incompleteWorkExplanation: "",
      countReportPhoto: "",
      workPhotos: initialWorkPhotos,
      workCompletedBy: "",
      completionDate: getCurrentDate(),
      technicianSignature: "",
      customerApprovalName: "",
      customerSignature: "",
      customerApprovalDate: getCurrentDate(),
      paymentMethod: "",
    },
  });

  const workAssignedTo = watch("workAssignedTo");
  const completionDate = watch("completionDate");

  // Auto-fill "Work Completed By" when "Work Assigned To" changes
  useEffect(() => {
    if (workAssignedTo) {
      setValue("workCompletedBy", workAssignedTo);
    }
  }, [workAssignedTo, setValue]);

  // Auto-fill "Approval Date" when "Completion Date" changes
  useEffect(() => {
    if (completionDate) {
      setValue("customerApprovalDate", completionDate);
    }
  }, [completionDate, setValue]);

  // Prefill form with work order data when provided
  useEffect(() => {
    if (prefilledData && employees.length > 0) {
      const orderDate = new Date(prefilledData.orderDateTime);
      const completionDate = prefilledData.workCompletionDate 
        ? new Date(prefilledData.workCompletionDate).toISOString().slice(0, 10)
        : getCurrentDate();
      const approvalDate = prefilledData.approvalDate
        ? new Date(prefilledData.approvalDate).toISOString().slice(0, 10)
        : completionDate;
      
      // Find employee name from ID
      const assignedEmployee = employees.find((e) => e.id === prefilledData.assignedEmployeeId);
      const employeeName = assignedEmployee?.name || "";
      
      // Find service type name from ID
      const serviceType = serviceTypes.find((s) => s.id === prefilledData.serviceTypeId);
      const serviceTypeName = serviceType?.name || "General Maintenance";
      
      // Map before/after photos to workPhotos format
      const workPhotos = [];
      if (prefilledData.beforePhotos && prefilledData.afterPhotos) {
        const maxLength = Math.max(prefilledData.beforePhotos.length, prefilledData.afterPhotos.length);
        for (let i = 0; i < maxLength; i++) {
          workPhotos.push({
            id: `pair-${Date.now()}-${i}`,
            beforePhoto: prefilledData.beforePhotos?.[i] || "",
            afterPhoto: prefilledData.afterPhotos?.[i] || "",
          });
        }
      }
      if (workPhotos.length === 0) {
        workPhotos.push({ id: `pair-${Date.now()}-0`, beforePhoto: "", afterPhoto: "" });
      }
      
      reset({
        requesterName: prefilledData.customerName || "",
        locationAddress: prefilledData.locationAddress || "",
        phone: prefilledData.customerPhone || "",
        customerType: serviceTypeName,
        priorityLevel: "Normal",
        orderDateTime: orderDate.toISOString().slice(0, 16),
        quotationReferenceNumber: prefilledData.quotationReferenceNumber || "",
        workAssignedTo: employeeName,
        workBilledTo: "",
        requestDescription: prefilledData.workDescription || "",
        incompleteWorkExplanation: prefilledData.findings || "",
        countReportPhoto: "",
        workPhotos: workPhotos,
        workCompletedBy: employeeName,
        completionDate: completionDate,
        technicianSignature: prefilledData.employeeSignature || "",
        customerApprovalName: prefilledData.customerNameAtCompletion || prefilledData.customerName || "",
        customerSignature: prefilledData.customerSignature || "",
        customerApprovalDate: approvalDate,
        paymentMethod: (prefilledData.paymentMethod && ["Cash", "Bank transfer", "POS Sale"].includes(prefilledData.paymentMethod)
          ? (prefilledData.paymentMethod as "Cash" | "Bank transfer" | "POS Sale")
          : "") as any,
      });
    }
  }, [prefilledData, reset, employees, serviceTypes]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const customerSuggestions =
    customers.length > 0 ? customers.map((c) => c.name) : [...G3_CUSTOMERS];

  const serviceTypeOptions =
    serviceTypes.length > 0
      ? serviceTypes.map((s) => ({ value: s.name, label: s.name }))
      : G3_SERVICE_TYPE_OPTIONS.map((c) => ({ value: c.value, label: c.label }));

  const employeeOptions =
    employees.length > 0
      ? employees.map((e) => ({
          value: e.name,
          label: e.role ? `${e.name} (${e.role})` : e.name,
        }))
      : G3_TECHNICIANS.map((t) => ({ value: t, label: t }));

  const onSubmit = async (data: ServiceOrderFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/submit-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...data,
          serviceType: "g3-facility",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || result.error || "Failed to submit work order");
      }

      toast.success("Work order submitted successfully!");
      reset();
      onBack();
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to submit work order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <form onSubmit={handleSubmit(onSubmit)} className="divide-y divide-gray-100 p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Section A - Customer Details */}
      <FormSection
        title="Customer Details"
        subtitle="Customer contact information"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        }
        className="animate-fade-in section-delay-1 opacity-0"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            name="requesterName"
            control={control}
            render={({ field }) => (
              <AutocompleteInput
                label="Customer Name"
                placeholder="Start typing to search G3 clients..."
                required
                suggestions={customerSuggestions}
                value={field.value}
                onChange={field.onChange}
                error={errors.requesterName?.message}
              />
            )}
          />
          <Controller
            name="customerType"
            control={control}
            render={({ field }) => (
              <Select
                label="Service Type"
                required
                options={serviceTypeOptions}
                error={errors.customerType?.message}
                {...field}
              />
            )}
          />
        </div>
        <Textarea
          label="Location Address"
          placeholder="Enter complete address including building, street, area, and city"
          rows={3}
          required
          error={errors.locationAddress?.message}
          {...register("locationAddress")}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Customer Phone Number"
            type="tel"
            placeholder="+971 50 123 4567"
            error={errors.phone?.message}
            {...register("phone")}
          />
        </div>
      </FormSection>

      {/* Section B - Work Order Details */}
      <FormSection
        title="Work Order Details"
        subtitle="Scheduling information"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        }
        className="animate-fade-in section-delay-2 opacity-0"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Order Date and Time"
            type="datetime-local"
            required
            error={errors.orderDateTime?.message}
            {...register("orderDateTime")}
          />
          <Input
            label="Quotation/Reference Number"
            placeholder="Quotation/Reference Number (optional)"
            error={errors.quotationReferenceNumber?.message}
            {...register("quotationReferenceNumber")}
          />
        </div>
      </FormSection>

      {/* Section C - Assignment & Billing */}
      <FormSection
        title="Assigned Employee"
        subtitle="Choose the technician assigned for service"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        }
        className="animate-fade-in section-delay-3 opacity-0"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            name="workAssignedTo"
            control={control}
            render={({ field }) => (
              <Select
                label="Work Assigned To"
                required
                placeholder="Select technician"
                options={employeeOptions}
                error={errors.workAssignedTo?.message}
                {...field}
              />
            )}
          />
        </div>
      </FormSection>

      {/* Section D - Work Descriptions */}
      <FormSection
        title="Work Descriptions"
        subtitle="Describe the facility service request and work details"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
        className="animate-fade-in section-delay-4 opacity-0"
      >
        <Textarea
          label="Work Description"
          placeholder="Describe the facility request, maintenance issue, or service required..."
          rows={5}
          required
          error={errors.requestDescription?.message}
          {...register("requestDescription")}
        />
        <Textarea
          label="Findings"
          placeholder="Enter findings here..."
          rows={3}
          error={errors.incompleteWorkExplanation?.message}
          {...register("incompleteWorkExplanation")}
        />
        <Controller
          name="workPhotos"
          control={control}
          render={({ field }) => (
            <MultiplePhotoAttachment
              label="Before and After Work Photos"
              value={field.value}
              onChange={field.onChange}
              error={errors.workPhotos?.message}
            />
          )}
        />
      </FormSection>

      {/* Section E - Approval & Sign-Off */}
      <FormSection
        title="Approval & Sign-Off"
        subtitle="Completion confirmation and signatures"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        className="animate-fade-in section-delay-5 opacity-0"
      >
        {/* Technician Section */}
        <div className="pb-6 border-b border-gray-100">
          <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">1</span>
            Technician Sign-Off
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller
              name="workCompletedBy"
              control={control}
              render={({ field }) => (
                <Select
                  label="Work Completed By"
                  required
                  disabled
                  placeholder="Select technician"
                options={employeeOptions}
                  error={errors.workCompletedBy?.message}
                  value={field.value || workAssignedTo}
                  onChange={field.onChange}
                />
              )}
            />
            <Input
              label="Completion Date"
              type="date"
              required
              error={errors.completionDate?.message}
              {...register("completionDate")}
            />
          </div>
          <div className="mt-4">
            <Controller
              name="technicianSignature"
              control={control}
              render={({ field }) => (
                <SignaturePad
                  label="Technician Signature"
                  required
                  signerType="technician"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.technicianSignature?.message}
                />
              )}
            />
          </div>
        </div>

        {/* Customer Section */}
        <div className="pt-6">
          <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-xs font-bold">2</span>
            Customer Approval
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Customer Name"
              placeholder="Enter customer's full name"
              required
              error={errors.customerApprovalName?.message}
              {...register("customerApprovalName")}
            />
            <Input
              label="Approval Date"
              type="date"
              required
              disabled
              error={errors.customerApprovalDate?.message}
              {...register("customerApprovalDate")}
            />
          </div>
          <div className="mt-4">
            <Controller
              name="paymentMethod"
              control={control}
              render={({ field }) => (
                <Select
                  label="Payment Method"
                  placeholder="Select payment method (optional)"
                  options={[
                    { value: "Cash", label: "Cash" },
                    { value: "Bank transfer", label: "Bank transfer" },
                    { value: "POS Sale", label: "POS Sale" },
                  ]}
                  error={errors.paymentMethod?.message}
                  value={field.value || ""}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
          <div className="mt-4">
            <Controller
              name="customerSignature"
              control={control}
              render={({ field }) => (
                <SignaturePad
                  label="Customer Signature"
                  required
                  signerType="customer"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.customerSignature?.message}
                />
              )}
            />
          </div>
        </div>
      </FormSection>

      {/* Submit Button - Sticky on mobile */}
      <div className="p-4 sm:p-6 bg-gray-50 mobile-sticky-footer">
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 sm:justify-end">
          {/* Reset button */}
          <Button
            type="button"
            variant="outline"
            onClick={() => reset()}
            disabled={isSubmitting}
            fullWidth
            className="sm:w-auto sm:order-1"
          >
            Reset Form
          </Button>
          
          {/* Primary action - Submit button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isSubmitting}
            fullWidth
            className="sm:w-auto sm:order-2 pulse-button bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            icon={
              !isSubmitting && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )
            }
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </div>
    </form>
    {loading && (
      <div className="px-4 py-2 text-sm text-gray-500">Loading latest options...</div>
    )}
    </>
  );
}

