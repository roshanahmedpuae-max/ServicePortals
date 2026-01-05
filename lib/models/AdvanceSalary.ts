import crypto from "crypto";
import mongoose, { Schema, Model } from "mongoose";
import { BusinessUnit } from "@/lib/types";

export interface AdvanceSalaryDocument extends mongoose.Document<string> {
  _id: string;
  employeeId: string;
  employeeName: string;
  businessUnit: BusinessUnit;
  amount: number;
  reason: string;
  requestedDate: string;
  status: "Pending" | "Approved" | "Rejected";
  approvedByAdminId?: string;
  approvedAt?: Date;
  rejectedByAdminId?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  approvalMessage?: string;
}

const AdvanceSalarySchema = new Schema<AdvanceSalaryDocument>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    employeeId: { type: String, required: true, index: true },
    employeeName: { type: String, required: true, trim: true },
    businessUnit: {
      type: String,
      enum: ["G3", "PrintersUAE", "IT"],
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, trim: true, maxlength: 2000 },
    requestedDate: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
      index: true,
    },
    approvedByAdminId: { type: String, required: false },
    approvedAt: { type: Date, required: false },
    rejectedByAdminId: { type: String, required: false },
    rejectedAt: { type: Date, required: false },
    rejectionReason: { type: String, required: false, maxlength: 2000 },
    approvalMessage: { type: String, required: false, maxlength: 2000 },
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

AdvanceSalarySchema.index({ businessUnit: 1, status: 1, requestedDate: -1 });
AdvanceSalarySchema.index({ employeeId: 1, status: 1 });

const AdvanceSalaryModel: Model<AdvanceSalaryDocument> =
  (mongoose.models.AdvanceSalary as Model<AdvanceSalaryDocument>) ||
  mongoose.model<AdvanceSalaryDocument>("AdvanceSalary", AdvanceSalarySchema);

export default AdvanceSalaryModel;
