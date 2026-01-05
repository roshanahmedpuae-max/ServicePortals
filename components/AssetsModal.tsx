"use client";

import { useEffect, useMemo, useState, ChangeEvent, useCallback } from "react";
import Button from "./ui/Button";
import Input from "./ui/Input";
import Select from "./ui/Select";
import Textarea from "./ui/Textarea";
import PhotoAttachment from "./PhotoAttachment";
import AutocompleteInput from "./ui/AutocompleteInput";
import toast from "react-hot-toast";
import { HiDocumentAdd } from "react-icons/hi";
import { MdDeleteForever } from "react-icons/md";

type AssetCategoryKey =
  | "vehicles"
  | "registrations"
  | "bills_contracts"
  | "it_equipment"
  | "employee_documents"
  | "rental_machines";

type AssetDoc = {
  id: string;
  categoryKey: string;
  assetId: string;
  fileName: string;
  fileUrl: string;
  fileType?: string;
  docType?: string;
  uploadedAt?: string;
  expiryDate?: string;
};

type EmployeeDocFormRow = {
  id: string;
  fileName: string;
  idNumber: string;
  expiryDate: string;
  fileData: string;
  existingDocId?: string;
};

interface AssetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryKey: AssetCategoryKey | null;
  authedFetch: (url: string, init?: RequestInit) => Promise<any>;
  onAssetChanged: () => Promise<void> | void;
  employees?: { id: string; name: string }[];
  customers?: { id: string; name: string }[];
  copierModels?: { id: string; _id?: string; model: string; manufacturer?: string }[];
}

type GenericAsset = Record<string, any> & { _id?: string; id?: string; name?: string; status?: string };

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "Active", label: "Active" },
  { value: "In Maintenance", label: "In Maintenance" },
  { value: "Expired", label: "Expired" },
  { value: "Cancelled", label: "Cancelled" },
] as const;

const CATEGORY_CONFIG: Record<
  AssetCategoryKey,
  {
    title: string;
    apiPath: string;
    listColumns: { key: string; label: string; fallback?: string }[];
    requiredFields: (keyof any)[];
  }
> = {
  vehicles: {
    title: "Vehicles",
    apiPath: "/api/assets/vehicles",
    listColumns: [
      { key: "name", label: "Name" },
      { key: "plateNumber", label: "Plate" },
      { key: "vehicleType", label: "Type", fallback: "-" },
      { key: "status", label: "Status", fallback: "Active" },
      { key: "registrationExpiryDate", label: "Reg. Expiry", fallback: "-" },
    ],
    requiredFields: ["name", "plateNumber"],
  },
  registrations: {
    title: "Registrations",
    apiPath: "/api/assets/registrations",
    listColumns: [
      { key: "name", label: "Name" },
      { key: "registrationNumber", label: "Number", fallback: "-" },
      { key: "expiryDate", label: "Expiry" },
      { key: "status", label: "Status", fallback: "Active" },
    ],
    requiredFields: ["name", "expiryDate"],
  },
  bills_contracts: {
    title: "Bills & Contracts",
    apiPath: "/api/assets/bills-contracts",
    listColumns: [
      { key: "name", label: "Name" },
      { key: "endDate", label: "End Date", fallback: "-" },
      { key: "status", label: "Status", fallback: "Active" },
    ],
    requiredFields: ["name"],
  },
  it_equipment: {
    title: "IT & Equipment",
    apiPath: "/api/assets/it-equipment",
    listColumns: [
      { key: "name", label: "Name" },
      { key: "category", label: "Category", fallback: "-" },
      { key: "assetTag", label: "Asset Tag", fallback: "-" },
      { key: "serialNumber", label: "Serial", fallback: "-" },
      { key: "status", label: "Status", fallback: "Active" },
    ],
    requiredFields: ["name"],
  },
  employee_documents: {
    title: "Employee Documents",
    apiPath: "/api/employees",
    listColumns: [
      { key: "name", label: "Employee" },
      { key: "role", label: "Role", fallback: "-" },
      { key: "status", label: "Status", fallback: "Available" },
    ],
    requiredFields: ["name", "role"],
  },
  rental_machines: {
    title: "Rental Machines",
    apiPath: "/api/assets/rental-machines",
    listColumns: [
      { key: "customerName", label: "Customer", fallback: "-" },
      { key: "modelName", label: "Model", fallback: "-" },
      { key: "serialNumber", label: "Serial", fallback: "-" },
      { key: "status", label: "Status", fallback: "Active" },
    ],
    requiredFields: ["customerId", "copierMachineModelId"],
  },
};

function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString();
}

