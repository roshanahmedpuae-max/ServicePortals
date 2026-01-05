import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { CopierMachineModelModel } from "@/lib/models/Assets";

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    if (user.businessUnit !== "PrintersUAE") {
      return NextResponse.json({ error: "Copier models are only available for PrintersUAE" }, { status: 403 });
    }
    await connectToDatabase();

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";

    const query: any = { businessUnit: user.businessUnit };
    if (search) {
      query.model = { $regex: search, $options: "i" };
    }

    const models = await CopierMachineModelModel.find(query).sort({ model: 1 }).limit(500);
    return NextResponse.json(models.map((m) => m.toJSON()));
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    if (user.businessUnit !== "PrintersUAE") {
      return NextResponse.json({ error: "Copier models are only available for PrintersUAE" }, { status: 403 });
    }
    const body = await request.json().catch(() => null);
    if (!body?.model) {
      return NextResponse.json({ error: "Model name is required" }, { status: 400 });
    }

    await connectToDatabase();

    const model = await CopierMachineModelModel.create({
      model: body.model,
      manufacturer: body.manufacturer || undefined,
      businessUnit: user.businessUnit,
    });

    return NextResponse.json(model.toJSON(), { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating copier model:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create copier model" },
      { status: 500 }
    );
  }
}
