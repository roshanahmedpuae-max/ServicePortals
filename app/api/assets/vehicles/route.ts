import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { VehicleModel, syncVehicleAssetDates } from "@/lib/models/Assets";
import { uploadImage } from "@/lib/cloudinary";
import EmployeeModel from "@/lib/models/Employee";

// Helper function to safely convert dates to ISO strings
function safeDateToString(date: Date | string | null | undefined): string | undefined {
  if (!date) return undefined;
  if (typeof date === "string") return date;
  if (date instanceof Date) {
    try {
      return date.toISOString();
    } catch {
      return undefined;
    }
  }
  return undefined;
}

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
        { plateNumber: { $regex: search, $options: "i" } },
        { vin: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      query.status = status;
    }

    const vehicles = await VehicleModel.find(query).sort({ createdAt: -1 }).limit(500);
    
    // Get all employee IDs that are assigned to vehicles
    const employeeIds = vehicles
      .map((v) => v.assignedEmployeeId)
      .filter((id): id is string => Boolean(id));
    
    // Fetch employee names
    const employees = employeeIds.length > 0
      ? await EmployeeModel.find({ _id: { $in: employeeIds } }).select("_id name")
      : [];
    
    // Create a map of employee ID to name
    const employeeMap = new Map(
      employees.map((emp) => [emp._id, emp.name])
    );
    
    // Map vehicles and add employee names
    const vehiclesWithEmployeeNames = vehicles.map((v) => {
      const vehicleJson = v.toJSON();
      if (v.assignedEmployeeId && employeeMap.has(v.assignedEmployeeId)) {
        (vehicleJson as any).assignedEmployeeName = employeeMap.get(v.assignedEmployeeId);
      }
      return vehicleJson;
    });
    
    return NextResponse.json(vehiclesWithEmployeeNames);
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    const body = await request.json().catch(() => null);
    
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }
    
    if (!body.name || !body.plateNumber) {
      return NextResponse.json(
        { error: "Vehicle name and plate number are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Handle photo upload to Cloudinary if provided
    let photoUrl: string | undefined;
    let photoUploadError: string | undefined;
    
    if (body.photo && typeof body.photo === "string") {
      if (body.photo.startsWith("data:")) {
        try {
          photoUrl = await uploadImage(body.photo, "vehicles");
        } catch (error) {
          // Safely extract error message to avoid circular reference issues
          let errorMessage = "Failed to upload vehicle photo";
          try {
            if (error instanceof Error) {
              errorMessage = error.message || errorMessage;
            } else if (error && typeof error === "object") {
              // Safely extract message from error object
              const err = error as any;
              if (typeof err.message === "string") {
                errorMessage = err.message;
              } else if (typeof err.toString === "function") {
                try {
                  errorMessage = err.toString();
                } catch {
                  // If toString fails, use default message
                }
              }
            }
          } catch {
            // If error extraction fails, use default message
          }
          
          photoUploadError = errorMessage;
          console.error("[Vehicles API] Photo upload failed:", {
            error: errorMessage,
            vehicleName: body.name,
            plateNumber: body.plateNumber,
          });
        }
      } else if (body.photo.trim().length > 0) {
        photoUrl = body.photo;
      }
    }

    const vehicle = await VehicleModel.create({
      name: body.name,
      plateNumber: body.plateNumber,
      businessUnit: user.businessUnit,
      vehicleType: body.vehicleType,
      make: body.make,
      model: body.model,
      yearOfManufacture: body.yearOfManufacture,
      vin: body.vin,
      color: body.color,
      ownershipType: body.ownershipType,
      status: body.status ?? "Active",
      assignedEmployeeId: body.assignedEmployeeId,
      registrationNumber: body.registrationNumber,
      registrationExpiryDate: body.registrationExpiryDate,
      salikTagId: body.salikTagId,
      lastInspectionDate: body.lastInspectionDate,
      nextInspectionDate: body.nextInspectionDate,
      insuranceProvider: body.insuranceProvider,
      insurancePolicyNumber: body.insurancePolicyNumber,
      insuranceExpiryDate: body.insuranceExpiryDate,
      lastServiceDate: body.lastServiceDate,
      nextServiceDate: body.nextServiceDate,
      odometerAtLastService: body.odometerAtLastService,
      serviceIntervalKm: body.serviceIntervalKm,
      serviceIntervalMonths: body.serviceIntervalMonths,
      fuelType: body.fuelType,
      tags: body.tags,
      notes: body.notes,
      photo: photoUrl,
      createdByAdminId: user.id,
      updatedByAdminId: user.id,
    });

    await syncVehicleAssetDates(vehicle);

    // Fetch employee name if assigned
    let assignedEmployeeName: string | undefined;
    if (vehicle.assignedEmployeeId) {
      const employee = await EmployeeModel.findById(vehicle.assignedEmployeeId).select("name");
      if (employee) {
        assignedEmployeeName = employee.name;
      }
    }

    // Safely serialize the vehicle document to prevent circular reference issues
    // Manually extract only the fields we need to avoid any circular references
    // Convert dates to ISO strings for JSON serialization
    const vehicleJson: any = {
      id: String(vehicle._id),
      _id: String(vehicle._id),
      name: vehicle.name,
      plateNumber: vehicle.plateNumber,
      businessUnit: vehicle.businessUnit,
      vehicleType: vehicle.vehicleType || undefined,
      make: vehicle.make || undefined,
      model: vehicle.model || undefined,
      yearOfManufacture: vehicle.yearOfManufacture || undefined,
      vin: vehicle.vin || undefined,
      color: vehicle.color || undefined,
      ownershipType: vehicle.ownershipType || undefined,
      status: vehicle.status,
      assignedEmployeeId: vehicle.assignedEmployeeId ? String(vehicle.assignedEmployeeId) : undefined,
      registrationNumber: vehicle.registrationNumber || undefined,
      registrationExpiryDate: safeDateToString(vehicle.registrationExpiryDate),
      salikTagId: vehicle.salikTagId || undefined,
      lastInspectionDate: safeDateToString(vehicle.lastInspectionDate),
      nextInspectionDate: safeDateToString(vehicle.nextInspectionDate),
      insuranceProvider: vehicle.insuranceProvider || undefined,
      insurancePolicyNumber: vehicle.insurancePolicyNumber || undefined,
      insuranceExpiryDate: safeDateToString(vehicle.insuranceExpiryDate),
      lastServiceDate: safeDateToString(vehicle.lastServiceDate),
      nextServiceDate: safeDateToString(vehicle.nextServiceDate),
      odometerAtLastService: vehicle.odometerAtLastService || undefined,
      serviceIntervalKm: vehicle.serviceIntervalKm || undefined,
      serviceIntervalMonths: vehicle.serviceIntervalMonths || undefined,
      fuelType: vehicle.fuelType || undefined,
      tags: vehicle.tags || undefined,
      notes: vehicle.notes || undefined,
      photo: vehicle.photo || undefined,
      createdAt: safeDateToString((vehicle as any).createdAt),
      updatedAt: safeDateToString((vehicle as any).updatedAt),
      createdByAdminId: vehicle.createdByAdminId ? String(vehicle.createdByAdminId) : undefined,
      updatedByAdminId: vehicle.updatedByAdminId ? String(vehicle.updatedByAdminId) : undefined,
    };
    
    if (assignedEmployeeName) {
      vehicleJson.assignedEmployeeName = assignedEmployeeName;
    }

    // Include photo upload error in response if it occurred
    if (photoUploadError) {
      vehicleJson.photoUploadError = photoUploadError;
    }

    return NextResponse.json(vehicleJson, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating vehicle:", {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Check for stack overflow specifically
    if (errorMessage.includes("Maximum call stack size exceeded") || errorMessage.includes("stack")) {
      return NextResponse.json(
        { error: "Failed to create vehicle: Serialization error. Please try again." },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: `Failed to create vehicle: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    const body = await request.json().catch(() => null);
    
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }
    
    if (!body.id) {
      return NextResponse.json({ error: "Vehicle id is required" }, { status: 400 });
    }

    await connectToDatabase();

    const updates: Record<string, unknown> = {};
    const fields = [
      "name",
      "vehicleType",
      "make",
      "model",
      "yearOfManufacture",
      "vin",
      "plateNumber",
      "color",
      "ownershipType",
      "status",
      "assignedEmployeeId",
      "registrationNumber",
      "registrationExpiryDate",
      "salikTagId",
      "lastInspectionDate",
      "nextInspectionDate",
      "insuranceProvider",
      "insurancePolicyNumber",
      "insuranceExpiryDate",
      "lastServiceDate",
      "nextServiceDate",
      "odometerAtLastService",
      "serviceIntervalKm",
      "serviceIntervalMonths",
      "fuelType",
      "tags",
      "notes",
    ];

    for (const key of fields) {
      if (key in body) {
        updates[key] = (body as any)[key];
      }
    }

    // Handle photo upload to Cloudinary if provided
    let photoUploadError: string | undefined;
    
    if (body.photo !== undefined) {
      if (body.photo && typeof body.photo === "string") {
        if (body.photo.startsWith("data:")) {
          try {
            updates.photo = await uploadImage(body.photo, "vehicles");
          } catch (error) {
            // Safely extract error message to avoid circular reference issues
            let errorMessage = "Failed to upload vehicle photo";
            try {
              if (error instanceof Error) {
                errorMessage = error.message || errorMessage;
              } else if (error && typeof error === "object") {
                // Safely extract message from error object
                const err = error as any;
                if (typeof err.message === "string") {
                  errorMessage = err.message;
                } else if (typeof err.toString === "function") {
                  try {
                    errorMessage = err.toString();
                  } catch {
                    // If toString fails, use default message
                  }
                }
              }
            } catch {
              // If error extraction fails, use default message
            }
            
            photoUploadError = errorMessage;
            console.error("[Vehicles API] Photo upload failed during update:", {
              error: errorMessage,
              vehicleId: String(body.id),
            });
            delete updates.photo;
          }
        } else if (body.photo.trim().length > 0) {
          updates.photo = body.photo;
        } else {
          updates.photo = undefined;
        }
      } else if (body.photo === null || body.photo === "") {
        updates.photo = undefined;
      }
    }

    updates.updatedByAdminId = user.id;

    const updated = await VehicleModel.findOneAndUpdate(
      { _id: body.id, businessUnit: user.businessUnit },
      updates,
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await syncVehicleAssetDates(updated);

    // Fetch employee name if assigned
    let assignedEmployeeName: string | undefined;
    if (updated.assignedEmployeeId) {
      const employee = await EmployeeModel.findById(updated.assignedEmployeeId).select("name");
      if (employee) {
        assignedEmployeeName = employee.name;
      }
    }

    // Safely serialize the vehicle document to prevent circular reference issues
    // Manually extract only the fields we need to avoid any circular references
    // Convert dates to ISO strings for JSON serialization
    const vehicleJson: any = {
      id: String(updated._id),
      _id: String(updated._id),
      name: updated.name,
      plateNumber: updated.plateNumber,
      businessUnit: updated.businessUnit,
      vehicleType: updated.vehicleType || undefined,
      make: updated.make || undefined,
      model: updated.model || undefined,
      yearOfManufacture: updated.yearOfManufacture || undefined,
      vin: updated.vin || undefined,
      color: updated.color || undefined,
      ownershipType: updated.ownershipType || undefined,
      status: updated.status,
      assignedEmployeeId: updated.assignedEmployeeId ? String(updated.assignedEmployeeId) : undefined,
      registrationNumber: updated.registrationNumber || undefined,
      registrationExpiryDate: safeDateToString(updated.registrationExpiryDate),
      salikTagId: updated.salikTagId || undefined,
      lastInspectionDate: safeDateToString(updated.lastInspectionDate),
      nextInspectionDate: safeDateToString(updated.nextInspectionDate),
      insuranceProvider: updated.insuranceProvider || undefined,
      insurancePolicyNumber: updated.insurancePolicyNumber || undefined,
      insuranceExpiryDate: safeDateToString(updated.insuranceExpiryDate),
      lastServiceDate: safeDateToString(updated.lastServiceDate),
      nextServiceDate: safeDateToString(updated.nextServiceDate),
      odometerAtLastService: updated.odometerAtLastService || undefined,
      serviceIntervalKm: updated.serviceIntervalKm || undefined,
      serviceIntervalMonths: updated.serviceIntervalMonths || undefined,
      fuelType: updated.fuelType || undefined,
      tags: updated.tags || undefined,
      notes: updated.notes || undefined,
      photo: updated.photo || undefined,
      createdAt: safeDateToString((updated as any).createdAt),
      updatedAt: safeDateToString((updated as any).updatedAt),
      createdByAdminId: updated.createdByAdminId ? String(updated.createdByAdminId) : undefined,
      updatedByAdminId: updated.updatedByAdminId ? String(updated.updatedByAdminId) : undefined,
    };
    
    if (assignedEmployeeName) {
      vehicleJson.assignedEmployeeName = assignedEmployeeName;
    }

    // Include photo upload error in response if it occurred
    if (photoUploadError) {
      vehicleJson.photoUploadError = photoUploadError;
    }

    return NextResponse.json(vehicleJson);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error updating vehicle:", {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Check for stack overflow specifically
    if (errorMessage.includes("Maximum call stack size exceeded") || errorMessage.includes("stack")) {
      return NextResponse.json(
        { error: "Failed to update vehicle: Serialization error. Please try again." },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: `Failed to update vehicle: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    const body = await request.json().catch(() => null);
    if (!body?.id) {
      return NextResponse.json({ error: "Vehicle id is required" }, { status: 400 });
    }

    await connectToDatabase();
    const existing = await VehicleModel.findOne({
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

