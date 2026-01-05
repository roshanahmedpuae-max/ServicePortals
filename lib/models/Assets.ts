import crypto from "crypto";
import mongoose, { Schema, Model } from "mongoose";
import { BusinessUnit } from "@/lib/types";

// Shared enums / types
export type AssetStatus = "Active" | "In Maintenance" | "Sold" | "Decommissioned" | "Cancelled" | "Expired";

export type VehicleType = "Car" | "Van" | "Truck" | "Forklift" | "Other";
export type OwnershipType = "Owned" | "Leased" | "Rented";

export type RegistrationType =
  | "Trade License"
  | "VAT Certificate"
  | "Chamber of Commerce"
  | "Labour"
  | "Immigration"
  | "Municipality"
  | "Other";

export type RegistrationStatus = "Active" | "Expiring" | "Expired";

export type BillContractType =
  | "Utilities"
  | "Rent"
  | "Maintenance Contract"
  | "Insurance"
  | "Telecom"
  | "Software Subscription"
  | "Other";

export type BillingFrequency = "Monthly" | "Quarterly" | "Yearly" | "One-time";

export type ITEquipmentCategory = "Printer" | "Laptop" | "Server" | "Network Device" | "Other";

export type AssetDateStatus = "upcoming" | "overdue" | "resolved";

export type AssetCategoryKey =
  | "vehicles"
  | "registrations"
  | "bills_contracts"
  | "employees"
  | "it_equipment"
  | "rental_machines";

// Vehicle
export interface VehicleDocument {
  _id: string;
  name: string;
  businessUnit: BusinessUnit;
  vehicleType?: VehicleType;
  make?: string;
  model?: string;
  yearOfManufacture?: number;
  vin?: string;
  plateNumber: string;
  color?: string;

  ownershipType?: OwnershipType;
  status: AssetStatus;
  assignedEmployeeId?: string;

  registrationNumber?: string;
  registrationExpiryDate?: Date;
  salikTagId?: string;
  lastInspectionDate?: Date;
  nextInspectionDate?: Date;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceExpiryDate?: Date;

  lastServiceDate?: Date;
  nextServiceDate?: Date;
  odometerAtLastService?: number;
  serviceIntervalKm?: number;
  serviceIntervalMonths?: number;
  fuelType?: string;

  tags?: string[];
  notes?: string;
  photo?: string;

  createdByAdminId?: string;
  updatedByAdminId?: string;
}

const VehicleSchema = new Schema<VehicleDocument>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    name: { type: String, required: true, trim: true },
    businessUnit: {
      type: String,
      enum: ["G3", "PrintersUAE", "IT"],
      required: true,
      index: true,
    },
    vehicleType: { type: String },
    make: { type: String },
    model: { type: String },
    yearOfManufacture: { type: Number },
    vin: { type: String },
    plateNumber: { type: String, required: true, index: true },
    color: { type: String },

    ownershipType: { type: String },
    status: {
      type: String,
      enum: ["Active", "In Maintenance", "Sold", "Decommissioned", "Cancelled", "Expired"],
      default: "Active",
      index: true,
    },
    assignedEmployeeId: { type: String },

    registrationNumber: { type: String },
    registrationExpiryDate: { type: Date, index: true },
    salikTagId: { type: String },
    lastInspectionDate: { type: Date },
    nextInspectionDate: { type: Date, index: true },
    insuranceProvider: { type: String },
    insurancePolicyNumber: { type: String },
    insuranceExpiryDate: { type: Date, index: true },

    lastServiceDate: { type: Date },
    nextServiceDate: { type: Date, index: true },
    odometerAtLastService: { type: Number },
    serviceIntervalKm: { type: Number },
    serviceIntervalMonths: { type: Number },
    fuelType: { type: String },

    tags: [{ type: String }],
    notes: { type: String },
    photo: { type: String },

    createdByAdminId: { type: String },
    updatedByAdminId: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
      },
    },
    toObject: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
      },
    },
  }
);

export const VehicleModel: Model<VehicleDocument> =
  (mongoose.models.Vehicle as Model<VehicleDocument>) || mongoose.model<VehicleDocument>("Vehicle", VehicleSchema);

// Company Registration / License
export interface CompanyRegistrationDocument extends mongoose.Document<string> {
  _id: string;
  name: string;
  registrationType: RegistrationType | "Custom";
  jurisdiction?: string;
  registrationNumber?: string;
  issuingAuthority?: string;
  businessUnit?: BusinessUnit;

  issueDate?: Date;
  expiryDate: Date;
  renewalCycle?: "Annual" | "Biennial" | "Custom";

  responsibleDepartment?: string;
  primaryContactEmployeeId?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  certificateUrl?: string;

  status: RegistrationStatus;

  tags?: string[];
  notes?: string;

