"use client";

import { useState, useRef } from "react";
import Button from "./ui/Button";

interface PhotoPair {
  id: string;
  beforePhoto: string;
  afterPhoto: string;
}

interface MultiplePhotoAttachmentProps {
  label: string;
  value?: PhotoPair[];
  onChange: (photos: PhotoPair[]) => void;
  error?: string;
  required?: boolean;
}

export default function MultiplePhotoAttachment({
  label,
  value = [],
  onChange,
  error,
  required,
}: MultiplePhotoAttachmentProps) {
  const [showOptions, setShowOptions] = useState<{ pairId: string; type: "before" | "after" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, pairId: string, type: "before" | "after") => {
    const file = e.target.files?.[0];
    if (file && showOptions) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("File size must be less than 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const updatedPairs = value.map((pair) => {
          if (pair.id === pairId) {
            return {
              ...pair,
              [type === "before" ? "beforePhoto" : "afterPhoto"]: reader.result as string,
            };
          }
          return pair;
        });
        onChange(updatedPairs);
      };
      reader.readAsDataURL(file);
    }
    setShowOptions(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemovePhoto = (pairId: string, type: "before" | "after") => {
    const updatedPairs = value.map((pair) => {
      if (pair.id === pairId) {
        return {
          ...pair,
          [type === "before" ? "beforePhoto" : "afterPhoto"]: "",
        };
      }
      return pair;
    });
    onChange(updatedPairs);
  };

  const handleAddPair = () => {
    const newPair: PhotoPair = {
      id: `pair-${Date.now()}-${Math.random()}`,
      beforePhoto: "",
      afterPhoto: "",
    };
    onChange([...value, newPair]);
  };

  const handleRemovePair = (pairId: string) => {
    onChange(value.filter((pair) => pair.id !== pairId));
  };

  const openPhotoOptions = (pairId: string, type: "before" | "after") => {
    setShowOptions({ pairId, type });
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
        onChange={(e) => {
          if (showOptions) {
            handleFileChange(e, showOptions.pairId, showOptions.type);
          }
        }}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          if (showOptions) {
            handleFileChange(e, showOptions.pairId, showOptions.type);
          }
        }}
        className="hidden"
      />

      {/* Photo Pairs */}
      <div className="space-y-4">
        {value.length === 0 ? (
          <div className="text-center py-8 px-4 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
            <p className="text-gray-500 text-sm">No photos added yet. Click the button below to add before/after photos.</p>
          </div>
        ) : value.length > 0 && (
          value.map((pair, index) => (
            <div key={pair.id} className="border-2 border-gray-200 rounded-xl p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700">Photo Set {index + 1}</h4>
                {value.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePair(pair.id)}
                    className="text-red-600 hover:text-red-700 p-1"
                    title="Remove this photo set"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Before Photo */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Before Work Photo</label>
                  {pair.beforePhoto ? (
                    <div className="relative">
                      <div className="border-2 rounded-lg overflow-hidden bg-white">
                        <div className="relative">
                          <img
                            src={pair.beforePhoto}
                            alt="Before work"
                            className="w-full h-40 object-contain bg-gray-100"
                          />
                          <div className="absolute top-2 right-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() => openPhotoOptions(pair.id, "before")}
                              className="p-1.5 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
                              title="Change photo"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(pair.id, "before")}
                              className="p-1.5 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-colors"
                              title="Remove photo"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openPhotoOptions(pair.id, "before")}
                      className="w-full py-6 px-4 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 transition-all duration-200 cursor-pointer border-gray-300 bg-white hover:bg-gray-50 hover:border-blue-400"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-gray-700">Add Before Photo</span>
                    </button>
                  )}
                </div>

                {/* After Photo */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">After Work Photo</label>
                  {pair.afterPhoto ? (
                    <div className="relative">
                      <div className="border-2 rounded-lg overflow-hidden bg-white">
                        <div className="relative">
                          <img
                            src={pair.afterPhoto}
                            alt="After work"
                            className="w-full h-40 object-contain bg-gray-100"
                          />
                          <div className="absolute top-2 right-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() => openPhotoOptions(pair.id, "after")}
                              className="p-1.5 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
                              title="Change photo"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(pair.id, "after")}
                              className="p-1.5 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-colors"
                              title="Remove photo"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openPhotoOptions(pair.id, "after")}
                      className="w-full py-6 px-4 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 transition-all duration-200 cursor-pointer border-gray-300 bg-white hover:bg-gray-50 hover:border-blue-400"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-gray-700">Add After Photo</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add More Button */}
      <button
        type="button"
        onClick={handleAddPair}
        className="mt-4 w-full py-3 px-4 border-2 border-dashed border-emerald-400 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2 text-emerald-700 font-medium"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add More Before/After Photos
      </button>

      {/* Options Modal */}
      {showOptions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowOptions(null)}
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
              onClick={() => setShowOptions(null)}
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

