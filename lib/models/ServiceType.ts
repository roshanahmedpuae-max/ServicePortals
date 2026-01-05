import crypto from "crypto";
import mongoose, { Schema, Model } from "mongoose";
import { BusinessUnit } from "@/lib/types";

export interface ServiceTypeDocument extends mongoose.Document<string> {
  _id: string;
  businessUnit: BusinessUnit;
  name: string;
  description?: string;
}

const ServiceTypeSchema = new Schema<ServiceTypeDocument>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    businessUnit: {
      type: String,
      enum: ["G3", "PrintersUAE", "IT"],
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String },
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

const ServiceTypeModel: Model<ServiceTypeDocument> =
  (mongoose.models.ServiceType as Model<ServiceTypeDocument>) ||
  mongoose.model<ServiceTypeDocument>("ServiceType", ServiceTypeSchema);

export default ServiceTypeModel;

