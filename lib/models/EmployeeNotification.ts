import crypto from "crypto";
import mongoose, { Schema, Model } from "mongoose";
import { BusinessUnit } from "@/lib/types";

export interface EmployeeNotificationDocument extends mongoose.Document<string> {
  _id: string;
  employeeId: string;
  businessUnit: BusinessUnit;
  type: "leave_approval" | "payroll" | "document_update" | "manual" | "overtime_approval";
  title: string;
  message: string;
  relatedId?: string; // leaveRequestId, payrollId, documentId, etc.
  sentAt: Date;
  readAt?: Date;
  createdByAdminId?: string;
}

const EmployeeNotificationSchema = new Schema<EmployeeNotificationDocument>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    employeeId: { type: String, required: true, index: true },
    businessUnit: {
      type: String,
      enum: ["G3", "PrintersUAE", "IT"],
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["leave_approval", "payroll", "document_update", "manual", "overtime_approval"],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    relatedId: { type: String, required: false, index: true },
    sentAt: { type: Date, required: true, default: () => new Date(), index: true },
    readAt: { type: Date, required: false },
    createdByAdminId: { type: String, required: false },
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

EmployeeNotificationSchema.index({ employeeId: 1, readAt: 1, sentAt: -1 });
EmployeeNotificationSchema.index({ businessUnit: 1, readAt: 1, sentAt: -1 });
EmployeeNotificationSchema.index({ type: 1 });

const EmployeeNotificationModel: Model<EmployeeNotificationDocument> =
  (mongoose.models.EmployeeNotification as Model<EmployeeNotificationDocument>) ||
  mongoose.model<EmployeeNotificationDocument>("EmployeeNotification", EmployeeNotificationSchema);

export default EmployeeNotificationModel;
