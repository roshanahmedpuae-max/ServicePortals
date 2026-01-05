import crypto from "crypto";
import mongoose, { Schema, Model } from "mongoose";
import { BusinessUnit } from "@/lib/types";

export interface AdvanceSalaryNotificationDocument extends mongoose.Document<string> {
  _id: string;
  advanceSalaryId: string;
  employeeId: string;
  employeeName: string;
  businessUnit: BusinessUnit;
  amount: number;
  requestedDate: string;
  status: string;
  sentAt: Date;
  readAt?: Date;
  readByAdminId?: string;
}

const AdvanceSalaryNotificationSchema = new Schema<AdvanceSalaryNotificationDocument>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    advanceSalaryId: { type: String, required: true, index: true },
    employeeId: { type: String, required: true, index: true },
    employeeName: { type: String, required: true, trim: true },
    businessUnit: {
      type: String,
      enum: ["G3", "PrintersUAE", "IT"],
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    requestedDate: { type: String, required: true },
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

AdvanceSalaryNotificationSchema.index({ businessUnit: 1, readAt: 1, sentAt: -1 });
AdvanceSalaryNotificationSchema.index({ advanceSalaryId: 1 });

const AdvanceSalaryNotificationModel: Model<AdvanceSalaryNotificationDocument> =
  (mongoose.models.AdvanceSalaryNotification as Model<AdvanceSalaryNotificationDocument>) ||
  mongoose.model<AdvanceSalaryNotificationDocument>("AdvanceSalaryNotification", AdvanceSalaryNotificationSchema);

export default AdvanceSalaryNotificationModel;
