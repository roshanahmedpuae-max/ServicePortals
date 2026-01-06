import crypto from "crypto";
import mongoose, { Schema, Model } from "mongoose";
import { BusinessUnit, EmployeeStatus } from "@/lib/types";
import { hashPassword } from "@/lib/models/utils";

export interface EmployeeDocument extends mongoose.Document<string> {
  _id: string;
  name: string;
  passwordHash: string;
  businessUnit: BusinessUnit;
  role: string;
  status: EmployeeStatus;
  payrollDate?: number; // Day of month (1-31) when payroll should be generated
  featureAccess?: string[]; // Array of feature access permissions
}

const EmployeeSchema = new Schema<EmployeeDocument>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    businessUnit: {
      type: String,
      enum: ["G3", "PrintersUAE", "IT"],
      required: true,
      index: true,
    },
    role: { type: String, required: true },
    status: { type: String, enum: ["Available", "Unavailable"], default: "Available", index: true },
    payrollDate: { type: Number, min: 1, max: 31 },
    featureAccess: { type: [String], default: [] },
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

// Compound index for efficient queries
EmployeeSchema.index({ businessUnit: 1, status: 1 });

const EmployeeModel: Model<EmployeeDocument> =
  (mongoose.models.Employee as Model<EmployeeDocument>) ||
  mongoose.model<EmployeeDocument>("Employee", EmployeeSchema);

export function createEmployeePayload(input: {
  name: string;
  password: string;
  businessUnit: BusinessUnit;
  role: string;
  status?: EmployeeStatus;
  payrollDate?: number;
  featureAccess?: string[];
}) {
  return {
    name: input.name,
    passwordHash: hashPassword(input.password),
    businessUnit: input.businessUnit,
    role: input.role,
    status: input.status ?? "Available",
    ...(input.payrollDate !== undefined && { payrollDate: input.payrollDate }),
    ...(input.featureAccess !== undefined && { featureAccess: input.featureAccess }),
  };
}

export async function verifyEmployeeCredentials(
  name: string,
  password: string,
  businessUnit?: BusinessUnit
) {
  const passwordHash = hashPassword(password);
  const query: Record<string, unknown> = {
    name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    passwordHash,
  };
  if (businessUnit) {
    query.businessUnit = businessUnit;
  }

  const match = await EmployeeModel.findOne(query);
  return match;
}

export async function verifyEmployeeByPassword(
  password: string,
  businessUnit: BusinessUnit
) {
  const passwordHash = hashPassword(password);
  const match = await EmployeeModel.findOne({
    passwordHash,
    businessUnit,
  });
  return match;
}

export default EmployeeModel;

