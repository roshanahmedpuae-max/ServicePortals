import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { AssetDocumentModel } from "@/lib/models/Assets";
import EmployeeNotificationModel from "@/lib/models/EmployeeNotification";

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    await connectToDatabase();

    const categoryKey = request.nextUrl.searchParams.get("categoryKey") || undefined;
    const assetId = request.nextUrl.searchParams.get("assetId") || undefined;

    const query: Record<string, unknown> = {
      businessUnit: user.businessUnit,
    };

    if (categoryKey) {
      query.categoryKey = categoryKey;
    }
    if (assetId) {
      query.assetId = assetId;
    }

    const docs = await AssetDocumentModel.find(query).sort({ uploadedAt: -1 }).limit(500);
    return NextResponse.json(docs.map((d) => d.toJSON()));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    const body = await request.json().catch(() => null);

    if (!body?.assetId || !body?.categoryKey || !body?.fileName || !body?.fileUrl) {
      return NextResponse.json(
        { error: "assetId, categoryKey, fileName and fileUrl are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const doc = await AssetDocumentModel.create({
      categoryKey: body.categoryKey,
      assetId: body.assetId,
      businessUnit: user.businessUnit,
      fileName: body.fileName,
      fileUrl: body.fileUrl,
      fileType: body.fileType,
      docType: body.docType,
      uploadedByAdminId: user.id,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
    });

    // Create notification for employee if document is for an employee
    if (body.categoryKey === "employees" && body.assetId) {
      await EmployeeNotificationModel.create({
        employeeId: body.assetId,
        businessUnit: user.businessUnit,
        type: "document_update",
        title: "New Document Added",
        message: `A new document "${body.fileName}" has been added to your profile by admin.`,
        relatedId: doc._id,
        createdByAdminId: user.id,
      });
    }

    return NextResponse.json(doc.toJSON(), { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating asset document:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create asset document" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    const body = await request.json().catch(() => null);
    if (!body?.id) {
      return NextResponse.json({ error: "Document id is required" }, { status: 400 });
    }

    await connectToDatabase();
    const updates: Record<string, unknown> = {};
    if (body.fileName !== undefined) updates.fileName = body.fileName;
    if (body.fileUrl !== undefined) updates.fileUrl = body.fileUrl;
    if (body.fileType !== undefined) updates.fileType = body.fileType;
    if (body.docType !== undefined) updates.docType = body.docType;
    if (body.expiryDate !== undefined) {
      updates.expiryDate = body.expiryDate ? new Date(body.expiryDate) : undefined;
    }

    const existing = await AssetDocumentModel.findOne({
      _id: body.id,
      businessUnit: user.businessUnit,
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await AssetDocumentModel.findOneAndUpdate(
      { _id: body.id, businessUnit: user.businessUnit },
      updates,
      { new: true }
    );

    // Create notification for employee if document is for an employee
    if (existing.categoryKey === "employees" && existing.assetId) {
      await EmployeeNotificationModel.create({
        employeeId: existing.assetId,
        businessUnit: user.businessUnit,
        type: "document_update",
        title: "Document Updated",
        message: `Your document "${updated?.fileName || existing.fileName}" has been updated by admin.`,
        relatedId: updated?._id || existing._id,
        createdByAdminId: user.id,
      });
    }

    return NextResponse.json(updated?.toJSON() || existing.toJSON());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    const body = await request.json().catch(() => null);
    if (!body?.id) {
      return NextResponse.json({ error: "Document id is required" }, { status: 400 });
    }

    await connectToDatabase();
    const existing = await AssetDocumentModel.findOne({
      _id: body.id,
      businessUnit: user.businessUnit,
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await existing.deleteOne();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}


