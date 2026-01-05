import crypto from "crypto";
import mongoose, { Schema, Model } from "mongoose";
import { BusinessUnit, OvertimeStatus } from "@/lib/types";

export interface OvertimeRequestDocument extends mongoose.Document<string> {
  _id: string;
  employeeId: string;
  employeeName: string;
  businessUnit: BusinessUnit;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  project?: string;
  description: string;
  status: OvertimeStatus;
  approvedByAdminId?: string;
  approvedAt?: Date;
  rejectedByAdminId?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  approvalMessage?: string;
}

const OvertimeRequestSchema = new Schema<OvertimeRequestDocument>(
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
    date: {
      type: String,
      required: true,
      index: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    hours: {
      type: Number,
      required: true,
      min: 0,
    },
    project: {
      type: String,
      required: false,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Cancelled"],
      default: "Pending",
      index: true,
    },
    approvedByAdminId: {
      type: String,
      required: false,
    },
    approvedAt: {
      type: Date,
      required: false,
    },
    rejectedByAdminId: {
      type: String,
      required: false,
    },
    rejectedAt: {
      type: Date,
      required: false,
    },
    rejectionReason: {
      type: String,
      required: false,
      maxlength: 2000,
    },
    approvalMessage: {
      type: String,
      required: false,
      trim: true,
      maxlength: 2000,
    },
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

OvertimeRequestSchema.index({ employeeId: 1, status: 1, date: 1 });
OvertimeRequestSchema.index({ businessUnit: 1, status: 1, date: -1 });
OvertimeRequestSchema.index({ date: 1, employeeId: 1 });

const OvertimeRequestModel: Model<OvertimeRequestDocument> =
  (mongoose.models.OvertimeRequest as Model<OvertimeRequestDocument>) ||
  mongoose.model<OvertimeRequestDocument>("OvertimeRequest", OvertimeRequestSchema);

export default OvertimeRequestModel;