  createdByAdminId?: string;
  updatedByAdminId?: string;
}

const CompanyRegistrationSchema = new Schema<CompanyRegistrationDocument>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    name: { type: String, required: true, trim: true },
    registrationType: { type: String, default: "Other" },
    jurisdiction: { type: String },
    registrationNumber: { type: String },
    issuingAuthority: { type: String },
    businessUnit: {
      type: String,
      enum: ["G3", "PrintersUAE", "IT"],
      index: true,
    },
    issueDate: { type: Date },
    expiryDate: { type: Date, required: true, index: true },
    renewalCycle: { type: String },

    responsibleDepartment: { type: String },
    primaryContactEmployeeId: { type: String },
    primaryContactEmail: { type: String },
    primaryContactPhone: { type: String },

    status: {
      type: String,
      enum: ["Active", "Expiring", "Expired"],
      default: "Active",
      index: true,
    },
    certificateUrl: { type: String },

    tags: [{ type: String }],
    notes: { type: String },

    createdByAdminId: { type: String },
    updatedByAdminId: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
      },
    },
    toObject: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
      },
    },
  }
);

export const CompanyRegistrationModel: Model<CompanyRegistrationDocument> =
  (mongoose.models.CompanyRegistration as Model<CompanyRegistrationDocument>) ||
  mongoose.model<CompanyRegistrationDocument>("CompanyRegistration", CompanyRegistrationSchema);

// Bills & Contracts
export interface BillContractDocument extends mongoose.Document<string> {
  _id: string;
  name: string;
  type: BillContractType | "Other";
  vendor?: string;
  accountNumber?: string;
  businessUnit?: BusinessUnit;
  location?: string;

  billingFrequency?: BillingFrequency;
  approxAmount?: number;

  startDate?: Date;
  endDate?: Date;
  nextPaymentDueDate?: Date;

  documentUrl?: string;

  status: AssetStatus;

  tags?: string[];
  notes?: string;

  createdByAdminId?: string;
  updatedByAdminId?: string;
}

const BillContractSchema = new Schema<BillContractDocument>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true },
    vendor: { type: String },
    accountNumber: { type: String },
    businessUnit: {
      type: String,
      enum: ["G3", "PrintersUAE", "IT"],
      index: true,
    },
    location: { type: String },

    billingFrequency: { type: String },
    approxAmount: { type: Number },

    startDate: { type: Date },
    endDate: { type: Date, index: true },
    documentUrl: { type: String },
    nextPaymentDueDate: { type: Date, index: true },

    status: {
      type: String,
      enum: ["Active", "In Maintenance", "Sold", "Decommissioned", "Cancelled", "Expired"],
      default: "Active",
      index: true,
    },

    tags: [{ type: String }],
    notes: { type: String },

    createdByAdminId: { type: String },
    updatedByAdminId: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
      },
    },
    toObject: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
      },
    },
  }
);

export const BillContractModel: Model<BillContractDocument> =
  (mongoose.models.BillContract as Model<BillContractDocument>) ||
  mongoose.model<BillContractDocument>("BillContract", BillContractSchema);

// IT & Equipment
export interface ITEquipmentDocument extends mongoose.Document<string> {
  _id: string;
  name: string;
  businessUnit: BusinessUnit;
  category?: ITEquipmentCategory | "Other";
  assetTag?: string;
  serialNumber?: string;
  location?: string;
  vendor?: string;
  purchaseDate?: Date;
  warrantyEndDate?: Date;
  amcStartDate?: Date;
  amcEndDate?: Date;
  linkedEmployeeId?: string;
  status: AssetStatus;
  tags?: string[];
  notes?: string;
  createdByAdminId?: string;
  updatedByAdminId?: string;
  warrantyDocumentUrl?: string;
}

const ITEquipmentSchema = new Schema<ITEquipmentDocument>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    name: { type: String, required: true, trim: true },
    businessUnit: {
      type: String,
      enum: ["G3", "PrintersUAE", "IT"],
      required: true,
      index: true,
    },
    category: { type: String },
    assetTag: { type: String },
    serialNumber: { type: String },
    location: { type: String },
    vendor: { type: String },
    purchaseDate: { type: Date },
    warrantyEndDate: { type: Date, index: true },
    amcStartDate: { type: Date },
    amcEndDate: { type: Date, index: true },
    linkedEmployeeId: { type: String },
    warrantyDocumentUrl: { type: String },
    status: {
      type: String,
      enum: ["Active", "In Maintenance", "Sold", "Decommissioned", "Cancelled", "Expired"],
      default: "Active",
      index: true,
    },
    tags: [{ type: String }],
    notes: { type: String },
    createdByAdminId: { type: String },
    updatedByAdminId: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
      },
    },
    toObject: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
      },
    },
  }
);

