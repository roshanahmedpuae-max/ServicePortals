import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import DailyScheduleModel from "@/lib/models/DailySchedule";
import EmployeeModel from "@/lib/models/Employee";

const normalizeDate = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) return null;
  const iso = new Date(value).toISOString().slice(0, 10);
  return iso;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin", "employee"]);
    if (user.businessUnit !== "PrintersUAE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const url = new URL(request.url);
    const dateParam = normalizeDate(url.searchParams.get("date"));
    const dateFromParam = normalizeDate(url.searchParams.get("from"));
    const dateToParam = normalizeDate(url.searchParams.get("to"));
    const employeeIdParam = url.searchParams.get("employeeId") || undefined;

    const conditions: Record<string, unknown>[] = [{ businessUnit: user.businessUnit }];

    if (dateFromParam || dateToParam) {
      const range: Record<string, string> = {};
      if (dateFromParam) range.$gte = dateFromParam;
      if (dateToParam) range.$lte = dateToParam;
      conditions.push({ date: range });
    } else if (dateParam) {
      conditions.push({ date: dateParam });
    }

    if (user.role === "employee") {
      // Employees should see schedules assigned to their ID, and also
      // any schedules that were created using only their name in the
      // "Additional names" field.
      const orConditions: Record<string, unknown>[] = [{ employeeIds: user.id }];
      if (user.name && user.name.trim()) {
        orConditions.push({
          employeeNames: {
            $regex: new RegExp(`^${escapeRegExp(user.name.trim())}$`, "i"),
          },
        });
      }
      conditions.push({ $or: orConditions });
    } else if (employeeIdParam) {
      // Admins can optionally filter by a specific employee
      conditions.push({ employeeIds: employeeIdParam });
    }

    const query =
      conditions.length === 1
        ? conditions[0]
        : {
            $and: conditions,
          };

    const schedules = await DailyScheduleModel.find(query).sort({
      date: -1,
      "employeeNames.0": 1,
    });
    return NextResponse.json(schedules.map((s) => s.toJSON()));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = message === "Unauthorized" ? 401 : 500;
    console.error("GET /api/daily-schedules failed", error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    if (user.businessUnit !== "PrintersUAE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const normalizedDate = normalizeDate(body?.date);
    const rawTasks: unknown[] = Array.isArray(body?.tasks) ? body.tasks : [];
    const rawEmployeeIds: unknown[] = Array.isArray(body?.employeeIds) ? body.employeeIds : [];
    const tasks = rawTasks
      .map((t) => (typeof t === "string" ? t.trim() : ""))
      .filter((t) => t.length > 0)
      .map((text) => ({ text }));

    const employeeIds = rawEmployeeIds.filter((v) => typeof v === "string" && v.trim().length > 0);
    const employeeNames: string[] = Array.isArray(body?.employeeNames)
      ? body.employeeNames.filter((v: unknown) => typeof v === "string" && v.trim().length > 0)
      : [];

    if (!normalizedDate || tasks.length === 0 || (employeeIds.length === 0 && employeeNames.length === 0)) {
      return NextResponse.json(
        { error: "date (YYYY-MM-DD), at least one employee, and at least one task are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const resolvedIds: string[] = [];
    const resolvedNames: string[] = [];

    if (employeeIds.length > 0) {
      // Narrow employeeIds to strings for the MongoDB query
      const employeeIdStrings = employeeIds as string[];
      const employees = await EmployeeModel.find({
        _id: { $in: employeeIdStrings },
        businessUnit: user.businessUnit,
      });
      if (employees.length === 0) {
        return NextResponse.json({ error: "Employees not found" }, { status: 404 });
      }
      resolvedIds.push(...employees.map((e) => e._id));
      resolvedNames.push(...employees.map((e) => e.name));
    }

    if (employeeNames.length > 0) {
      resolvedNames.push(...employeeNames);
    }

    const now = new Date().toISOString();
    const created = await DailyScheduleModel.create({
      businessUnit: user.businessUnit,
      date: normalizedDate,
      employeeIds: resolvedIds,
      employeeNames: resolvedNames,
      tasks,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json(created.toJSON(), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = message === "Unauthorized" ? 401 : 500;
    console.error("POST /api/daily-schedules failed", error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    if (user.businessUnit !== "PrintersUAE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const id = typeof body?.id === "string" ? body.id : null;
    const normalizedDate = normalizeDate(body?.date);
    const rawTasks: unknown[] = Array.isArray(body?.tasks) ? body.tasks : [];
    const rawEmployeeIds: unknown[] = Array.isArray(body?.employeeIds) ? body.employeeIds : [];

    const tasks = rawTasks
      .map((t) => (typeof t === "string" ? t.trim() : ""))
      .filter((t) => t.length > 0)
      .map((text) => ({ text }));

    const employeeIds = rawEmployeeIds.filter((v) => typeof v === "string" && v.trim().length > 0);
    const employeeNames: string[] = Array.isArray(body?.employeeNames)
      ? body.employeeNames.filter((v: unknown) => typeof v === "string" && v.trim().length > 0)
      : [];

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    if (!normalizedDate || tasks.length === 0 || (employeeIds.length === 0 && employeeNames.length === 0)) {
      return NextResponse.json(
        { error: "date (YYYY-MM-DD), at least one employee, and at least one task are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const resolvedIds: string[] = [];
    const resolvedNames: string[] = [];

    if (employeeIds.length > 0) {
      const employeeIdStrings = employeeIds as string[];
      const employees = await EmployeeModel.find({
        _id: { $in: employeeIdStrings },
        businessUnit: user.businessUnit,
      });
      if (employees.length === 0) {
        return NextResponse.json({ error: "Employees not found" }, { status: 404 });
      }
      resolvedIds.push(...employees.map((e) => e._id));
      resolvedNames.push(...employees.map((e) => e.name));
    }

    if (employeeNames.length > 0) {
      resolvedNames.push(...employeeNames);
    }

    const now = new Date().toISOString();
    const updated = await DailyScheduleModel.findOneAndUpdate(
      { _id: id, businessUnit: user.businessUnit },
      {
        date: normalizedDate,
        employeeIds: resolvedIds,
        employeeNames: resolvedNames,
        tasks,
        updatedAt: now,
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    return NextResponse.json(updated.toJSON(), { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = message === "Unauthorized" ? 401 : 500;
    console.error("PUT /api/daily-schedules failed", error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    if (user.businessUnit !== "PrintersUAE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const id = typeof body?.id === "string" ? body.id : null;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await connectToDatabase();

    const deleted = await DailyScheduleModel.findOneAndDelete({
      _id: id,
      businessUnit: user.businessUnit,
    });

    if (!deleted) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = message === "Unauthorized" ? 401 : 500;
    console.error("DELETE /api/daily-schedules failed", error);
    return NextResponse.json({ error: message }, { status });
  }
}
