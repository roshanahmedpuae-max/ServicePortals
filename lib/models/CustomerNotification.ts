import crypto from "crypto";
import mongoose, { Schema, Model } from "mongoose";
import { BusinessUnit } from "@/lib/types";

export interface CustomerNotificationDocument extends mongoose.Document<string> {
  _id: string;
  customerId: string;
  businessUnit: BusinessUnit;
  type: "leave_approval" | "payroll" | "document_update" | "manual";
  title: string;
  message: string;
  relatedId?: string;
  sentAt: Date;
  readAt?: Date;
  createdByAdminId?: string;
}

const CustomerNotificationSchema = new Schema<CustomerNotificationDocument>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    customerId: { type: String, required: true, index: true },
    businessUnit: {
      type: String,
      enum: ["G3", "PrintersUAE", "IT"],
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["leave_approval", "payroll", "document_update", "manual"],
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

CustomerNotificationSchema.index({ customerId: 1, readAt: 1, sentAt: -1 });
CustomerNotificationSchema.index({ businessUnit: 1, readAt: 1, sentAt: -1 });
CustomerNotificationSchema.index({ type: 1 });

const CustomerNotificationModel: Model<CustomerNotificationDocument> =
  (mongoose.models.CustomerNotification as Model<CustomerNotificationDocument>) ||
  mongoose.model<CustomerNotificationDocument>("CustomerNotification", CustomerNotificationSchema);

export default CustomerNotificationModel;