export const ITEquipmentModel: Model<ITEquipmentDocument> =
  (mongoose.models.ITEquipment as Model<ITEquipmentDocument>) ||
  mongoose.model<ITEquipmentDocument>("ITEquipment", ITEquipmentSchema);

// Copier Machine Model
export interface CopierMachineModelDocument extends Omit<mongoose.Document<string>, 'model'> {
  _id: string;
  model: string;
  businessUnit: BusinessUnit;
  manufacturer?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CopierMachineModelSchema = new Schema<CopierMachineModelDocument>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    model: { type: String, required: true, trim: true },
    businessUnit: {
      type: String,
      enum: ["G3", "PrintersUAE", "IT"],
      required: true,
      index: true,
    },
    manufacturer: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
      },
    },
    toObject: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
      },
    },
  }
);

export const CopierMachineModelModel: Model<CopierMachineModelDocument> =
  (mongoose.models.CopierMachineModel as Model<CopierMachineModelDocument>) ||
  mongoose.model<CopierMachineModelDocument>("CopierMachineModel", CopierMachineModelSchema);

// Rental Machine
export interface RentalMachineDocument extends mongoose.Document<string> {
  _id: string;
  customerId: string;
  copierMachineModelId: string;
  businessUnit: BusinessUnit;
  uidNumber?: string;
  serialNumber?: string;
  rentalStartDate?: Date;
  rentalEndDate?: Date;
  monthlyRent?: number;
  status: AssetStatus;
  location?: string;
  notes?: string;
  createdByAdminId?: string;
  updatedByAdminId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RentalMachineSchema = new Schema<RentalMachineDocument>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    customerId: { type: String, required: true, index: true },
    copierMachineModelId: { type: String, required: true, index: true },
    businessUnit: {
      type: String,
      enum: ["G3", "PrintersUAE", "IT"],
      required: true,
      index: true,
    },
    uidNumber: { type: String, trim: true },
    serialNumber: { type: String, trim: true },
    rentalStartDate: { type: Date, index: true },
    rentalEndDate: { type: Date, index: true },
    monthlyRent: { type: Number },
    status: {
      type: String,
      enum: ["Active", "In Maintenance", "Sold", "Decommissioned", "Cancelled", "Expired"],
      default: "Active",
      index: true,
    },
    location: { type: String, trim: true },
    notes: { type: String },
    createdByAdminId: { type: String },
    updatedByAdminId: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
      },
    },
    toObject: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
      },
    },
  }
);

export const RentalMachineModel: Model<RentalMachineDocument> =
  (mongoose.models.RentalMachine as Model<RentalMachineDocument>) ||
  mongoose.model<RentalMachineDocument>("RentalMachine", RentalMachineSchema);

// Asset Documents
export interface AssetDocumentDocument extends mongoose.Document<string> {
  _id: string;
  categoryKey: AssetCategoryKey;
  assetId: string;
  businessUnit?: BusinessUnit;
  fileName: string;
  fileUrl: string;
  fileType?: string;
  docType?: string;
  uploadedByAdminId?: string;
  uploadedAt: Date;
  expiryDate?: Date;
}

const AssetDocumentSchema = new Schema<AssetDocumentDocument>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    categoryKey: { type: String, required: true, index: true },
    assetId: { type: String, required: true, index: true },
    businessUnit: {
      type: String,
      enum: ["G3", "PrintersUAE", "IT"],
      index: true,
    },
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileType: { type: String },
    docType: { type: String },
    uploadedByAdminId: { type: String },
    uploadedAt: { type: Date, default: () => new Date() },
    expiryDate: { type: Date, index: true },
  },
  {
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
      },
    },
    toObject: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
      },
    },
  }
);

export const AssetDocumentModel: Model<AssetDocumentDocument> =
  (mongoose.models.AssetDocument as Model<AssetDocumentDocument>) ||
  mongoose.model<AssetDocumentDocument>("AssetDocument", AssetDocumentSchema);

// Asset Dates (tracked important dates per asset)
export interface AssetDateDocument extends mongoose.Document<string> {
  _id: string;
  categoryKey: AssetCategoryKey;
  assetId: string;
  businessUnit?: BusinessUnit;
  dateType: string;
  dateValue: Date;
  status: AssetDateStatus;
  resolvedAt?: Date;
}

const AssetDateSchema = new Schema<AssetDateDocument>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    categoryKey: { type: String, required: true, index: true },
    assetId: { type: String, required: true, index: true },
    businessUnit: {
      type: String,
      enum: ["G3", "PrintersUAE", "IT"],
      index: true,
    },
    dateType: { type: String, required: true },
    dateValue: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["upcoming", "overdue", "resolved"],
      default: "upcoming",
      index: true,
    },
    resolvedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
      },
    },
    toObject: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
      },
    },
  }
);

