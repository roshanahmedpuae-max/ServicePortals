import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { AssetDocumentModel } from "@/lib/models/Assets";

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request, ["employee"]);
    await connectToDatabase();

    const query: Record<string, unknown> = {
      businessUnit: user.businessUnit,
      categoryKey: "employees",
      assetId: user.id,
    };

    const docs = await AssetDocumentModel.find(query).sort({ uploadedAt: -1 }).limit(200);
    return NextResponse.json(docs.map((d) => d.toJSON()));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

