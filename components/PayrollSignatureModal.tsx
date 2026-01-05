"use client";

import { useState } from "react";
import SignaturePad from "./SignaturePad";
import { Payroll } from "@/lib/types";
import Button from "./ui/Button";
import toast from "react-hot-toast";

interface PayrollSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  payroll: Payroll | null;
  onSuccess: () => void;
}

export default function PayrollSignatureModal({
  isOpen,
  onClose,
  payroll,
  onSuccess,
}: PayrollSignatureModalProps) {
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);
   const [confirmed, setConfirmed] = useState(false);

  if (!payroll || !isOpen) return null;

  const handleSubmit = async () => {
    if (!signature) {
      toast.error("Please provide your signature");
      return;
    }

    if (!confirmed) {
      toast.error("Please confirm that the payroll details are correct before signing");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/payroll/${payroll.id}/sign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ signature, confirmationChecked: confirmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to sign payroll");
      }

      toast.success("Payroll signed successfully");
      setSignature("");
      setConfirmed(false);
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sign payroll");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        isOpen ? "" : "hidden"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-t-2xl">
          <h3 className="text-xl font-semibold text-white">Sign Payroll</h3>
          <p className="text-white/80 text-sm mt-1">
            Review and sign your payroll for {new Date(payroll.period + "-01").toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Payroll Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 space-y-3 border border-blue-100">
            <h4 className="font-semibold text-gray-900">Payroll Summary</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Base Salary:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {payroll.baseSalary.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Allowances:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {payroll.allowances.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Deductions:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {payroll.deductions.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Payroll Date:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {payroll.payrollDate
                    ? new Date(payroll.payrollDate).toLocaleDateString()
                    : "—"}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Net Pay:</span>
                <span className="ml-2 font-bold text-lg text-blue-600">
                  {payroll.netPay.toFixed(2)}
                </span>
              </div>
            </div>
            {payroll.notes && (
              <p className="text-sm text-gray-700">
                <span className="font-medium">Notes:</span> {payroll.notes}
              </p>
            )}
          </div>

          {/* Signature */}
          <div className="space-y-4">
            <SignaturePad
              label="Your Signature"
              value={signature}
              onChange={setSignature}
              required
              signerType="technician"
            />
            <div className="flex items-start gap-2">
              <input
                id="confirm-payroll"
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <label
                htmlFor="confirm-payroll"
                className="text-sm text-gray-700"
              >
                By signing, I confirm that the above payroll details are correct for{" "}
                {new Date(payroll.period + "-01").toLocaleString("default", {
                  month: "long",
                  year: "numeric",
                })}
                .
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100 rounded-b-2xl">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={!signature || !confirmed || submitting}
            loading={submitting}
          >
            Submit Signature
          </Button>
        </div>
      </div>
    </div>
  );
}
