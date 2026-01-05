import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { RentalMachineModel, CopierMachineModelModel, syncRentalMachineDates } from "@/lib/models/Assets";
import CustomerModel from "@/lib/models/Customer";

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    if (user.businessUnit !== "PrintersUAE") {
      return NextResponse.json({ error: "Rental machines are only available for PrintersUAE" }, { status: 403 });
    }
    await connectToDatabase();

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const query: any = { businessUnit: user.businessUnit };
    if (search) {
      query.$or = [
        { serialNumber: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
      ];
    }
    if (status) {
      query.status = status;
    }

    const machines = await RentalMachineModel.find(query).sort({ createdAt: -1 }).limit(500);

    // Manually populate customer and model data
    const CustomerModel = (await import("@/lib/models/Customer")).default;
    const { CopierMachineModelModel } = await import("@/lib/models/Assets");
    
    const machinesWithData = await Promise.all(
      machines.map(async (m) => {
        const machine = m.toJSON();
        try {
          const customer = await CustomerModel.findById(machine.customerId);
          const model = await CopierMachineModelModel.findById(machine.copierMachineModelId);
          return {
            ...machine,
            customerName: customer?.name,
            modelName: model?.model,
            manufacturer: model?.manufacturer,
          };
        } catch {
          return machine;
        }
      })
    );

    return NextResponse.json(machinesWithData);
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    if (user.businessUnit !== "PrintersUAE") {
      return NextResponse.json({ error: "Rental machines are only available for PrintersUAE" }, { status: 403 });
    }
    const body = await request.json().catch(() => null);
    if (!body?.customerId || !body?.copierMachineModelId) {
      return NextResponse.json(
        { error: "Customer and copier machine model are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const machine = await RentalMachineModel.create({
      customerId: body.customerId,
      copierMachineModelId: body.copierMachineModelId,
      businessUnit: user.businessUnit,
      uidNumber: body.uidNumber || undefined,
      serialNumber: body.serialNumber || undefined,
      rentalStartDate: body.rentalStartDate ? new Date(body.rentalStartDate) : undefined,
      rentalEndDate: body.rentalEndDate ? new Date(body.rentalEndDate) : undefined,
      monthlyRent: body.monthlyRent ? Number(body.monthlyRent) : undefined,
      status: body.status || "Active",
      location: body.location || undefined,
      notes: body.notes || undefined,
      createdByAdminId: user.id,
      updatedByAdminId: user.id,
    });

    await syncRentalMachineDates(machine);

    return NextResponse.json(machine.toJSON(), { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating rental machine:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create rental machine" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    if (user.businessUnit !== "PrintersUAE") {
      return NextResponse.json({ error: "Rental machines are only available for PrintersUAE" }, { status: 403 });
    }
    const body = await request.json().catch(() => null);
    if (!body?.id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await connectToDatabase();

    const updateData: any = {
      updatedByAdminId: user.id,
    };

    if (body.customerId) updateData.customerId = body.customerId;
    if (body.copierMachineModelId) updateData.copierMachineModelId = body.copierMachineModelId;
    if (body.uidNumber !== undefined) updateData.uidNumber = body.uidNumber || undefined;
    if (body.serialNumber !== undefined) updateData.serialNumber = body.serialNumber || undefined;
    if (body.rentalStartDate) updateData.rentalStartDate = new Date(body.rentalStartDate);
    if (body.rentalEndDate) updateData.rentalEndDate = new Date(body.rentalEndDate);
    if (body.monthlyRent !== undefined) updateData.monthlyRent = body.monthlyRent ? Number(body.monthlyRent) : undefined;
    if (body.status) updateData.status = body.status;
    if (body.location !== undefined) updateData.location = body.location || undefined;
    if (body.notes !== undefined) updateData.notes = body.notes || undefined;

    const machine = await RentalMachineModel.findOneAndUpdate(
      { _id: body.id, businessUnit: user.businessUnit },
      updateData,
      { new: true }
    );

    if (!machine) {
      return NextResponse.json({ error: "Rental machine not found" }, { status: 404 });
    }

    await syncRentalMachineDates(machine);

    // Manually populate customer and model data
    const machineData = machine.toJSON();
    try {
      const customer = await CustomerModel.findById(machineData.customerId);
      const model = await CopierMachineModelModel.findById(machineData.copierMachineModelId);
      return NextResponse.json({
        ...machineData,
        customerName: customer?.name,
        modelName: model?.model,
        manufacturer: model?.manufacturer,
      });
    } catch {
      return NextResponse.json(machineData);
    }
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    if (user.businessUnit !== "PrintersUAE") {
      return NextResponse.json({ error: "Rental machines are only available for PrintersUAE" }, { status: 403 });
    }
    const body = await request.json().catch(() => null);
    if (!body?.id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await connectToDatabase();

    const machine = await RentalMachineModel.findOneAndDelete({
      _id: body.id,
      businessUnit: user.businessUnit,
    });

    if (!machine) {
      return NextResponse.json({ error: "Rental machine not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
