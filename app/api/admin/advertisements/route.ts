import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireFeatureAccess } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import AdvertisementModel from "@/lib/models/Advertisement";
import { uploadImage } from "@/lib/cloudinary";

export async function POST(request: NextRequest) {
  try {
    const user = await requireFeatureAccess(request, "advertisements", ["admin"]);
    const body = await request.json().catch(() => null);

    if (!body?.type || !["image", "message"].includes(body.type)) {
      return NextResponse.json(
        { error: "Type must be 'image' or 'message'" },
        { status: 400 }
      );
    }

    if (body.type === "image" && !body.imageUrl) {
      return NextResponse.json(
        { error: "imageUrl is required for image type advertisements" },
        { status: 400 }
      );
    }

    if (body.type === "message" && !body.message?.trim()) {
      return NextResponse.json(
        { error: "message is required for message type advertisements" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    let imageUrl: string | undefined;
    
    // Upload image to Cloudinary if provided
    if (body.type === "image" && body.imageUrl) {
      if (typeof body.imageUrl === "string" && body.imageUrl.startsWith("data:")) {
        try {
          imageUrl = await uploadImage(body.imageUrl, "advertisements");
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to upload image";
          console.error("Failed to upload advertisement image:", error);
          return NextResponse.json(
            { error: `Failed to upload image: ${errorMessage}` },
            { status: 500 }
          );
        }
      } else if (typeof body.imageUrl === "string" && body.imageUrl.trim().length > 0) {
        // Already a URL
        imageUrl = body.imageUrl;
      }
    }

    // Calculate expiration date (48 hours from now)
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + 48 * 60 * 60 * 1000); // 48 hours in milliseconds

    const advertisement = await AdvertisementModel.create({
      businessUnit: user.businessUnit,
      type: body.type,
      imageUrl: body.type === "image" ? imageUrl : undefined,
      message: body.type === "message" ? body.message.trim() : undefined,
      createdAt,
      expiresAt,
      createdByAdminId: user.id,
    });

    return NextResponse.json({
      success: true,
      advertisement: advertisement.toJSON(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = message === "Unauthorized" ? 401 : 500;
    console.error("POST /api/admin/advertisements failed", error);
    return NextResponse.json({ error: message }, { status });
  }
}

