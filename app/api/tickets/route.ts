import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import TicketModel from "@/lib/models/Ticket";
import TicketCommentModel from "@/lib/models/TicketComment";
import TicketNotificationModel from "@/lib/models/TicketNotification";
import CustomerUserModel from "@/lib/models/CustomerUser";
import { TicketPriority, TicketStatus } from "@/lib/types";
import { uploadImage, uploadFile } from "@/lib/cloudinary";

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin", "employee", "customer"]);
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as TicketStatus | null;

    const query: Record<string, unknown> = { businessUnit: user.businessUnit };

    if (user.role === "customer") {
      query.customerId = user.id;
    }

    if (user.role === "employee") {
      query.$or = [
        { assignedEmployeeId: user.id },
        { assignedEmployeeIds: { $in: [user.id] } },
      ];
    }

    if (status) {
      query.status = status;
    }

    const tickets = await TicketModel.find(query).sort({ updatedAt: -1 });
    return NextResponse.json(tickets.map((t) => t.toJSON()));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = message === "Unauthorized" ? 401 : 500;
    console.error("GET /api/tickets failed", error);
    return NextResponse.json({ error: message }, { status });
  }
}

const isDataUrl = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("data:");

const uploadAttachmentsIfNeeded = async (attachments: unknown) => {
  if (!Array.isArray(attachments)) return [];
  const results: string[] = [];
  for (const attachment of attachments) {
    if (typeof attachment !== "string" || attachment.trim() === "") continue;
    if (isDataUrl(attachment)) {
      try {
        // Check if it's an image
        if (attachment.startsWith("data:image/")) {
          const uploaded = await uploadImage(attachment, "tickets/attachments");
          results.push(uploaded);
        } else {
          // For other file types (PDF, DOC, etc.)
          const uploaded = await uploadFile(attachment, "tickets/attachments");
          results.push(uploaded);
        }
      } catch (error) {
        console.error("Failed to upload attachment:", error);
        // Continue with other attachments even if one fails
      }
    } else {
      // Already a URL, keep it
      results.push(attachment);
    }
  }
  return results;
};

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request, ["customer"]);
    const body = await request.json().catch(() => null);

    if (!body?.subject || !body?.description) {
      return NextResponse.json(
        { error: "Subject and description are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Upload attachments if provided
    const attachments = body.attachments
      ? await uploadAttachmentsIfNeeded(body.attachments)
      : [];

    const ticket = await TicketModel.create({
      businessUnit: user.businessUnit,
      customerId: user.id,
      subject: body.subject,
      description: body.description,
      category: body.category,
      priority: (body.priority as TicketPriority) || "Medium",
      status: "New" as TicketStatus,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    // Get customer name for notification
    const customerUser = await CustomerUserModel.findById(user.id).lean();
    const customerName = customerUser?.username || customerUser?.email || "Customer";

    // Create notification for admin
    await TicketNotificationModel.create({
      ticketId: ticket._id,
      customerId: user.id,
      customerName: customerName,
      businessUnit: user.businessUnit,
      subject: body.subject,
      priority: (body.priority as TicketPriority) || "Medium",
      status: "New",
    });

    return NextResponse.json(ticket.toJSON(), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = message === "Unauthorized" ? 401 : 500;
    console.error("POST /api/tickets failed", error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin", "employee"]);
    const body = await request.json().catch(() => null);

    if (!body?.id) {
      return NextResponse.json({ error: "Ticket id is required" }, { status: 400 });
    }

    await connectToDatabase();

    const existing = await TicketModel.findOne({
      _id: body.id,
      businessUnit: user.businessUnit,
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (user.role === "employee") {
      const isAssigned =
        existing.assignedEmployeeId === user.id ||
        (Array.isArray(existing.assignedEmployeeIds) && existing.assignedEmployeeIds.includes(user.id));
      if (!isAssigned) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (body.subject) existing.subject = body.subject;
    if (body.description) existing.description = body.description;
    if (body.category !== undefined) existing.category = body.category || undefined;
    if (body.priority) existing.priority = body.priority as TicketPriority;
    if (body.status) existing.status = body.status as TicketStatus;

    if (user.role === "admin") {
      if (Array.isArray(body.assignedEmployeeIds)) {
        const ids = (body.assignedEmployeeIds as unknown[])
          .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
          .map((v) => v.trim());
        existing.assignedEmployeeIds = ids;
        existing.assignedEmployeeId = ids[0] ?? undefined;
        existing.assignmentDate = ids.length
          ? (typeof body.assignmentDate === "string" && body.assignmentDate.trim().length > 0
              ? body.assignmentDate.trim()
              : new Date().toISOString().slice(0, 10))
          : undefined;
      } else if (Object.prototype.hasOwnProperty.call(body, "assignedEmployeeId")) {
        const id =
          typeof body.assignedEmployeeId === "string" && body.assignedEmployeeId.trim().length > 0
            ? (body.assignedEmployeeId as string).trim()
            : undefined;
        existing.assignedEmployeeId = id;
        existing.assignedEmployeeIds = id ? [id] : [];
        existing.assignmentDate = id ? new Date().toISOString().slice(0, 10) : undefined;
      }
    }

    await existing.save();

    return NextResponse.json(existing.toJSON());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = message === "Unauthorized" ? 401 : 500;
    console.error("PUT /api/tickets failed", error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    const body = await request.json().catch(() => null);

    if (!body?.id) {
      return NextResponse.json({ error: "Ticket id is required" }, { status: 400 });
    }

    await connectToDatabase();

    const existing = await TicketModel.findOne({
      _id: body.id,
      businessUnit: user.businessUnit,
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await TicketCommentModel.deleteMany({ ticketId: existing._id });
    await existing.deleteOne();

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = message === "Unauthorized" ? 401 : 500;
    console.error("DELETE /api/tickets failed", error);
    return NextResponse.json({ error: message }, { status });
  }
}
