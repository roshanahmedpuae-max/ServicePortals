import crypto from "crypto";
import mongoose, { Schema, Model } from "mongoose";
import { BusinessUnit, PayrollStatus } from "@/lib/types";

export interface PayrollDocument extends mongoose.Document<string> {
  _id: string;
  employeeId: string;
  employeeName: string;
  businessUnit: BusinessUnit;
  period: string; // Format: "YYYY-MM"
  payrollDate?: Date;
  baseSalary: number;
  allowances: number;
  deductions: number;
  grossPay: number;
  netPay: number;
  status: PayrollStatus;
  notes?: string;
  employeeSignature?: string;
  signedAt?: Date;
  employeeRejectionReason?: string;
  employeeRejectedAt?: Date;
  generatedBy: string;
  generatedAt: Date;
  completedAt?: Date;
  createdByAdminId?: string;
  updatedByAdminId?: string;
  employeeSignIp?: string;
  employeeSignUserAgent?: string;
}

const PayrollSchema = new Schema<PayrollDocument>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    employeeId: { type: String, required: true, index: true },
    employeeName: { type: String, required: true },
    businessUnit: {
      type: String,
      enum: ["G3", "PrintersUAE", "IT"],
      required: true,
      index: true,
    },
    period: { type: String, required: true, index: true }, // Format: "YYYY-MM"
    payrollDate: { type: Date },
    baseSalary: { type: Number, required: true, min: 0 },
    allowances: { type: Number, default: 0, min: 0 },
    deductions: { type: Number, default: 0, min: 0 },
    grossPay: { type: Number, required: true, min: 0 },
    netPay: { type: Number, required: true, min: 0 },
    notes: { type: String },
    status: {
      type: String,
      enum: ["Generated", "Pending Signature", "Signed", "Completed", "Rejected"],
      default: "Generated",
      index: true,
    },
    employeeSignature: { type: String },
    signedAt: { type: Date },
    employeeRejectionReason: { type: String },
    employeeRejectedAt: { type: Date },
    generatedBy: { type: String, required: true },
    generatedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    createdByAdminId: { type: String },
    updatedByAdminId: { type: String },
    employeeSignIp: { type: String },
    employeeSignUserAgent: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
        if (ret.payrollDate) ret.payrollDate = ret.payrollDate.toISOString();
        if (ret.signedAt) ret.signedAt = ret.signedAt.toISOString();
        if (ret.employeeRejectedAt) ret.employeeRejectedAt = ret.employeeRejectedAt.toISOString();
        if (ret.generatedAt) ret.generatedAt = ret.generatedAt.toISOString();
        if (ret.completedAt) ret.completedAt = ret.completedAt.toISOString();
      },
    },
    toObject: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
        if (ret.payrollDate) ret.payrollDate = ret.payrollDate.toISOString();
        if (ret.signedAt) ret.signedAt = ret.signedAt.toISOString();
        if (ret.employeeRejectedAt) ret.employeeRejectedAt = ret.employeeRejectedAt.toISOString();
        if (ret.generatedAt) ret.generatedAt = ret.generatedAt.toISOString();
        if (ret.completedAt) ret.completedAt = ret.completedAt.toISOString();
      },
    },
  }
);

// Compound index for efficient queries
PayrollSchema.index({ employeeId: 1, period: 1 }, { unique: true });
PayrollSchema.index({ businessUnit: 1, status: 1 });
PayrollSchema.index({ businessUnit: 1, period: 1 });

const PayrollModel: Model<PayrollDocument> =
  (mongoose.models.Payroll as Model<PayrollDocument>) ||
  mongoose.model<PayrollDocument>("Payroll", PayrollSchema);

export default PayrollModel;
