import crypto from "crypto";
import mongoose, { Schema, Model } from "mongoose";
import { BusinessUnit } from "@/lib/types";

export interface CustomerDocument extends mongoose.Document<string> {
  _id: string;
  businessUnit: BusinessUnit;
  name: string;
  contact?: string;
}

const CustomerSchema = new Schema<CustomerDocument>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    businessUnit: {
      type: String,
      enum: ["G3", "PrintersUAE", "IT"],
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    contact: { type: String },
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

const CustomerModel: Model<CustomerDocument> =
  (mongoose.models.Customer as Model<CustomerDocument>) ||
  mongoose.model<CustomerDocument>("Customer", CustomerSchema);

export default CustomerModel;