export const AssetDateModel: Model<AssetDateDocument> =
  (mongoose.models.AssetDate as Model<AssetDateDocument>) ||
  mongoose.model<AssetDateDocument>("AssetDate", AssetDateSchema);

// Asset Reminders (log of sent reminders)
export interface AssetReminderDocument extends mongoose.Document<string> {
  _id: string;
  assetDateId: string;
  reminderOffsetDays: number;
  sentAt: Date;
  sentTo: string[];
  channel: "email";
  isOverdueEscalation?: boolean;
}

const AssetReminderSchema = new Schema<AssetReminderDocument>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    assetDateId: { type: String, required: true, index: true },
    reminderOffsetDays: { type: Number, required: true },
    sentAt: { type: Date, required: true, default: () => new Date() },
    sentTo: [{ type: String }],
    channel: { type: String, default: "email" },
    isOverdueEscalation: { type: Boolean, default: false },
  },
  {
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
      },
    },
    toObject: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
      },
    },
  }
);

export const AssetReminderModel: Model<AssetReminderDocument> =
  (mongoose.models.AssetReminder as Model<AssetReminderDocument>) ||
  mongoose.model<AssetReminderDocument>("AssetReminder", AssetReminderSchema);

// Helper utilities to keep AssetDate entries in sync with assets

function computeDateStatus(dateValue: Date): AssetDateStatus {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate());
  if (target < startOfToday) return "overdue";
  return "upcoming";
}

async function upsertAssetDate(params: {
  categoryKey: AssetCategoryKey;
  assetId: string;
  businessUnit?: BusinessUnit;
  dateType: string;
  dateValue?: Date | null;
}) {
  const { categoryKey, assetId, businessUnit, dateType, dateValue } = params;

  if (!dateValue) {
    await AssetDateModel.deleteMany({ categoryKey, assetId, dateType });
    return;
  }

  const status = computeDateStatus(dateValue);

  await AssetDateModel.findOneAndUpdate(
    { categoryKey, assetId, dateType },
    {
      categoryKey,
      assetId,
      businessUnit,
      dateType,
      dateValue,
      status,
    },
    { upsert: true, new: true }
  );
}

export async function syncVehicleAssetDates(vehicle: VehicleDocument) {
  const assetId = vehicle._id;
  const bu = vehicle.businessUnit;
  await Promise.all([
    upsertAssetDate({
      categoryKey: "vehicles",
      assetId,
      businessUnit: bu,
      dateType: "registration_expiry",
      dateValue: vehicle.registrationExpiryDate ?? null,
    }),
    upsertAssetDate({
      categoryKey: "vehicles",
      assetId,
      businessUnit: bu,
      dateType: "insurance_expiry",
      dateValue: vehicle.insuranceExpiryDate ?? null,
    }),
    upsertAssetDate({
      categoryKey: "vehicles",
      assetId,
      businessUnit: bu,
      dateType: "next_service_date",
      dateValue: vehicle.nextServiceDate ?? null,
    }),
  ]);
}

export async function syncCompanyRegistrationDates(reg: CompanyRegistrationDocument) {
  const assetId = reg._id;
  const bu = reg.businessUnit;
  await upsertAssetDate({
    categoryKey: "registrations",
    assetId,
    businessUnit: bu,
    dateType: "registration_expiry",
    dateValue: reg.expiryDate ?? null,
  });
}

export async function syncBillContractDates(bill: BillContractDocument) {
  const assetId = bill._id;
  const bu = bill.businessUnit;
  await Promise.all([
    upsertAssetDate({
      categoryKey: "bills_contracts",
      assetId,
      businessUnit: bu,
      dateType: "contract_end",
      dateValue: bill.endDate ?? null,
    }),
    upsertAssetDate({
      categoryKey: "bills_contracts",
      assetId,
      businessUnit: bu,
      dateType: "next_payment_due",
      dateValue: bill.nextPaymentDueDate ?? null,
    }),
  ]);
}

export async function syncITEquipmentDates(equipment: ITEquipmentDocument) {
  const assetId = equipment._id;
  const bu = equipment.businessUnit;
  await Promise.all([
    upsertAssetDate({
      categoryKey: "it_equipment",
      assetId,
      businessUnit: bu,
      dateType: "warranty_end",
      dateValue: equipment.warrantyEndDate ?? null,
    }),
    upsertAssetDate({
      categoryKey: "it_equipment",
      assetId,
      businessUnit: bu,
      dateType: "amc_end",
      dateValue: equipment.amcEndDate ?? null,
    }),
  ]);
}

export async function syncRentalMachineDates(machine: RentalMachineDocument) {
  const assetId = machine._id;
  const bu = machine.businessUnit;
  await upsertAssetDate({
    categoryKey: "rental_machines",
    assetId,
    businessUnit: bu,
    dateType: "rental_end",
    dateValue: machine.rentalEndDate ?? null,
  });
}

