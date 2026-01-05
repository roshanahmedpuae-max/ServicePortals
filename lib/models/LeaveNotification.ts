import crypto from "crypto";
import mongoose, { Schema, Model } from "mongoose";
import { BusinessUnit } from "@/lib/types";

export interface LeaveNotificationDocument extends mongoose.Document<string> {
  _id: string;
  leaveRequestId: string;
  employeeId: string;
  employeeName: string;
  businessUnit: BusinessUnit;
  leaveType: string;
  startDate: string;
  endDate?: string;
  status: string;
  sentAt: Date;
  readAt?: Date;
  readByAdminId?: string;
}

const LeaveNotificationSchema = new Schema<LeaveNotificationDocument>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    leaveRequestId: { type: String, required: true, index: true },
    employeeId: { type: String, required: true, index: true },
    employeeName: { type: String, required: true, trim: true },
    businessUnit: {
      type: String,
      enum: ["G3", "PrintersUAE", "IT"],
      required: true,
      index: true,
    },
    leaveType: { type: String, required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: false },
    status: { type: String, required: true, default: "Pending" },
    sentAt: { type: Date, required: true, default: () => new Date(), index: true },
    readAt: { type: Date, required: false },
    readByAdminId: { type: String, required: false },
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

LeaveNotificationSchema.index({ businessUnit: 1, readAt: 1, sentAt: -1 });
LeaveNotificationSchema.index({ leaveRequestId: 1 });

const LeaveNotificationModel: Model<LeaveNotificationDocument> =
  (mongoose.models.LeaveNotification as Model<LeaveNotificationDocument>) ||
  mongoose.model<LeaveNotificationDocument>("LeaveNotification", LeaveNotificationSchema);

export default LeaveNotificationModel;
