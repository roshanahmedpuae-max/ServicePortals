import crypto from "crypto";
import mongoose, { Schema, Model } from "mongoose";
import { BusinessUnit } from "@/lib/types";

export interface AdvertisementDocument extends mongoose.Document<string> {
  _id: string;
  businessUnit: BusinessUnit;
  type: "image" | "message";
  imageUrl?: string;
  message?: string;
  createdAt: Date;
  expiresAt: Date;
  createdByAdminId: string;
}

const AdvertisementSchema = new Schema<AdvertisementDocument>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    businessUnit: {
      type: String,
      enum: ["G3", "PrintersUAE", "IT"],
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["image", "message"],
      required: true,
      index: true,
    },
    imageUrl: { type: String, required: false },
    message: { type: String, required: false, trim: true },
    createdAt: { type: Date, required: true, default: () => new Date(), index: true },
    expiresAt: { type: Date, required: true, index: true },
    createdByAdminId: { type: String, required: true },
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

AdvertisementSchema.index({ businessUnit: 1, expiresAt: 1 });
AdvertisementSchema.index({ expiresAt: 1 });

const AdvertisementModel: Model<AdvertisementDocument> =
  (mongoose.models.Advertisement as Model<AdvertisementDocument>) ||
  mongoose.model<AdvertisementDocument>("Advertisement", AdvertisementSchema);

export default AdvertisementModel;

