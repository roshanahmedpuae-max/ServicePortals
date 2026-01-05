import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import ServiceTypeModel from "@/lib/models/ServiceType";

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    await connectToDatabase();
    const serviceTypes = await ServiceTypeModel.find({
      businessUnit: user.businessUnit,
    });
    return NextResponse.json(serviceTypes.map((s) => s.toJSON()));
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
    const created = await ServiceTypeModel.create({
      name: body.name,
      description: body.description,
      businessUnit: user.businessUnit,
    });
    return NextResponse.json(created.toJSON(), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    const body = await request.json().catch(() => null);
    if (!body?.id) {
      return NextResponse.json({ error: "Service type id is required" }, { status: 400 });
    }
    await connectToDatabase();
    const updated = await ServiceTypeModel.findOneAndUpdate(
      { _id: body.id, businessUnit: user.businessUnit },
      {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
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
      return NextResponse.json({ error: "Service type id is required" }, { status: 400 });
    }
    await connectToDatabase();
    const deleted = await ServiceTypeModel.findOneAndDelete({
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

