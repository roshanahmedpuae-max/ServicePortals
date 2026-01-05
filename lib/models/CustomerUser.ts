import crypto from "crypto";
import mongoose, { Schema, Model } from "mongoose";
import { BusinessUnit } from "@/lib/types";
import { hashPassword } from "@/lib/models/utils";

export interface CustomerUserDocument extends mongoose.Document<string> {
  _id: string;
  email: string;
  username: string;
  companyName?: string;
  passwordHash: string;
  businessUnit: BusinessUnit;
  role: "customer";
  resetOtp?: string;
  resetOtpExpiresAt?: Date;
}

const CustomerUserSchema = new Schema<CustomerUserDocument>(
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
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    companyName: {
      type: String,
      required: false,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    businessUnit: {
      type: String,
      enum: ["G3", "PrintersUAE", "IT"],
      required: true,
      index: true,
    },
    role: {
      type: String,
      default: "customer",
    },
    resetOtp: {
      type: String,
      required: false,
    },
    resetOtpExpiresAt: {
      type: Date,
      required: false,
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
        delete ret.passwordHash;
      },
    },
    toObject: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.passwordHash;
      },
    },
  }
);

export function createCustomerUserPayload(input: {
  email: string;
  username: string;
  companyName?: string;
  password: string;
  businessUnit: BusinessUnit;
}) {
  return {
    email: input.email.toLowerCase().trim(),
    username: input.username.trim(),
    companyName: input.companyName?.trim(),
    passwordHash: hashPassword(input.password),
    businessUnit: input.businessUnit,
    role: "customer" as const,
  };
}

const CustomerUserModel: Model<CustomerUserDocument> =
  (mongoose.models.CustomerUser as Model<CustomerUserDocument>) ||
  mongoose.model<CustomerUserDocument>("CustomerUser", CustomerUserSchema);

export default CustomerUserModel;

