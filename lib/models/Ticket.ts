import crypto from "crypto";
import mongoose, { Schema, Model } from "mongoose";
import { BusinessUnit, TicketPriority, TicketStatus } from "@/lib/types";

export interface TicketDocument extends mongoose.Document<string> {
  _id: string;
  businessUnit: BusinessUnit;
  customerId: string;
  assignedEmployeeId?: string;
  assignedEmployeeIds: string[];
  subject: string;
  description: string;
  category?: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignmentDate?: string; // YYYY-MM-DD
  attachments?: string[]; // Array of file URLs
}

const TicketSchema = new Schema<TicketDocument>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    businessUnit: {
      type: String,
      enum: ["G3", "PrintersUAE", "IT"],
      required: true,
      index: true,
    },
    customerId: {
      type: String,
      required: true,
      index: true,
    },
    assignedEmployeeId: {
      type: String,
      required: false,
      index: true,
    },
    assignedEmployeeIds: {
      type: [String],
      default: [],
      index: true,
    },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
      index: true,
    },
    status: {
      type: String,
      enum: ["New", "In Progress", "On Hold", "Resolved", "Closed"],
      default: "New",
      index: true,
    },
    assignmentDate: {
      type: String,
      required: false,
      index: true,
    },
    attachments: {
      type: [String],
      default: [],
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

// Compound indexes for efficient queries
TicketSchema.index({ businessUnit: 1, status: 1 });
TicketSchema.index({ businessUnit: 1, customerId: 1 });
TicketSchema.index({ businessUnit: 1, assignedEmployeeId: 1 });
TicketSchema.index({ businessUnit: 1, updatedAt: -1 });

const TicketModel: Model<TicketDocument> =
  (mongoose.models.Ticket as Model<TicketDocument>) ||
  mongoose.model<TicketDocument>("Ticket", TicketSchema);

export default TicketModel;
