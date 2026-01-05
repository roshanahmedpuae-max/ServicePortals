import crypto from "crypto";

export const hashPassword = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");

