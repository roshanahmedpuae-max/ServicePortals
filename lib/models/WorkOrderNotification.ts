import crypto from "crypto";
import mongoose, { Schema, Model } from "mongoose";
import { BusinessUnit } from "@/lib/types";

export interface WorkOrderNotificationDocument extends mongoose.Document<string> {
  _id: string;
  workOrderId: string;
  employeeId: string;
  employeeName: string;
  businessUnit: BusinessUnit;
  customerName: string;
  workDescription: string;
  locationAddress: string;
  orderDateTime: string;
  status: string;
  sentAt: Date;
  readAt?: Date;
  readByAdminId?: string;
}

const WorkOrderNotificationSchema = new Schema<WorkOrderNotificationDocument>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    workOrderId: { type: String, required: true, index: true },
    employeeId: { type: String, required: true, index: true },
    employeeName: { type: String, required: true, trim: true },
    businessUnit: {
      type: String,
      enum: ["G3", "PrintersUAE", "IT"],
      required: true,
      index: true,
    },
    customerName: { type: String, required: true, trim: true },
    workDescription: { type: String, required: true, trim: true },
    locationAddress: { type: String, required: true, trim: true },
    orderDateTime: { type: String, required: true },
    status: { type: String, required: true, default: "Submitted" },
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

WorkOrderNotificationSchema.index({ businessUnit: 1, readAt: 1, sentAt: -1 });
WorkOrderNotificationSchema.index({ workOrderId: 1 });

const WorkOrderNotificationModel: Model<WorkOrderNotificationDocument> =
  (mongoose.models.WorkOrderNotification as Model<WorkOrderNotificationDocument>) ||
  mongoose.model<WorkOrderNotificationDocument>("WorkOrderNotification", WorkOrderNotificationSchema);

export default WorkOrderNotificationModel;
