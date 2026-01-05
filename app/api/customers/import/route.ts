import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import CustomerModel from "@/lib/models/Customer";

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    const body = await request.json().catch(() => null);
    const names: unknown = body?.names;
    if (!Array.isArray(names) || names.length === 0) {
      return NextResponse.json({ error: "names array required" }, { status: 400 });
    }
    await connectToDatabase();
    const payload = names
      .map((raw) => (typeof raw === "string" ? raw.trim() : ""))
      .filter(Boolean)
      .map((name) => ({
        name,
        businessUnit: user.businessUnit,
      }));

    if (payload.length === 0) {
      return NextResponse.json({ error: "No valid names provided" }, { status: 400 });
    }

    const created = await CustomerModel.insertMany(payload);
    return NextResponse.json({ created: created.map((c) => c.toJSON()) });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

