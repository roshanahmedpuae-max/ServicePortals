import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import CustomerModel from "@/lib/models/Customer";

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    await connectToDatabase();
    const customers = await CustomerModel.find({ businessUnit: user.businessUnit });
    return NextResponse.json(customers.map((c) => c.toJSON()));
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    const body = await request.json().catch(() => null);
    if (!body?.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    await connectToDatabase();
    const customer = await CustomerModel.create({
      name: body.name,
      contact: body.contact,
      businessUnit: user.businessUnit,
    });
    return NextResponse.json(customer.toJSON(), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    const body = await request.json().catch(() => null);
    if (!body?.id) {
      return NextResponse.json({ error: "Customer id is required" }, { status: 400 });
    }
    await connectToDatabase();
    const updated = await CustomerModel.findOneAndUpdate(
      { _id: body.id, businessUnit: user.businessUnit },
      {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.contact !== undefined ? { contact: body.contact } : {}),
      },
      { new: true }
    );
    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(updated.toJSON());
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    const body = await request.json().catch(() => null);
    if (!body?.id) {
      return NextResponse.json({ error: "Customer id is required" }, { status: 400 });
    }
    await connectToDatabase();
    const deleted = await CustomerModel.findOneAndDelete({
      _id: body.id,
      businessUnit: user.businessUnit,
    });
    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

