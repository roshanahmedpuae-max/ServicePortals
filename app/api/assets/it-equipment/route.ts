import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { ITEquipmentModel, syncITEquipmentDates } from "@/lib/models/Assets";

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    await connectToDatabase();

    const search = request.nextUrl.searchParams.get("search") || "";
    const status = request.nextUrl.searchParams.get("status") || "";

    const query: Record<string, unknown> = {
      businessUnit: user.businessUnit,
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { assetTag: { $regex: search, $options: "i" } },
        { serialNumber: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      query.status = status;
    }

    const items = await ITEquipmentModel.find(query).sort({ createdAt: -1 }).limit(500);
    return NextResponse.json(items.map((i) => i.toJSON()));
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    const body = await request.json().catch(() => null);
    if (!body?.name) {
      return NextResponse.json({ error: "Asset name is required" }, { status: 400 });
    }

    await connectToDatabase();

    const item = await ITEquipmentModel.create({
      name: body.name,
      businessUnit: user.businessUnit,
      category: body.category,
      assetTag: body.assetTag,
      serialNumber: body.serialNumber,
      location: body.location,
      vendor: body.vendor,
      purchaseDate: body.purchaseDate,
      warrantyEndDate: body.warrantyEndDate,
      amcStartDate: body.amcStartDate,
      amcEndDate: body.amcEndDate,
      linkedEmployeeId: body.linkedEmployeeId,
      status: body.status ?? "Active",
      tags: body.tags,
      notes: body.notes,
      createdByAdminId: user.id,
      updatedByAdminId: user.id,
    });

    await syncITEquipmentDates(item);

    return NextResponse.json(item.toJSON(), { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating IT equipment:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create IT equipment" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    const body = await request.json().catch(() => null);
    if (!body?.id) {
      return NextResponse.json({ error: "IT equipment id is required" }, { status: 400 });
    }

    await connectToDatabase();

    const updates: Record<string, unknown> = {};
    const fields = [
      "name",
      "category",
      "assetTag",
      "serialNumber",
      "location",
      "vendor",
      "purchaseDate",
      "warrantyEndDate",
      "amcStartDate",
      "amcEndDate",
      "linkedEmployeeId",
      "status",
      "tags",
      "notes",
    ];

    for (const key of fields) {
      if (key in body) {
        updates[key] = (body as any)[key];
      }
    }

    updates.updatedByAdminId = user.id;

    const updated = await ITEquipmentModel.findOneAndUpdate(
      { _id: body.id, businessUnit: user.businessUnit },
      updates,
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await syncITEquipmentDates(updated);

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
      return NextResponse.json({ error: "IT equipment id is required" }, { status: 400 });
    }

    await connectToDatabase();
    const existing = await ITEquipmentModel.findOne({
      _id: body.id,
      businessUnit: user.businessUnit,
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await existing.deleteOne();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

