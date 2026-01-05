import { OvertimeRequest } from "@/lib/types";

export type OvertimeValidationResult = {
  ok: boolean;
  error?: string;
};

export function calculateHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map((v) => Number(v));
  const [eh, em] = endTime.split(":").map((v) => Number(v));

  if (Number.isNaN(sh) || Number.isNaN(sm) || Number.isNaN(eh) || Number.isNaN(em)) {
    return 0;
  }

  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;

  if (endMinutes <= startMinutes) {
    return 0;
  }

  const totalMinutes = endMinutes - startMinutes;
  return Math.round((totalMinutes / 60) * 100) / 100; // Round to 2 decimal places
}

export function validateOvertimeRequest(options: {
  date: string;
  startTime: string;
  endTime: string;
  description: string;
}): OvertimeValidationResult {
  const { date, startTime, endTime, description } = options;

  if (!date) {
    return { ok: false, error: "Date is required" };
  }

  const requestDate = new Date(date);
  if (Number.isNaN(requestDate.getTime())) {
    return { ok: false, error: "Invalid date" };
  }

  // Date cannot be in the future
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (requestDate > today) {
    return { ok: false, error: "Overtime date cannot be in the future" };
  }

  // Date cannot be more than 30 days in the past
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);
  if (requestDate < thirtyDaysAgo) {
    return { ok: false, error: "Overtime date cannot be more than 30 days in the past" };
  }

  if (!startTime || !endTime) {
    return { ok: false, error: "Start time and end time are required" };
  }

  const [sh, sm] = startTime.split(":").map((v) => Number(v));
  const [eh, em] = endTime.split(":").map((v) => Number(v));

  if (
    Number.isNaN(sh) ||
    Number.isNaN(sm) ||
    Number.isNaN(eh) ||
    Number.isNaN(em) ||
    sh < 0 ||
    sh > 23 ||
    eh < 0 ||
    eh > 23 ||
    sm < 0 ||
    sm > 59 ||
    em < 0 ||
    em > 59
  ) {
    return { ok: false, error: "Invalid start or end time" };
  }

  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;

  if (endMinutes <= startMinutes) {
    return { ok: false, error: "End time must be after start time" };
  }

  const hours = calculateHours(startTime, endTime);

  // Minimum 0.5 hours (30 minutes)
  if (hours < 0.5) {
    return { ok: false, error: "Overtime must be at least 0.5 hours (30 minutes)" };
  }

  // Maximum 12 hours per day
  if (hours > 12) {
    return { ok: false, error: "Overtime cannot exceed 12 hours per day" };
  }

  if (!description || description.trim().length < 5) {
    return { ok: false, error: "Description must be at least 5 characters" };
  }

  if (description.trim().length > 2000) {
    return { ok: false, error: "Description is too long (maximum 2000 characters)" };
  }

  return { ok: true };
}

export function isOvertimeOverlapping(
  existing: Pick<OvertimeRequest, "date" | "startTime" | "endTime" | "status">[],
  candidate: Pick<OvertimeRequest, "date" | "startTime" | "endTime">
): boolean {
  const toMinutes = (time: string) => {
    const [h, m] = time.split(":").map((v) => Number(v));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  };

  const cStartMinutes = toMinutes(candidate.startTime);
  const cEndMinutes = toMinutes(candidate.endTime);

  if (cStartMinutes === null || cEndMinutes === null) {
    return false;
  }

  return existing.some((overtime) => {
    if (overtime.status !== "Pending" && overtime.status !== "Approved") {
      return false;
    }

    if (overtime.date !== candidate.date) {
      return false;
    }

    const eStartMinutes = toMinutes(overtime.startTime);
    const eEndMinutes = toMinutes(overtime.endTime);

    if (eStartMinutes === null || eEndMinutes === null) {
      return false;
    }

    // Check if time ranges overlap
    return cStartMinutes < eEndMinutes && cEndMinutes > eStartMinutes;
  });
}

