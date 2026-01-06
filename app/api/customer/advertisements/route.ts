import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import AdvertisementModel from "@/lib/models/Advertisement";

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request, ["customer"]);
    await connectToDatabase();

    // Get current date for filtering expired advertisements
    const now = new Date();

    // Fetch active advertisements (not expired) for the customer's business unit
    const advertisements = await AdvertisementModel.find({
      businessUnit: user.businessUnit,
      expiresAt: { $gt: now }, // Only get advertisements that haven't expired
    })
      .sort({ createdAt: -1 }) // Most recent first
      .lean();

    return NextResponse.json(
      advertisements.map((ad: any) => ({
        id: ad._id,
        type: ad.type,
        imageUrl: ad.imageUrl,
        message: ad.message,
        createdAt: ad.createdAt,
        expiresAt: ad.expiresAt,
      }))
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

