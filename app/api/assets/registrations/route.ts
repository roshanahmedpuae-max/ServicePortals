import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { CompanyRegistrationModel, syncCompanyRegistrationDates } from "@/lib/models/Assets";
import { uploadFile } from "@/lib/cloudinary";

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    await connectToDatabase();

    const search = request.nextUrl.searchParams.get("search") || "";
    const status = request.nextUrl.searchParams.get("status") || "";

    const query: {
      $or?: any[];
      $and?: any[];
      [key: string]: unknown;
    } = {};

    // Registrations may be global or BU-specific; if BU-specific, filter by it.
    query.$or = [{ businessUnit: user.businessUnit }, { businessUnit: { $exists: false } }];

    if (search) {
      query.$and = [
        {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { registrationNumber: { $regex: search, $options: "i" } },
          ],
        },
      ];
    }

    if (status) {
      if (!Array.isArray(query.$and)) {
        query.$and = [];
      }
      query.$and.push({ status });
    }

    const items = await CompanyRegistrationModel.find(query).sort({ expiryDate: 1 }).limit(500);
    return NextResponse.json(items.map((r) => r.toJSON()));
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    const body = await request.json().catch(() => null);
    if (!body?.name || !body?.expiryDate) {
      return NextResponse.json(
        { error: "Name and expiry date are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Handle certificate file upload to Cloudinary if provided
    let certificateUrl: string | undefined;
    let fileUploadError: string | undefined;
    
    if (body.certificateFile && typeof body.certificateFile === "string") {
      if (body.certificateFile.startsWith("data:")) {
        try {
          certificateUrl = await uploadFile(body.certificateFile, "registrations");
        } catch (error) {
          fileUploadError = error instanceof Error ? error.message : "Failed to upload certificate file";
        }
      } else if (body.certificateFile.trim().length > 0) {
        certificateUrl = body.certificateFile;
      }
    }

    const item = await CompanyRegistrationModel.create({
      name: body.name,
      registrationType: body.registrationType ?? "Other",
      jurisdiction: body.jurisdiction,
      registrationNumber: body.registrationNumber,
      issuingAuthority: body.issuingAuthority,
      businessUnit: body.businessUnit ?? user.businessUnit,
      issueDate: body.issueDate,
      expiryDate: body.expiryDate,
      renewalCycle: body.renewalCycle,
      responsibleDepartment: body.responsibleDepartment,
      primaryContactEmployeeId: body.primaryContactEmployeeId,
      primaryContactEmail: body.primaryContactEmail,
      primaryContactPhone: body.primaryContactPhone,
      certificateUrl,
      status: body.status ?? "Active",
      tags: body.tags,
      notes: body.notes,
      createdByAdminId: user.id,
      updatedByAdminId: user.id,
    });

    await syncCompanyRegistrationDates(item);

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
    console.error("Error creating company registration:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create company registration" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    const body = await request.json().catch(() => null);
    if (!body?.id) {
      return NextResponse.json({ error: "Registration id is required" }, { status: 400 });
    }

    await connectToDatabase();

    const updates: Record<string, unknown> = {};
    const fields = [
      "name",
      "registrationType",
      "jurisdiction",
      "registrationNumber",
      "issuingAuthority",
      "businessUnit",
      "issueDate",
      "expiryDate",
      "renewalCycle",
      "responsibleDepartment",
      "primaryContactEmployeeId",
      "primaryContactEmail",
      "primaryContactPhone",
      "status",
      "tags",
      "notes",
    ];

    for (const key of fields) {
      if (key in body) {
        updates[key] = (body as any)[key];
      }
    }

    // Handle certificate file upload to Cloudinary if provided
    let fileUploadError: string | undefined;
    
    if (body.certificateFile !== undefined) {
      if (body.certificateFile && typeof body.certificateFile === "string") {
        if (body.certificateFile.startsWith("data:")) {
          try {
            updates.certificateUrl = await uploadFile(body.certificateFile, "registrations");
          } catch (error) {
            fileUploadError = error instanceof Error ? error.message : "Failed to upload certificate file";
            // Don't update certificateUrl if upload failed
          }
        } else if (body.certificateFile.trim().length > 0) {
          updates.certificateUrl = body.certificateFile;
        } else {
          updates.certificateUrl = undefined;
        }
      } else if (body.certificateFile === null || body.certificateFile === "") {
        updates.certificateUrl = undefined;
      }
    }

    updates.updatedByAdminId = user.id;

    const updated = await CompanyRegistrationModel.findByIdAndUpdate(body.id, updates, {
      new: true,
    });
    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await syncCompanyRegistrationDates(updated);

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
    console.error("Error updating company registration:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update company registration" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    const body = await request.json().catch(() => null);
    if (!body?.id) {
      return NextResponse.json({ error: "Registration id is required" }, { status: 400 });
    }

    await connectToDatabase();
    const existing = await CompanyRegistrationModel.findById(body.id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await existing.deleteOne();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

