import crypto from "crypto";
import mongoose, { Schema, Model } from "mongoose";
import { BusinessUnit } from "@/lib/types";
import { hashPassword } from "@/lib/models/utils";

export interface AdminDocument extends mongoose.Document<string> {
  _id: string;
  email: string;
  passwordHash: string;
  businessUnit: BusinessUnit;
  role: "admin";
}

const AdminSchema = new Schema<AdminDocument>(
  {
    _id: {
      type: String,
      default: () => crypto.randomUUID(),
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    businessUnit: {
      type: String,
      enum: ["G3", "PrintersUAE", "IT"],
      required: true,
    },
    role: { type: String, default: "admin" },
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

const AdminModel: Model<AdminDocument> =
  (mongoose.models.Admin as Model<AdminDocument>) ||
  mongoose.model<AdminDocument>("Admin", AdminSchema);

const adminSeeds: Array<{ email: string; password: string; businessUnit: BusinessUnit }> = [
  { email: "info@g3fm.ae", password: "G3fm@2025", businessUnit: "G3" },
  {
    email: "info@printersuae.com",
    password: "Printersuae@2025",
    businessUnit: "PrintersUAE",
  },
  { email: "info@it.ae", password: "ITS@2025", businessUnit: "IT" },
];

export async function ensureAdminSeeds() {
  const existingCount = await AdminModel.estimatedDocumentCount();
  if (existingCount > 0) return;

  await AdminModel.insertMany(
    adminSeeds.map((seed) => ({
      email: seed.email.toLowerCase(),
      passwordHash: hashPassword(seed.password),
      businessUnit: seed.businessUnit,
      role: "admin",
    }))
  );
}

export default AdminModel;

