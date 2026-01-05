"use client";

import { useState } from "react";
import SignatureModal from "./SignatureModal";

interface SignaturePadProps {
  label: string;
  value?: string;
  onChange: (signature: string) => void;
  error?: string;
  required?: boolean;
  signerType?: "customer" | "technician";
}

export default function SignaturePad({
  label,
  value,
  onChange,
  error,
  required,
  signerType = "customer",
}: SignaturePadProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSave = (signature: string) => {
    onChange(signature);
  };

  const handleClear = () => {
    onChange("");
  };

  const modalTitle = signerType === "customer" 
    ? "Customer Signature" 
    : "Technician Signature";

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {value ? (
        // Show signature preview when signed
        <div className="relative">
          <div 
            className={`
              border-2 rounded-xl p-3 bg-white cursor-pointer transition-all duration-200
              hover:border-blue-400 hover:shadow-md
              ${error ? "border-red-400" : "border-gray-200"}
            `}
            onClick={() => setIsModalOpen(true)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Signature captured
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-2 flex items-center justify-center">
              <img 
                src={value} 
                alt="Signature" 
                className="max-h-16 object-contain"
              />
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Tap to re-sign
            </p>
          </div>
        </div>
      ) : (
        // Show sign button when not signed
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={`
            w-full py-6 px-4 border-2 border-dashed rounded-xl
            flex flex-col items-center justify-center gap-2
            transition-all duration-200 cursor-pointer
            ${error 
              ? "border-red-400 bg-red-50 hover:bg-red-100" 
              : "border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-blue-400"
            }
          `}
        >
          <div className={`
            w-14 h-14 rounded-full flex items-center justify-center
            ${error ? "bg-red-100" : "bg-gradient-to-br from-blue-500 to-purple-500"}
          `}>
            <svg 
              className={`w-7 h-7 ${error ? "text-red-500" : "text-white"}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <span className={`font-medium ${error ? "text-red-600" : "text-gray-700"}`}>
            Tap to Sign
          </span>
          <span className="text-xs text-gray-400">
            {signerType === "customer" ? "Customer" : "Technician"} signature required
          </span>
        </button>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}

      <SignatureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        title={modalTitle}
        initialSignature={value}
      />
    </div>
  );
}
