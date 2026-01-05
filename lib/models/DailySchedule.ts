import crypto from "crypto";
import mongoose, { Schema, Model } from "mongoose";
import { BusinessUnit } from "@/lib/types";

export interface ScheduleItem {
  text: string;
}

export interface DailyScheduleDocument extends mongoose.Document<string> {
  _id: string;
  businessUnit: BusinessUnit;
  date: string; // YYYY-MM-DD
  employeeIds: string[];
  employeeNames: string[];
  tasks: ScheduleItem[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const ScheduleItemSchema = new Schema<ScheduleItem>(
  {
    text: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const DailyScheduleSchema = new Schema<DailyScheduleDocument>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    businessUnit: {
      type: String,
      enum: ["G3", "PrintersUAE", "IT"],
      required: true,
      index: true,
    },
    date: { type: String, required: true, index: true },
    employeeIds: { type: [String], default: [], index: true },
    employeeNames: { type: [String], default: [] },
    tasks: { type: [ScheduleItemSchema], default: [] },
    createdBy: { type: String, required: true },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  {
    timestamps: false,
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

const DailyScheduleModel: Model<DailyScheduleDocument> =
  (mongoose.models.DailySchedule as Model<DailyScheduleDocument>) ||
  mongoose.model<DailyScheduleDocument>("DailySchedule", DailyScheduleSchema);

export default DailyScheduleModel;
