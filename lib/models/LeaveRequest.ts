import crypto from "crypto";
import mongoose, { Schema, Model } from "mongoose";
import { BusinessUnit, LeaveStatus, LeaveType, LeaveUnit } from "@/lib/types";

export interface LeaveRequestDocument extends mongoose.Document<string> {
  _id: string;
  employeeId: string;
  employeeName: string;
  businessUnit: BusinessUnit;
  type: LeaveType;
  unit: LeaveUnit;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  reason: string;
  certificateUrl?: string;
  employeeDocuments?: Array<{ fileName: string; fileUrl: string; uploadedAt: Date }>;
  status: LeaveStatus;
  approvedByAdminId?: string;
  approvedAt?: Date;
  rejectedByAdminId?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  approvalDocuments?: Array<{ fileName: string; fileUrl: string; uploadedAt: Date }>;
  approvalMessage?: string;
}

const LeaveRequestSchema = new Schema<LeaveRequestDocument>(
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
    type: {
      type: String,
      enum: ["Annual", "SickWithCertificate", "SickWithoutCertificate"],
      required: true,
    },
    unit: {
      type: String,
      enum: ["FullDay", "HalfDay"],
      required: true,
    },
    startDate: {
      type: String,
      required: true,
      index: true,
    },
    endDate: {
      type: String,
      required: false,
      index: true,
    },
    startTime: {
      type: String,
      required: false,
    },
    endTime: {
      type: String,
      required: false,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    certificateUrl: {
      type: String,
      required: false,
    },
    employeeDocuments: {
      type: [
        {
          fileName: { type: String, required: true },
          fileUrl: { type: String, required: true },
          uploadedAt: { type: Date, default: Date.now },
        },
      ],
      required: false,
      default: [],
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
    approvalDocuments: {
      type: [
        {
          fileName: { type: String, required: true },
          fileUrl: { type: String, required: true },
          uploadedAt: { type: Date, default: Date.now },
        },
      ],
      required: false,
      default: [],
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

LeaveRequestSchema.index({ employeeId: 1, status: 1, startDate: 1 });
LeaveRequestSchema.index({ businessUnit: 1, status: 1, startDate: -1 });

const LeaveRequestModel: Model<LeaveRequestDocument> =
  (mongoose.models.LeaveRequest as Model<LeaveRequestDocument>) ||
  mongoose.model<LeaveRequestDocument>("LeaveRequest", LeaveRequestSchema);

export default LeaveRequestModel;