export default function AssetsModal({
  isOpen,
  onClose,
  categoryKey,
  authedFetch,
  onAssetChanged,
  employees,
  customers,
  copierModels,
}: AssetsModalProps) {
  const [items, setItems] = useState<GenericAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<GenericAsset | null>(null);
  const [vehicleType, setVehicleType] = useState<string>("");
  const [assignedEmployeeId, setAssignedEmployeeId] = useState<string>("");
  const [vehiclePhoto, setVehiclePhoto] = useState<string>("");
  const [registrationCertificateFile, setRegistrationCertificateFile] = useState<string>("");
  const [billDocumentFile, setBillDocumentFile] = useState<string>("");
  const [employeeDocs, setEmployeeDocs] = useState<AssetDoc[]>([]);
  const [employeeDocEmployeeId, setEmployeeDocEmployeeId] = useState<string>("");
  const [employeeDocRows, setEmployeeDocRows] = useState<EmployeeDocFormRow[]>([
    { id: "row-0", fileName: "", idNumber: "", expiryDate: "", fileData: "" },
  ]);
  const [itEquipmentCategory, setItEquipmentCategory] = useState<string>("");
  const [linkedEmployeeId, setLinkedEmployeeId] = useState<string>("");
  const [employeeProfilePhoto, setEmployeeProfilePhoto] = useState<string>("");
  const [employeeProfilePhotoDocId, setEmployeeProfilePhotoDocId] = useState<string | null>(null);
  const [rentalCustomerId, setRentalCustomerId] = useState<string>("");
  const [rentalCustomerName, setRentalCustomerName] = useState<string>("");
  const [rentalCopierMachineModelId, setRentalCopierMachineModelId] = useState<string>("");
  const [showAddModelModal, setShowAddModelModal] = useState(false);
  const [newModelName, setNewModelName] = useState("");

  const config = useMemo(() => (categoryKey ? CATEGORY_CONFIG[categoryKey] : null), [categoryKey]);

  const resetState = () => {
    setItems([]);
    setSearch("");
    setStatus("");
    setShowForm(false);
    setSelected(null);
    setVehicleType("");
    setAssignedEmployeeId("");
    setVehiclePhoto("");
    setRegistrationCertificateFile("");
    setBillDocumentFile("");
    setEmployeeDocs([]);
    setEmployeeDocEmployeeId("");
    setEmployeeDocRows([{ id: "row-0", fileName: "", idNumber: "", expiryDate: "", fileData: "" }]);
    setItEquipmentCategory("");
    setLinkedEmployeeId("");
    setEmployeeProfilePhoto("");
    setEmployeeProfilePhotoDocId(null);
    setRentalCustomerId("");
    setRentalCustomerName("");
    setRentalCopierMachineModelId("");
    setShowAddModelModal(false);
    setNewModelName("");
  };

  useEffect(() => {
    if (categoryKey === "vehicles" && selected) {
      setVehicleType(selected?.vehicleType || "");
      setAssignedEmployeeId(selected?.assignedEmployeeId || "");
      setVehiclePhoto(selected?.photo || selected?.image || "");
    } else if (categoryKey !== "vehicles") {
      setVehicleType("");
      setAssignedEmployeeId("");
      setVehiclePhoto("");
    }
  }, [categoryKey, selected]);

  useEffect(() => {
    if (categoryKey === "it_equipment" && selected) {
      setItEquipmentCategory(selected.category || "");
      setLinkedEmployeeId(selected.linkedEmployeeId || "");
    } else if (categoryKey !== "it_equipment") {
      setItEquipmentCategory("");
      setLinkedEmployeeId("");
    }
  }, [categoryKey, selected]);

  useEffect(() => {
    if (categoryKey === "rental_machines" && selected) {
      setRentalCustomerId(selected.customerId || "");
      const customer = customers?.find((c) => c.id === selected.customerId);
      setRentalCustomerName(customer?.name || "");
      setRentalCopierMachineModelId(selected.copierMachineModelId || "");
    } else if (categoryKey !== "rental_machines") {
      setRentalCustomerId("");
      setRentalCustomerName("");
      setRentalCopierMachineModelId("");
    }
  }, [categoryKey, selected, customers]);

  // Extract load function to make it reusable - memoize with useCallback
  const loadItems = useCallback(async () => {
    if (!categoryKey) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      const list = await authedFetch(`${CATEGORY_CONFIG[categoryKey].apiPath}?${params.toString()}`);
      setItems(Array.isArray(list) ? list : []);
    } catch (error) {
      toast.error((error as Error).message || "Failed to load assets");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [categoryKey, search, status, authedFetch]);

  useEffect(() => {
    if (!isOpen || !categoryKey) {
      return;
    }
    loadItems();
  }, [isOpen, categoryKey, loadItems]);

  useEffect(() => {
    if (!isOpen || categoryKey !== "employee_documents" || !selected?.id) {
      setEmployeeDocs([]);
      setEmployeeProfilePhoto("");
      setEmployeeProfilePhotoDocId(null);
      return;
    }
    const loadDocs = async () => {
      try {
        const docs = await authedFetch(
          `/api/assets/documents?categoryKey=employees&assetId=${encodeURIComponent(
            selected.id as string
          )}`
        );
        const arr = Array.isArray(docs) ? docs : [];
        setEmployeeDocs(arr);
        const profile = arr.find((d: any) => d.docType === "profile_photo");
        setEmployeeProfilePhoto(profile?.fileUrl || "");
        setEmployeeProfilePhotoDocId(profile?.id ?? profile?._id ?? null);
      } catch {
        setEmployeeDocs([]);
        setEmployeeProfilePhoto("");
        setEmployeeProfilePhotoDocId(null);
      }
    };
    loadDocs();
  }, [isOpen, categoryKey, selected?.id, authedFetch]);

  // When editing an employee under Employee Documents, pre-fill the employee id
  useEffect(() => {
    if (categoryKey === "employee_documents" && selected?.id) {
      setEmployeeDocEmployeeId(selected.id as string);
    }
  }, [categoryKey, selected?.id]);

  // When editing (showForm) prefill document rows from existing docs (metadata only)
  useEffect(() => {
    if (
      categoryKey === "employee_documents" &&
      showForm &&
      selected?.id &&
      employeeDocs.length > 0
    ) {
      const docsWithoutProfile = employeeDocs.filter((doc) => doc.docType !== "profile_photo");
      setEmployeeDocRows(
        docsWithoutProfile.map((doc, index) => ({
          id: `row-${index}-${doc.id}`,
          fileName: doc.fileName || "",
          idNumber: doc.docType || "",
          expiryDate: doc.expiryDate
            ? new Date(doc.expiryDate).toISOString().slice(0, 10)
            : "",
          fileData: "",
          existingDocId: doc.id,
        }))
      );
    }
  }, [categoryKey, showForm, selected?.id, employeeDocs]);

  const addEmployeeDocRow = () => {
    setEmployeeDocRows((prev) => [
      ...prev,
      {
        id: `row-${prev.length}-${Date.now()}`,
        fileName: "",
        idNumber: "",
        expiryDate: "",
        fileData: "",
        existingDocId: undefined,
      },
    ]);
  };

  const updateEmployeeDocRow = (rowId: string, updates: Partial<EmployeeDocFormRow>) => {
    setEmployeeDocRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, ...updates } : row)));
  };

  const removeEmployeeDocRow = (rowId: string) => {
    setEmployeeDocRows((prev) => {
      if (prev.length === 1) {
        // Keep at least one empty row
        return [{ ...prev[0], fileName: "", idNumber: "", expiryDate: "", fileData: "" }];
      }
      return prev.filter((row) => row.id !== rowId);
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!categoryKey || !config) return;
    // Store form reference before async operations to prevent null errors
    const form = event.currentTarget;
    const formData = new FormData(form);
    const body: Record<string, any> = {};
    formData.forEach((value, key) => {
      if (value !== null && value !== "") {
        body[key] = value;
      }
    });

    if (categoryKey === "vehicles") {
      body.vehicleType = vehicleType || undefined;
      body.assignedEmployeeId = assignedEmployeeId || undefined;
      // Only include photo if it's a non-empty string
      if (vehiclePhoto && typeof vehiclePhoto === "string" && vehiclePhoto.trim().length > 0) {
        body.photo = vehiclePhoto;
      } else {
        // Don't include photo field if empty
        body.photo = undefined;
      }
    }
    if (categoryKey === "registrations") {
      if (registrationCertificateFile) {
        body.certificateFile = registrationCertificateFile;
      }
    }
    if (categoryKey === "bills_contracts") {
      if (billDocumentFile) {
        body.documentFile = billDocumentFile;
      }
    }

    if (categoryKey === "it_equipment") {
      body.category = itEquipmentCategory || undefined;
      body.linkedEmployeeId = linkedEmployeeId || undefined;
    }

    if (categoryKey === "rental_machines") {
      // Override form data with state values for rental machines
      body.customerId = rentalCustomerId || undefined;
      body.copierMachineModelId = rentalCopierMachineModelId || undefined;
    }

    if (categoryKey === "employee_documents") {
      const employeeId =
        (body.employeeId as string) || employeeDocEmployeeId || (selected?.id as string) || "";
      if (!employeeId) {
        toast.error("Please choose an employee");
        return;
      }

      const existingRows = employeeDocRows.filter((row) => !!row.existingDocId);
      const keptExistingIds = new Set(
        existingRows
          .map((row) => row.existingDocId)
          .filter((id): id is string => Boolean(id))
      );

      const rowsToCreate = employeeDocRows.filter(
        (row) => !row.existingDocId && row.fileName && row.fileData
      );

      const totalDocsAfter = keptExistingIds.size + rowsToCreate.length;
      if (totalDocsAfter === 0) {
        toast.error("At least one document should be uploaded");
        return;
      }

      setSubmitting(true);
      try {
        // Handle profile photo document (passport-size employee photo)
        const existingProfile = employeeDocs.find((doc) => doc.docType === "profile_photo");
        if (employeeProfilePhoto && employeeProfilePhoto.length > 0) {
          if (existingProfile?.id || employeeProfilePhotoDocId) {
            const id = (existingProfile?.id as string) ?? employeeProfilePhotoDocId;
            await authedFetch("/api/assets/documents", {
              method: "PUT",
              body: JSON.stringify({
                id,
                fileUrl: employeeProfilePhoto,
                fileType: "image",
                fileName: existingProfile?.fileName || "Profile Photo",
                docType: "profile_photo",
              }),
            });
          } else {
            await authedFetch("/api/assets/documents", {
              method: "POST",
              body: JSON.stringify({
                assetId: employeeId,
                categoryKey: "employees",
                fileName: "Profile Photo",
                fileUrl: employeeProfilePhoto,
                fileType: "image",
                docType: "profile_photo",
              }),
            });
          }
        } else if (!employeeProfilePhoto && existingProfile?.id) {
          // Photo cleared – delete existing profile photo document
          await authedFetch("/api/assets/documents", {
            method: "DELETE",
            body: JSON.stringify({ id: existingProfile.id }),
          });
        }

        // Delete documents that were removed in the UI
        const docsToDelete = employeeDocs.filter(
          (doc) => doc.docType !== "profile_photo" && !keptExistingIds.has(doc.id)
        );
        for (const doc of docsToDelete) {
          await authedFetch("/api/assets/documents", {
            method: "DELETE",
            body: JSON.stringify({ id: doc.id }),
          });
        }

        // Update existing documents (metadata and optionally new PDF)
        for (const row of existingRows) {
          if (!row.existingDocId) continue;
          const payload: Record<string, any> = {
            id: row.existingDocId,
            fileName: row.fileName,
          };
          if (row.idNumber !== undefined) {
            payload.docType = row.idNumber;
          }
          if (row.expiryDate !== undefined) {
            payload.expiryDate = row.expiryDate;
          }
          if (row.fileData) {
            // New PDF chosen -> replace existing file
            payload.fileUrl = row.fileData;
          }
          await authedFetch("/api/assets/documents", {
            method: "PUT",
            body: JSON.stringify(payload),
          });
        }

        // Create any new documents that were added
        for (const row of rowsToCreate) {
          const payload: Record<string, any> = {
            assetId: employeeId,
            categoryKey: "employees",
            fileName: row.fileName,
            fileUrl: row.fileData,
          };
          if (row.expiryDate) {
            payload.expiryDate = row.expiryDate;
          }
          if (row.idNumber) {
            payload.docType = row.idNumber;
          }
          await authedFetch("/api/assets/documents", {
            method: "POST",
            body: JSON.stringify(payload),
          });
        }

        // Refresh documents for this employee so details always match backend
        try {
          const refreshed = await authedFetch(
            `/api/assets/documents?categoryKey=employees&assetId=${encodeURIComponent(
              employeeId
            )}`
          );
          setEmployeeDocs(Array.isArray(refreshed) ? refreshed : []);
        } catch {
          // If refresh fails, keep previous state minus deleted docs
          setEmployeeDocs((prev) => prev.filter((doc) => !docsToDelete.find((d) => d.id === doc.id)));
        }

        toast.success("Employee documents updated");
        setShowForm(false);
        setEmployeeDocEmployeeId("");
        setEmployeeDocRows([
          { id: "row-0", fileName: "", idNumber: "", expiryDate: "", fileData: "" },
        ]);
        // Safely reset form if it still exists
        if (form && typeof form.reset === "function") {
          try {
            form.reset();
          } catch (error) {
            // Silently handle reset errors (form may be unmounted)
            console.warn("Form reset failed:", error);
          }
        }
      } catch (error) {
        toast.error((error as Error).message || "Failed to save document changes");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    for (const field of config.requiredFields) {
      if (!body[field as string]) {
        toast.error(`Please fill all required fields`);
        return;
      }
    }

    // Handle rental machines special validation
    if (categoryKey === "rental_machines") {
      if (!rentalCustomerId || !rentalCopierMachineModelId) {
        toast.error("Please select customer and copier machine model");
        return;
      }
      if (!body.uidNumber) {
        toast.error("Please enter UID Number");
        return;
      }
      // Ensure customerId is set in body
      body.customerId = rentalCustomerId;
      body.copierMachineModelId = rentalCopierMachineModelId;
    }

    setSubmitting(true);
    try {
      const method = selected ? "PUT" : "POST";
      if (selected) {
        // Use safe property access to prevent null errors
        body.id = (selected as any)?._id || (selected as any)?.id || undefined;
      }
      
      // Remove undefined values to avoid JSON.stringify issues
      const cleanBody = Object.fromEntries(
        Object.entries(body).filter(([_, value]) => value !== undefined)
      );
      
      const createdOrUpdated = await authedFetch(config.apiPath, {
        method,
        body: JSON.stringify(cleanBody),
      });
      
      if (!createdOrUpdated || typeof createdOrUpdated !== "object") {
        throw new Error("Failed to save asset: No response from server");
      }

      // Check for photo upload error - use safe property access
      const photoUploadError = (createdOrUpdated as any)?.photoUploadError;
      if (photoUploadError) {
        toast.error(
          `Photo upload failed: ${photoUploadError}. Vehicle saved without photo.`,
          { duration: 5000 }
        );
      }

      if (method === "POST") {
        // Ensure createdOrUpdated has required properties - use safe property access
        const responseId = (createdOrUpdated as any)?._id || (createdOrUpdated as any)?.id;
        if (!responseId) {
          throw new Error("Failed to save asset: Missing ID in response");
        }
        // Store the newly created vehicle with its photo URL for merging after refresh
        const newVehicleWithPhoto = createdOrUpdated && typeof createdOrUpdated === "object" 
          ? { ...createdOrUpdated } 
          : null;
        
        setItems((prev) => {
          // Ensure createdOrUpdated is valid before adding
          if (!createdOrUpdated || typeof createdOrUpdated !== "object") {
            return prev;
          }
          return [createdOrUpdated, ...prev];
        });
        if (!photoUploadError) {
          toast.success("Asset added");
        }
        
        // Reload items from server to ensure photos are displayed with proper URLs
        // After reload, merge the newly created vehicle's photo URL if it's missing from server response
        await loadItems();
        
        // Preserve photo URL from API response after refresh
        // This ensures the photo URL from the API (which includes Cloudinary URL) is always used
        if (newVehicleWithPhoto && categoryKey === "vehicles") {
          const photoUrl = (newVehicleWithPhoto as any)?.photo;
          if (photoUrl && typeof photoUrl === "string" && photoUrl.trim().length > 0) {
            setItems((prev) =>
              prev.map((it) => {
                if (!it) return it;
                const itId = it?._id || it?.id;
                // Always update with the photo URL from API response for the newly created vehicle
                if (itId === responseId) {
                  return { ...it, photo: photoUrl };
                }
                return it;
              })
            );
          }
        }
      } else {
        // Use safe property access
        const updatedId = (createdOrUpdated as any)?._id || (createdOrUpdated as any)?.id;
        if (!updatedId) {
          throw new Error("Failed to update asset: Missing ID in response");
        }
        setItems((prev) =>
          prev.map((it) => {
            if (!it) return it; // Preserve null/undefined items
            const itId = it?._id || it?.id;
            // Only update if IDs match and createdOrUpdated is valid
            if (itId === updatedId && createdOrUpdated && typeof createdOrUpdated === "object") {
              return createdOrUpdated;
            }
            return it;
          })
        );
        if (!photoUploadError) {
          toast.success("Asset updated");
        }
        
        // Reload items from server to ensure photos are displayed with proper URLs
        await loadItems();
      }

      setShowForm(false);
      setSelected(null);
      // Reset form and photo state - safely check if form exists
      if (form && typeof form.reset === "function") {
        try {
          form.reset();
        } catch (error) {
          // Silently handle reset errors (form may be unmounted)
          console.warn("Form reset failed:", error);
        }
      }
      if (categoryKey === "vehicles") {
        setVehiclePhoto("");
      }
      await Promise.resolve(onAssetChanged());
    } catch (error) {
      toast.error((error as Error).message || "Failed to save asset");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (asset: GenericAsset) => {
    if (!categoryKey || !config) return;
    const id = asset._id || asset.id;
    if (!id) return;
    if (!window.confirm("Are you sure you want to delete this asset?")) return;
    setSubmitting(true);
    try {
      await authedFetch(config.apiPath, {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
      setSelected(null);
      toast.success("Asset deleted");
      // Reload items from server to ensure list is up to date
      await loadItems();
      await Promise.resolve(onAssetChanged());
    } catch (error) {
      toast.error((error as Error).message || "Failed to delete asset");
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    resetState();
    onClose();
  };

  if (!isOpen || !config || !categoryKey) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-2 sm:px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[100vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 text-white">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold">{config.title}</h2>
            <p className="text-xs sm:text-sm text-white/80 mt-0.5">
              View, inspect and add {config.title.toLowerCase()} for this business unit.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="bg-white/10 text-white border-white/40 hover:bg-white/20"
              onClick={() => {
                setSelected(null);
                setShowForm(true);
              }}
            >
              + Add
            </Button>
            <button
              type="button"
              onClick={closeModal}
              className="p-2 rounded-full bg-white/15 hover:bg-white/25 text-white"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
          <div
            className={`md:w-2/3 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col ${
              showForm ? "hidden md:flex" : "flex"
            }`}
          >
            <div className="p-3 sm:p-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between border-b border-gray-100">
              <div className="flex-1 flex gap-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, number, tag..."
                  className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
                <Select
                  label=""
                  value={status}
                  onChange={(val) => setStatus(val)}
                  options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                  placeholder="Status"
                  className="!min-h-[40px]"
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent" />
                </div>
              ) : items.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">
                  No records found. Use the + Add button to create a new one.
                </div>
              ) : (
                <div className="p-3 sm:p-4 space-y-2">
                  {categoryKey === "vehicles" ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {items
                        .filter((asset) => asset && (asset._id || asset.id))
                        .map((asset) => {
                          if (!asset) return null;
                          const id = asset._id || asset.id;
                          if (!id) return null;
                          // Extract photo URL - check both photo and image fields, ensure it's a valid URL string
                          // Handle Cloudinary URLs and other valid image sources
                          const photoSrc = (asset?.photo || asset?.image || "").trim();
                          const hasValidPhoto = photoSrc && photoSrc.length > 0 &&
                            (photoSrc.startsWith("http://") || 
                             photoSrc.startsWith("https://") || 
                             photoSrc.startsWith("data:image/"));
                          // Get employee name from employees prop if not in asset
                          const employeeName = asset?.assignedEmployeeName || 
                            (asset?.assignedEmployeeId && employees?.find(e => e?.id === asset.assignedEmployeeId)?.name) ||
                            null;
                          return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setSelected(asset)}
                            className="group w-full text-left rounded-2xl border border-gray-100 hover:border-indigo-200 hover:shadow-md bg-white overflow-hidden flex flex-col"
                          >
                            <div className="relative h-32 w-full bg-gray-100">
                              {hasValidPhoto ? (
                                <img
                                  src={photoSrc}
                                  alt={asset?.name || "Vehicle"}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    // Fallback if image fails to load
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent && !parent.querySelector('.no-photo-fallback')) {
                                      const fallback = document.createElement('div');
                                      fallback.className = 'no-photo-fallback h-full w-full flex items-center justify-center text-gray-400 text-xs';
                                      fallback.textContent = 'No photo';
                                      parent.appendChild(fallback);
                                    }
                                  }}
                                  onLoad={(e) => {
                                    // Image loaded successfully - ensure any fallback is removed
                                    const target = e.target as HTMLImageElement;
                                    const parent = target.parentElement;
                                    const fallback = parent?.querySelector('.no-photo-fallback');
                                    if (fallback) {
                                      fallback.remove();
                                    }
                                  }}
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs">
                                  No photo
                                </div>
                              )}
                              <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide">
                                {asset?.plateNumber || "No plate"}
                              </div>
                            </div>
                            <div className="p-3 flex flex-col gap-1 text-xs sm:text-sm">
                              <div className="font-semibold text-gray-900 truncate">
                                {asset?.name || "Unnamed vehicle"}
                              </div>
                              <div className="text-gray-500 truncate">
                                {asset?.vehicleType || "Type not set"}
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-gray-500">
                                <span>{employeeName || "Unassigned"}</span>
                                <span className="uppercase tracking-wide text-indigo-500">
                                  Details
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <>
                      <div className="hidden md:grid grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1.2fr))] gap-2 text-xs font-medium text-gray-500 px-2 pb-1">
                        {config.listColumns.map((col) => (
                          <div key={col.key} className="truncate">
                            {col.label}
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        {items
                          .filter((asset) => asset && (asset._id || asset.id))
                          .map((asset) => {
                            if (!asset) return null;
                            const id = asset._id || asset.id;
                            if (!id) return null;
                            return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => setSelected(asset)}
                              className="w-full text-left rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-sm bg-white px-3 py-3 sm:px-4 sm:py-3 flex flex-col gap-1"
                            >
                              <div className="grid md:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1.2fr))] gap-2 items-center text-xs sm:text-sm">
                                {config.listColumns.map((col) => {
                                  const raw = asset?.[col.key];
                                  let value: string = "";
                                  if (col.key.toLowerCase().includes("date")) {
                                    value = formatDate(raw);
                                  } else {
                                    value = raw ?? col.fallback ?? "-";
                                  }
                                  return (
                                    <div key={col.key} className="truncate">
                                      {value || col.fallback || "-"}
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1">
                                <span>{id}</span>
                                <span className="uppercase tracking-wide">Tap to view details</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="md:w-1/3 flex flex-col bg-gray-50 min-h-0">
            <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <h3 className="text-sm font-semibold text-gray-800">
                {showForm ? (selected ? "Edit" : "Add New") : "Details"}
              </h3>
              {!showForm && selected && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowForm(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={submitting}
                    onClick={() => handleDelete(selected)}
                  >
                    Delete
                  </Button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 space-y-3 min-h-0">
              {showForm ? (
                <form className="space-y-3" onSubmit={handleSubmit}>
                  {categoryKey === "employee_documents" && (
                    <>
                      <Select
                        label="Employee"
                        name="employeeId"
                        value={employeeDocEmployeeId || (selected?.id as string) || ""}
                        onChange={(val) => setEmployeeDocEmployeeId(val)}
                        disabled={!!selected}
                        options={[
                          { value: "", label: "Select employee" },
                          ...(employees ?? []).map((e) => ({
                            value: e.id,
                            label: e.name,
                          })),
                        ]}
                        placeholder="Select employee"
                      />
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-500">Profile Photo (Passport size)</p>
                        <PhotoAttachment
                          label="Employee Profile Photo"
                          value={employeeProfilePhoto}
                          onChange={(val) => setEmployeeProfilePhoto(val)}
                        />
                      </div>
                      <div className="space-y-3">
                        {employeeDocRows.map((row, index) => (
                          <div
                            key={row.id}
                            className="rounded-xl border border-gray-200 bg-white/60 p-3 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-gray-500">
                                Document {index + 1}
                              </p>
                              <button
                                type="button"
                                className="text-rose-500 hover:text-rose-600"
                                onClick={() => removeEmployeeDocRow(row.id)}
                                title="Remove this document"
                              >
                                <MdDeleteForever className="w-5 h-5" />
                              </button>
                            </div>
                            <Input
                              label="File Name"
                              name={`fileName-${index}`}
                              placeholder="e.g. John Doe - Visa"
                              required={index === 0}
                              value={row.fileName}
                              onChange={(ev: ChangeEvent<HTMLInputElement>) =>
                                updateEmployeeDocRow(row.id, { fileName: ev.target.value })
                              }
                            />
                            <Input
                              label="ID number / Other number (if any)"
                              name={`idNumber-${index}`}
                              placeholder="e.g. Emirates ID, Labour Card No, etc."
                              value={row.idNumber}
                              onChange={(ev: ChangeEvent<HTMLInputElement>) =>
                                updateEmployeeDocRow(row.id, { idNumber: ev.target.value })
                              }
                            />
                            <Input
                              label="Expiry Date"
                              name={`expiryDate-${index}`}
                              type="date"
                              value={row.expiryDate}
                              onChange={(ev: ChangeEvent<HTMLInputElement>) =>
                                updateEmployeeDocRow(row.id, { expiryDate: ev.target.value })
                              }
                            />
                            <div className="w-full">
                              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Document File (PDF)
                              </label>
                              <input
                                type="file"
                                accept="application/pdf"
                                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  if (file.type !== "application/pdf") {
                                    toast.error("Please upload a PDF file");
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onload = () => {
                                    if (typeof reader.result === "string") {
                                      updateEmployeeDocRow(row.id, { fileData: reader.result });
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }}
                                className="w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                              />
                              {row.fileData && (
                                <p className="mt-1 text-xs text-emerald-600">
                                  PDF attached and ready to upload.
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {categoryKey === "vehicles" && (
                    <>
                      <Input
                        label="Vehicle Name"
                        name="name"
                        required
                        defaultValue={selected?.name || ""}
                      />
                      <Input
                        label="Plate Number"
                        name="plateNumber"
                        required
                        defaultValue={selected?.plateNumber || ""}
                      />
                      <Select
                        label="Vehicle Type"
                        name="vehicleType"
                        value={vehicleType}
                        onChange={(val) => setVehicleType(val)}
                        options={[
                          { value: "", label: "Select vehicle type" },
                          { value: "Sedan", label: "Sedan" },
                          { value: "SUV", label: "SUV / XUV" },
                          { value: "Hatchback", label: "Hatchback" },
                          { value: "Pickup", label: "Pickup" },
                          { value: "Van", label: "Van" },
                          { value: "Bus", label: "Bus" },
                          { value: "Truck", label: "Truck" },
                          { value: "Motorcycle", label: "Motorcycle" },
                          { value: "Other", label: "Other" },
                        ]}
                        placeholder="Select vehicle type"
                      />
                      <Select
                        label="Assigned Employee"
                        name="assignedEmployeeId"
                        value={assignedEmployeeId}
                        onChange={(val) => setAssignedEmployeeId(val)}
                        options={[
                          { value: "", label: "Select employee" },
                          ...(employees ?? []).map((e) => ({
                            value: e.id,
                            label: e.name,
                          })),
                        ]}
                        placeholder="Select employee"
                      />
                      <PhotoAttachment
                        label="Vehicle Photo"
                        value={vehiclePhoto}
                        onChange={(val) => setVehiclePhoto(val)}
                      />
                      <Input
                        label="Make & Model"
                        name="make"
                        defaultValue={
                          [selected?.make, selected?.model].filter(Boolean).join(" ").trim()
                        }
                      />
                      <Input
                        label="Year of Manufacture"
                        name="yearOfManufacture"
                        type="number"
                        defaultValue={selected?.yearOfManufacture || ""}
                      />
                      <Input label="Color" name="color" defaultValue={selected?.color || ""} />
                      <Input
                        label="Mulkiya Expiry Date"
                        name="registrationExpiryDate"
                        type="date"
                        defaultValue={
                          selected?.registrationExpiryDate
                            ? new Date(selected.registrationExpiryDate).toISOString().slice(0, 10)
                            : ""
                        }
                      />
                      <Input
                        label="Insurance Expiry Date"
                        name="insuranceExpiryDate"
                        type="date"
                        defaultValue={
                          selected?.insuranceExpiryDate
                            ? new Date(selected.insuranceExpiryDate).toISOString().slice(0, 10)
                            : ""
                        }
                      />
                      <Input
                        label="Next Service Date"
                        name="nextServiceDate"
                        type="date"
                        defaultValue={
                          selected?.nextServiceDate
                            ? new Date(selected.nextServiceDate).toISOString().slice(0, 10)
                            : ""
                        }
                      />
                      <Input
                        label="Service Interval (Months)"
                        name="serviceIntervalMonths"
                        type="number"
                        defaultValue={selected?.serviceIntervalMonths ?? ""}
                      />
                      <Textarea label="Notes" name="notes" defaultValue={selected?.notes || ""} />
                    </>
                  )}

                  {categoryKey === "registrations" && (
                    <>
                      <Input
                        label="Registration Name"
                        name="name"
                        required
                        defaultValue={selected?.name || ""}
                      />
                      <Input
                        label="Registration Number"
                        name="registrationNumber"
                        defaultValue={selected?.registrationNumber || ""}
                      />
                      <Input
                        label="Expiry Date"
                        name="expiryDate"
                        type="date"
                        required
                        defaultValue={
                          selected?.expiryDate
                            ? new Date(selected.expiryDate).toISOString().slice(0, 10)
                            : ""
                        }
                      />
                      <div className="w-full">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Registration Certificate (PDF)
                        </label>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.type !== "application/pdf") {
                              toast.error("Please upload a PDF file");
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = () => {
                              if (typeof reader.result === "string") {
                                setRegistrationCertificateFile(reader.result);
                              }
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                        {registrationCertificateFile && (
                          <p className="mt-1 text-xs text-emerald-600">PDF attached and ready to upload.</p>
                        )}
                        {selected?.certificateUrl && !registrationCertificateFile && (
                          <p className="mt-1 text-xs">
                            Current file:{" "}
                            <a
                              href={selected.certificateUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 hover:underline"
                            >
                              View certificate
                            </a>
                          </p>
                        )}
                      </div>
                      <Textarea label="Notes" name="notes" defaultValue={selected?.notes || ""} />
                    </>
                  )}

                  {categoryKey === "bills_contracts" && (
                    <>
                      <Input
                        label="Bill/Contract Name"
                        name="name"
                        required
                        defaultValue={selected?.name || ""}
                      />
                      <Input
                        label="Bill Date"
                        name="endDate"
                        type="date"
                        defaultValue={
                          selected?.endDate ? new Date(selected.endDate).toISOString().slice(0, 10) : ""
                        }
                      />
                      <div className="w-full">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Bill / Account Certificate (PDF)
                        </label>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.type !== "application/pdf") {
                              toast.error("Please upload a PDF file");
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = () => {
                              if (typeof reader.result === "string") {
                                setBillDocumentFile(reader.result);
                              }
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                        {billDocumentFile && (
                          <p className="mt-1 text-xs text-emerald-600">PDF attached and ready to upload.</p>
                        )}
                        {selected?.documentUrl && !billDocumentFile && (
                          <p className="mt-1 text-xs">
                            Current file:{" "}
                            <a
                              href={selected.documentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 hover:underline"
                            >
                              View document
                            </a>
                          </p>
                        )}
                      </div>
                      <Textarea label="Notes" name="notes" defaultValue={selected?.notes || ""} />
                    </>
                  )}

                  {categoryKey === "it_equipment" && (
                    <>
                      <Input
                        label="Asset Name"
                        name="name"
                        required
                        defaultValue={selected?.name || ""}
                      />
                      <Select
                        label="Type"
                        name="category"
                        value={itEquipmentCategory}
                        onChange={(val) => setItEquipmentCategory(val)}
                        options={[
                          { value: "", label: "Select type" },
                          { value: "Mobile", label: "Mobile" },
                          { value: "Laptop", label: "Laptop" },
                          { value: "Computer", label: "Computer" },
                          { value: "Software", label: "Software" },
                          { value: "Other", label: "Other" },
                        ]}
                        placeholder="Select equipment type"
                      />
                      <Input
                        label="Serial Number"
                        name="serialNumber"
                        defaultValue={selected?.serialNumber || ""}
                      />
                      <Select
                        label="Assigned Employee"
                        name="linkedEmployeeId"
                        value={linkedEmployeeId}
                        onChange={(val) => setLinkedEmployeeId(val)}
                        options={[
                          { value: "", label: "Select employee" },
                          ...(employees ?? []).map((e) => ({
                            value: e.id,
                            label: e.name,
                          })),
                        ]}
                        placeholder="Select employee using this device"
                      />
                      <Input
                        label="Warranty End Date"
                        name="warrantyEndDate"
                        type="date"
                        defaultValue={
                          selected?.warrantyEndDate
                            ? new Date(selected.warrantyEndDate).toISOString().slice(0, 10)
                            : ""
                        }
                      />
                      <Textarea label="Notes" name="notes" defaultValue={selected?.notes || ""} />
                    </>
                  )}

                  {categoryKey === "rental_machines" && (
                    <>
                      <AutocompleteInput
                        label="Customer"
                        required
                        placeholder="Search customer..."
                        suggestions={customers?.map((c) => c.name) || []}
                        value={rentalCustomerName}
                        onChange={(val) => {
                          setRentalCustomerName(val);
                          const match = customers?.find(
                            (c) => c.name.toLowerCase() === val.toLowerCase()
                          );
                          setRentalCustomerId(match ? match.id : "");
                        }}
                      />
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <label className="block text-sm font-medium text-gray-700 flex-1">
                            Copier Machine Model <span className="text-red-500">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowAddModelModal(true)}
                            className="text-xs px-3 py-1 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 flex items-center gap-1"
                          >
                            + Add Printer
                          </button>
                        </div>
                        <Select
                          label=""
                          name="copierMachineModelId"
                          value={rentalCopierMachineModelId}
                          onChange={(val) => setRentalCopierMachineModelId(val)}
                          options={[
                            { value: "", label: "Select copier machine model" },
                            ...(copierModels ?? []).map((m) => ({
                              value: m.id || m._id || "",
                              label: `${m.model}${m.manufacturer ? ` (${m.manufacturer})` : ""}`,
                            })),
                          ]}
                          placeholder="Select copier machine model"
                        />
                      </div>
                      <Input
                        label="UID Number"
                        name="uidNumber"
                        required
                        defaultValue={selected?.uidNumber || ""}
                      />
                      <Input
                        label="Serial Number"
                        name="serialNumber"
                        defaultValue={selected?.serialNumber || ""}
                      />
                      <Input
                        label="Location"
                        name="location"
                        defaultValue={selected?.location || ""}
                      />
                      <Input
                        label="Rental Start Date"
                        name="rentalStartDate"
                        type="date"
                        defaultValue={
                          selected?.rentalStartDate
                            ? new Date(selected.rentalStartDate).toISOString().slice(0, 10)
                            : ""
                        }
                      />
                      <Input
                        label="Rental End Date"
                        name="rentalEndDate"
                        type="date"
                        defaultValue={
                          selected?.rentalEndDate
                            ? new Date(selected.rentalEndDate).toISOString().slice(0, 10)
                            : ""
                        }
                      />
                      <Textarea label="Notes" name="notes" defaultValue={selected?.notes || ""} />
                    </>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    {categoryKey === "employee_documents" && !selected && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="flex items-center gap-1"
                        onClick={addEmployeeDocRow}
                      >
                        <HiDocumentAdd className="w-4 h-4" />
                        Add document
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setShowForm(false);
                        setSelected(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" loading={submitting}>
                      Save
                    </Button>
                  </div>
                </form>
              ) : selected ? (
                <div className="space-y-2 text-sm text-gray-700">
                  {/* Photo display for vehicles */}
                  {categoryKey === "vehicles" && (selected.photo || selected.image) && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-gray-500 mb-1.5">Photo</p>
                      <div className="relative w-full max-w-xs mx-auto bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                        <img
                          src={selected.photo || selected.image}
                          alt={selected.name || "Vehicle"}
                          className="w-full h-auto max-h-48 object-contain"
                          onError={(e) => {
                            // Fallback if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent && !parent.querySelector('.no-photo-fallback-details')) {
                              const fallback = document.createElement('div');
                              fallback.className = 'no-photo-fallback-details w-full h-32 flex items-center justify-center text-gray-400 text-xs bg-gray-50';
                              fallback.textContent = 'Photo failed to load';
                              parent.appendChild(fallback);
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">Name</p>
                    <p className="font-medium">{selected.name || "-"}</p>
                  </div>

                  {categoryKey === "employee_documents" ? (
                    <>
                      {selected.role && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-0.5">Role</p>
                          <p className="text-sm break-words">{selected.role}</p>
                        </div>
                      )}
                      {selected.status && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-0.5">Status</p>
                          <p className="text-sm break-words">{selected.status}</p>
                        </div>
                      )}
                      {typeof selected.payrollDate !== "undefined" && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-0.5">
                            Payroll Date (Day of month)
                          </p>
                          <p className="text-sm break-words">
                            {selected.payrollDate ?? "-"}
                          </p>
                        </div>
                      )}

                      <div className="pt-2 border-t border-gray-200 mt-2">
                        <p className="text-xs font-semibold text-gray-500 mb-1">
                          HR Documents
                        </p>
                        {employeeDocs.length === 0 ? (
                          <p className="text-xs text-gray-500">
                            No documents uploaded for this employee yet.
                          </p>
                        ) : (
                          <ul className="space-y-1 text-xs">
                            {employeeDocs.map((doc) => (
                              <li
                                key={doc.id}
                                className="flex items-start justify-between gap-2 rounded-lg border border-gray-100 bg-white px-2 py-1.5"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-800 truncate">
                                    Document
                                  </p>
                                  <p className="text-[11px] text-gray-500 truncate">
                                    {doc.fileName}
                                  </p>
                                  {doc.docType && (
                                    <p className="text-[11px] text-gray-500 truncate">
                                      ID / Number: {doc.docType}
                                    </p>
                                  )}
                                  {doc.expiryDate && (
                                    <p className="text-[11px] text-gray-500">
                                      Expiry: {formatDate(doc.expiryDate)}
                                    </p>
                                  )}
                                </div>
                                <a
                                  href={doc.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] font-semibold text-indigo-600 hover:underline flex-shrink-0"
                                >
                                  View
                                </a>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      {Object.keys(selected)
                        .filter((key) => {
                          // Exclude photo/image from generic display (already shown above for vehicles)
                          const excludedKeys = ["_id", "id", "name", "__v", "passwordHash", "createdAt", "updatedAt"];
                          if (categoryKey === "vehicles" && (key === "photo" || key === "image")) {
                            return false; // Don't show photo as text, it's already displayed as image above
                          }
                          return !excludedKeys.includes(key);
                        })
                        .slice(0, 20)
                        .map((key) => {
                          const value = selected[key];
                          // Skip displaying photo/image URLs as text for vehicles (already shown as image)
                          if (categoryKey === "vehicles" && (key === "photo" || key === "image")) {
                            return null;
                          }
                          return (
                            <div key={key}>
                              <p className="text-xs font-semibold text-gray-500 mb-0.5">
                                {key.replace(/([A-Z])/g, " $1")}
                              </p>
                              <p className="text-sm break-words">
                                {key.toLowerCase().includes("date")
                                  ? formatDate(value)
                                  : String(value ?? "-")}
                              </p>
                            </div>
                          );
                        })}
                    </>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-xs sm:text-sm text-gray-500 text-center px-4">
                  Select an item from the list to see details here, or use + Add to create a new asset.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-3 sm:px-4 py-2 sm:py-3 border-t border-gray-100 bg-gray-50 flex-shrink-0">
          <Button type="button" variant="secondary" size="sm" onClick={closeModal}>
            Close
          </Button>
        </div>
      </div>

      {/* Add Copier Model Modal */}
      {showAddModelModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Add Copier Machine Model</h2>
              <button
                type="button"
                onClick={() => {
                  setShowAddModelModal(false);
                  setNewModelName("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Model Name *
                </label>
                <input
                  type="text"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  placeholder="e.g. HP LaserJet Pro M404dn"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModelModal(false);
                    setNewModelName("");
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!newModelName.trim()) {
                      toast.error("Please enter a model name");
                      return;
                    }
                    try {
                      await authedFetch("/api/assets/copier-models", {
                        method: "POST",
                        body: JSON.stringify({
                          model: newModelName.trim(),
                        }),
                      });
                      toast.success("Copier model added");
                      setNewModelName("");
                      setShowAddModelModal(false);
                      // Reload copier models - trigger parent to refresh
                      if (onAssetChanged) {
                        await Promise.resolve(onAssetChanged());
                      }
                    } catch (error) {
                      toast.error((error as Error).message);
                    }
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
                >
                  Add Model
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

