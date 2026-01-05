import crypto from "crypto";
import mongoose, { Schema, Model } from "mongoose";

export interface TicketCommentDocument extends mongoose.Document<string> {
  _id: string;
  ticketId: string;
  authorId: string;
  isInternal: boolean;
  message: string;
}

const TicketCommentSchema = new Schema<TicketCommentDocument>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    ticketId: {
      type: String,
      required: true,
      index: true,
    },
    authorId: {
      type: String,
      required: true,
    },
    isInternal: {
      type: Boolean,
      default: false,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
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

const TicketCommentModel: Model<TicketCommentDocument> =
  (mongoose.models.TicketComment as Model<TicketCommentDocument>) ||
  mongoose.model<TicketCommentDocument>("TicketComment", TicketCommentSchema);

export default TicketCommentModel;

