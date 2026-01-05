"use client";

import { useRef, useEffect, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import Button from "./ui/Button";

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signature: string) => void;
  title: string;
  initialSignature?: string;
}

export default function SignatureModal({
  isOpen,
  onClose,
  onSave,
  title,
  initialSignature,
}: SignatureModalProps) {
  const sigRef = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && initialSignature && sigRef.current) {
      // Small delay to ensure canvas is ready
      setTimeout(() => {
        if (sigRef.current) {
          sigRef.current.fromDataURL(initialSignature);
          setIsEmpty(false);
        }
      }, 100);
    }
  }, [isOpen, initialSignature]);

  useEffect(() => {
    // Prevent body scroll when modal is open
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleClear = () => {
    if (sigRef.current) {
      sigRef.current.clear();
      setIsEmpty(true);
    }
  };

  const handleSave = () => {
    if (sigRef.current && !sigRef.current.isEmpty()) {
      const dataUrl = sigRef.current.toDataURL("image/png");
      onSave(dataUrl);
      onClose();
    }
  };

  const handleEnd = () => {
    if (sigRef.current) {
      setIsEmpty(sigRef.current.isEmpty());
    }
  };

  const handleCancel = () => {
    if (sigRef.current) {
      sigRef.current.clear();
    }
    setIsEmpty(true);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleCancel}
      />
      
      {/* Modal - Full width on mobile, slides up from bottom */}
      <div 
        ref={containerRef}
        className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:w-[95vw] sm:max-w-2xl sm:mx-4 overflow-hidden animate-fade-in max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 sm:px-6 sm:py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2 sm:gap-3">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              {title}
            </h3>
            {/* Close button for mobile */}
            <button 
              onClick={handleCancel}
              className="sm:hidden p-2 -mr-2 text-white/80 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-white/80 text-xs sm:text-sm mt-1">
            Sign using your finger or stylus
          </p>
        </div>

        {/* Signature Canvas */}
        <div className="p-4 sm:p-6 flex-1 overflow-auto">
          <div className="relative border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 overflow-hidden">
            <SignatureCanvas
              ref={sigRef}
              canvasProps={{
                className: "w-full touch-none",
                style: {
                  width: "100%",
                  height: "200px",
                  background: "transparent",
                },
              }}
              penColor="#1a1a2e"
              minWidth={2}
              maxWidth={4}
              velocityFilterWeight={0.7}
              onEnd={handleEnd}
            />
            
            {isEmpty && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center text-gray-400">
                  <svg className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <p className="text-sm">Sign here</p>
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <p className="text-xs text-gray-500 mt-3 text-center">
            Draw your signature in the box above
          </p>
        </div>

        {/* Actions - Stack on mobile */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 px-4 py-4 sm:px-6 bg-gray-50 border-t border-gray-100 flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            fullWidth
            className="sm:w-auto"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            }
          >
            Clear
          </Button>
          
          <div className="flex gap-2 sm:gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              fullWidth
              className="sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSave}
              disabled={isEmpty}
              fullWidth
              className="sm:w-auto"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              }
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
