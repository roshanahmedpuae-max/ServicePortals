import { LeaveRequest, LeaveType, LeaveUnit } from "@/lib/types";

export type LeaveValidationResult = {
  ok: boolean;
  error?: string;
};

export function validateLeaveRange(options: {
  type: LeaveType;
  unit: LeaveUnit;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
}): LeaveValidationResult {
  const { type, unit, startDate, endDate, startTime, endTime } = options;

  if (!startDate) {
    return { ok: false, error: "Start date is required" };
  }

  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) {
    return { ok: false, error: "Invalid start date" };
  }

  let end: Date | null = null;
  if (endDate) {
    end = new Date(endDate);
    if (Number.isNaN(end.getTime())) {
      return { ok: false, error: "Invalid end date" };
    }
    if (end < start) {
      return { ok: false, error: "End date cannot be before start date" };
    }
  }

  // Basic corporate-style rules
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Allow backdated sick leave (with or without certificate) but disallow backdated Annual
  if (type !== "SickWithCertificate" && type !== "SickWithoutCertificate" && start < today) {
    return { ok: false, error: "Backdated leave is only allowed for sick leave" };
  }

  if (unit === "HalfDay") {
    if (!startTime || !endTime) {
      return { ok: false, error: "Start time and end time are required for half-day leave" };
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
  }

  return { ok: true };
}

export function isLeaveOverlapping(
  existing: Pick<LeaveRequest, "startDate" | "endDate" | "startTime" | "endTime" | "unit" | "status">[],
  candidate: Pick<LeaveRequest, "startDate" | "endDate" | "startTime" | "endTime" | "unit">
): boolean {
  const parseDate = (iso: string) => {
    const d = new Date(iso);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const cStart = parseDate(candidate.startDate);
  const cEnd = candidate.endDate ? parseDate(candidate.endDate) : cStart;

  const toMinutes = (time?: string) => {
    if (!time) return null;
    const [h, m] = time.split(":").map((v) => Number(v));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  };

  const cStartMinutes = toMinutes(candidate.startTime);
  const cEndMinutes = toMinutes(candidate.endTime);

  return existing.some((leave) => {
    if (leave.status !== "Pending" && leave.status !== "Approved") {
      return false;
    }

    const eStart = parseDate(leave.startDate);
    const eEnd = leave.endDate ? parseDate(leave.endDate) : eStart;

    const datesOverlap = cStart <= eEnd && cEnd >= eStart;
    if (!datesOverlap) return false;

    // If either is full-day, any date overlap is enough
    if (leave.unit === "FullDay" || candidate.unit === "FullDay") {
      return true;
    }

    // For half-day, check time windows when on the same day
    if (cStart.getTime() === eStart.getTime()) {
      const eStartMinutes = toMinutes(leave.startTime);
      const eEndMinutes = toMinutes(leave.endTime);
      if (
        eStartMinutes !== null &&
        eEndMinutes !== null &&
        cStartMinutes !== null &&
        cEndMinutes !== null &&
        cStartMinutes < eEndMinutes &&
        cEndMinutes > eStartMinutes
      ) {
        return true;
      }
    }

    return false;
  });
}

