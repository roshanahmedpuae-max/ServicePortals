import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { BillContractModel, syncBillContractDates } from "@/lib/models/Assets";
import { uploadFile } from "@/lib/cloudinary";

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
        { vendor: { $regex: search, $options: "i" } },
        { accountNumber: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      query.status = status;
    }

    const items = await BillContractModel.find(query).sort({ endDate: 1 }).limit(500);
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
      return NextResponse.json(
        { error: "Bill/Contract name is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Handle document file upload to Cloudinary if provided
    let documentUrl: string | undefined;
    let fileUploadError: string | undefined;
    
    if (body.documentFile && typeof body.documentFile === "string") {
      if (body.documentFile.startsWith("data:")) {
        try {
          documentUrl = await uploadFile(body.documentFile, "bills-contracts");
        } catch (error) {
          fileUploadError = error instanceof Error ? error.message : "Failed to upload bill document";
        }
      } else if (body.documentFile.trim().length > 0) {
        documentUrl = body.documentFile;
      }
    }

    const item = await BillContractModel.create({
      name: body.name,
      type: body.type,
      vendor: body.vendor,
      accountNumber: body.accountNumber,
      businessUnit: user.businessUnit,
      location: body.location,
      billingFrequency: body.billingFrequency,
      approxAmount: body.approxAmount,
      startDate: body.startDate,
      endDate: body.endDate,
      nextPaymentDueDate: body.nextPaymentDueDate,
      documentUrl,
      status: body.status ?? "Active",
      tags: body.tags,
      notes: body.notes,
      createdByAdminId: user.id,
      updatedByAdminId: user.id,
    });

    await syncBillContractDates(item);

    const itemJson = item.toJSON();
    // Include file upload error in response if it occurred
    if (fileUploadError) {
      (itemJson as any).fileUploadError = fileUploadError;
    }

    return NextResponse.json(itemJson, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating bill/contract:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create bill/contract" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    const body = await request.json().catch(() => null);
    if (!body?.id) {
      return NextResponse.json({ error: "Bill/Contract id is required" }, { status: 400 });
    }

    await connectToDatabase();

    const updates: Record<string, unknown> = {};
    const fields = [
      "name",
      "type",
      "vendor",
      "accountNumber",
      "location",
      "billingFrequency",
      "approxAmount",
      "startDate",
      "endDate",
      "nextPaymentDueDate",
      "status",
      "tags",
      "notes",
    ];

    for (const key of fields) {
      if (key in body) {
        updates[key] = (body as any)[key];
      }
    }

    // Handle document file upload to Cloudinary if provided
    let fileUploadError: string | undefined;
    
    if (body.documentFile !== undefined) {
      if (body.documentFile && typeof body.documentFile === "string") {
        if (body.documentFile.startsWith("data:")) {
          try {
            updates.documentUrl = await uploadFile(body.documentFile, "bills-contracts");
          } catch (error) {
            fileUploadError = error instanceof Error ? error.message : "Failed to upload bill document";
            // Don't update documentUrl if upload failed
          }
        } else if (body.documentFile.trim().length > 0) {
          updates.documentUrl = body.documentFile;
        } else {
          updates.documentUrl = undefined;
        }
      } else if (body.documentFile === null || body.documentFile === "") {
        updates.documentUrl = undefined;
      }
    }

    updates.updatedByAdminId = user.id;

    const updated = await BillContractModel.findOneAndUpdate(
      { _id: body.id, businessUnit: user.businessUnit },
      updates,
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await syncBillContractDates(updated);

    const updatedJson = updated.toJSON();
    // Include file upload error in response if it occurred
    if (fileUploadError) {
      (updatedJson as any).fileUploadError = fileUploadError;
    }

    return NextResponse.json(updatedJson);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error updating bill/contract:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update bill/contract" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    const body = await request.json().catch(() => null);
    if (!body?.id) {
      return NextResponse.json({ error: "Bill/Contract id is required" }, { status: 400 });
    }

    await connectToDatabase();
    const existing = await BillContractModel.findOne({
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

