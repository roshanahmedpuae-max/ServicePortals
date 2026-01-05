"use client";

import { useState, useRef } from "react";
import Button from "./ui/Button";

interface PhotoAttachmentProps {
  label: string;
  value?: string;
  onChange: (photo: string) => void;
  error?: string;
  required?: boolean;
}

export default function PhotoAttachment({
  label,
  value,
  onChange,
  error,
  required,
}: PhotoAttachmentProps) {
  const [showOptions, setShowOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("File size must be less than 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result && typeof reader.result === "string") {
          onChange(reader.result);
        } else {
          alert("Failed to read the image file. Please try again.");
        }
      };
      reader.onerror = () => {
        alert("Error reading the image file. Please try again.");
      };
      reader.readAsDataURL(file);
    }
    setShowOptions(false);
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
    setShowOptions(false);
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
    setShowOptions(false);
  };

  const handleRemove = () => {
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {value ? (
        // Show image preview
        <div className="relative">
          <div className={`
            border-2 rounded-xl overflow-hidden bg-gray-50
            ${error ? "border-red-400" : "border-gray-200"}
          `}>
            <div className="relative">
              <img
                src={value}
                alt="Attached photo"
                className="w-full h-48 object-contain bg-gray-100"
              />
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowOptions(true)}
                  className="p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
                  title="Change photo"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="p-2 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-colors"
                  title="Remove photo"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-3 bg-green-50 border-t border-green-200">
              <p className="text-sm text-green-700 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Photo attached successfully
              </p>
            </div>
          </div>
        </div>
      ) : (
        // Show attach button
        <button
          type="button"
          onClick={() => setShowOptions(true)}
          className={`
            w-full py-8 px-4 border-2 border-dashed rounded-xl
            flex flex-col items-center justify-center gap-3
            transition-all duration-200 cursor-pointer
            ${error
              ? "border-red-400 bg-red-50 hover:bg-red-100"
              : "border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-blue-400"
            }
          `}
        >
          <div className={`
            w-16 h-16 rounded-full flex items-center justify-center
            ${error ? "bg-red-100" : "bg-gradient-to-br from-blue-500 to-purple-500"}
          `}>
            <svg
              className={`w-8 h-8 ${error ? "text-red-500" : "text-white"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="text-center">
            <span className={`font-medium ${error ? "text-red-600" : "text-gray-700"}`}>
              Tap to Attach Photo
            </span>
            <p className="text-xs text-gray-400 mt-1">
              Count report of the printer
            </p>
          </div>
        </button>
      )}

      {/* Options Modal */}
      {showOptions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowOptions(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 mx-4 w-full max-w-sm animate-fade-in">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
              Choose Photo Source
            </h3>
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleCameraClick}
                className="w-full flex items-center gap-4 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
              >
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-800">Take Photo</p>
                  <p className="text-sm text-gray-500">Use camera to capture</p>
                </div>
              </button>

              <button
                type="button"
                onClick={handleFileClick}
                className="w-full flex items-center gap-4 p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
              >
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-800">Choose from Gallery</p>
                  <p className="text-sm text-gray-500">Select from your files</p>
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowOptions(false)}
              className="w-full mt-4 py-3 text-gray-600 hover:text-gray-800 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}














