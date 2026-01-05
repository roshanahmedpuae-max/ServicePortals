import crypto from "crypto";
import mongoose, { Schema, Model } from "mongoose";
import { BusinessUnit } from "@/lib/types";

export interface OvertimeNotificationDocument extends mongoose.Document<string> {
  _id: string;
  overtimeRequestId: string;
  employeeId: string;
  employeeName: string;
  businessUnit: BusinessUnit;
  date: string;
  hours: number;
  status: string;
  sentAt: Date;
  readAt?: Date;
  readByAdminId?: string;
}

const OvertimeNotificationSchema = new Schema<OvertimeNotificationDocument>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    overtimeRequestId: { type: String, required: true, index: true },
    employeeId: { type: String, required: true, index: true },
    employeeName: { type: String, required: true, trim: true },
    businessUnit: {
      type: String,
      enum: ["G3", "PrintersUAE", "IT"],
      required: true,
      index: true,
    },
    date: { type: String, required: true },
    hours: { type: Number, required: true },
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

OvertimeNotificationSchema.index({ businessUnit: 1, readAt: 1, sentAt: -1 });
OvertimeNotificationSchema.index({ overtimeRequestId: 1 });

const OvertimeNotificationModel: Model<OvertimeNotificationDocument> =
  (mongoose.models.OvertimeNotification as Model<OvertimeNotificationDocument>) ||
  mongoose.model<OvertimeNotificationDocument>("OvertimeNotification", OvertimeNotificationSchema);

export default OvertimeNotificationModel;

