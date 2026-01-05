import crypto from "crypto";
import mongoose, { Schema, Model } from "mongoose";
import { BusinessUnit, WorkOrderStatus } from "@/lib/types";

export interface WorkOrderDocument extends mongoose.Document<string> {
  _id: string;
  businessUnit: BusinessUnit;
  customerId: string;
  customerName?: string;
  serviceTypeId?: string;
  assignedEmployeeId?: string;
  workDescription: string;
  locationAddress: string;
  customerPhone: string;
  orderDateTime: string;
  quotationReferenceNumber?: string;
  paymentMethod?: string;
  findings?: string;
  beforePhotos: string[];
  afterPhotos: string[];
  workCompletionDate?: string;
  approvalDate?: string;
  employeeSignature?: string;
  customerSignature?: string;
  customerNameAtCompletion?: string;
  signature?: string;
  customerApproval?: string;
  status: WorkOrderStatus;
  audit: {
    createdBy: string;
    updatedBy: string;
    createdAt: string;
    updatedAt: string;
  };
}

const WorkOrderSchema = new Schema<WorkOrderDocument>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    businessUnit: {
      type: String,
      enum: ["G3", "PrintersUAE", "IT"],
      required: true,
      index: true,
    },
    customerId: { type: String, required: true },
    customerName: { type: String },
    serviceTypeId: { type: String },
    assignedEmployeeId: { type: String },
    workDescription: { type: String, required: true },
    locationAddress: { type: String, required: true },
    customerPhone: { type: String, required: true },
    orderDateTime: { type: String, required: true },
    quotationReferenceNumber: { type: String },
    paymentMethod: { type: String },
    findings: { type: String },
    beforePhotos: { type: [String], default: [] },
    afterPhotos: { type: [String], default: [] },
    workCompletionDate: { type: String },
    approvalDate: { type: String },
    employeeSignature: { type: String },
    customerSignature: { type: String },
    customerNameAtCompletion: { type: String },
    signature: { type: String },
    customerApproval: { type: String },
    status: { type: String, enum: ["Draft", "Assigned", "Submitted"], default: "Draft" },
    audit: {
      createdBy: { type: String, required: true },
      updatedBy: { type: String, required: true },
      createdAt: { type: String, required: true },
      updatedAt: { type: String, required: true },
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

const WorkOrderModel: Model<WorkOrderDocument> =
  (mongoose.models.WorkOrder as Model<WorkOrderDocument>) ||
  mongoose.model<WorkOrderDocument>("WorkOrder", WorkOrderSchema);

export default WorkOrderModel;

