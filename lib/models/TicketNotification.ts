import crypto from "crypto";
import mongoose, { Schema, Model } from "mongoose";
import { BusinessUnit } from "@/lib/types";

export interface TicketNotificationDocument extends mongoose.Document<string> {
  _id: string;
  ticketId: string;
  customerId: string;
  customerName?: string;
  businessUnit: BusinessUnit;
  subject: string;
  priority: string;
  status: string;
  sentAt: Date;
  readAt?: Date;
  readByAdminId?: string;
}

const TicketNotificationSchema = new Schema<TicketNotificationDocument>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    ticketId: { type: String, required: true, index: true },
    customerId: { type: String, required: true, index: true },
    customerName: { type: String, required: false, trim: true },
    businessUnit: {
      type: String,
      enum: ["G3", "PrintersUAE", "IT"],
      required: true,
      index: true,
    },
    subject: { type: String, required: true, trim: true },
    priority: { type: String, required: true, default: "Medium" },
    status: { type: String, required: true, default: "New" },
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

TicketNotificationSchema.index({ businessUnit: 1, readAt: 1, sentAt: -1 });
TicketNotificationSchema.index({ ticketId: 1 });

const TicketNotificationModel: Model<TicketNotificationDocument> =
  (mongoose.models.TicketNotification as Model<TicketNotificationDocument>) ||
  mongoose.model<TicketNotificationDocument>("TicketNotification", TicketNotificationSchema);

export default TicketNotificationModel;
