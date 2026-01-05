export function getPayrollDateForPeriod(dayOfMonth: number, period: string): Date {
  const [yearStr, monthStr] = period.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr); // 1-12

  if (!year || !month || month < 1 || month > 12) {
    throw new Error("Invalid period format. Expected YYYY-MM.");
  }

  // Start with requested day; if invalid (e.g., 30/31 in February), fall back to last day of month
  const targetDay = Math.min(dayOfMonth, 31);

  // JavaScript Date months are 0-based
  const tentative = new Date(Date.UTC(year, month - 1, targetDay));

  // If month rolled over, clamp to last day of target month
  if (tentative.getUTCMonth() + 1 !== month) {
    // dayOfMonth is beyond month length; use last day of the month
    const lastDay = new Date(Date.UTC(year, month, 0)); // day 0 of next month = last day of current month
    return lastDay;
  }

  return tentative;
}
