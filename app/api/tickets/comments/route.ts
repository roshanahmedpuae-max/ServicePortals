import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import TicketModel from "@/lib/models/Ticket";
import TicketCommentModel from "@/lib/models/TicketComment";

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin", "employee", "customer"]);
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get("ticketId");

    if (!ticketId) {
      return NextResponse.json({ error: "ticketId is required" }, { status: 400 });
    }

    const ticket = await TicketModel.findById(ticketId);
    if (!ticket) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (ticket.businessUnit !== user.businessUnit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const commentsQuery: Record<string, unknown> = { ticketId };

    if (user.role === "customer") {
      commentsQuery.isInternal = false;
    }

    const comments = await TicketCommentModel.find(commentsQuery).sort({
      createdAt: 1,
    });

    return NextResponse.json(comments.map((c) => c.toJSON()));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = message === "Unauthorized" ? 401 : 500;
    console.error("GET /api/tickets/comments failed", error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin", "employee", "customer"]);
    const body = await request.json().catch(() => null);

    if (!body?.ticketId || !body?.message) {
      return NextResponse.json(
        { error: "ticketId and message are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const ticket = await TicketModel.findById(body.ticketId);
    if (!ticket) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (ticket.businessUnit !== user.businessUnit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (user.role === "customer" && ticket.customerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (user.role === "employee") {
      const ids = Array.isArray(ticket.assignedEmployeeIds)
        ? ticket.assignedEmployeeIds
        : ticket.assignedEmployeeId
        ? [ticket.assignedEmployeeId]
        : [];
      if (!ids.includes(user.id)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const comment = await TicketCommentModel.create({
      ticketId: ticket._id,
      authorId: user.id,
      isInternal: user.role !== "customer" && !!body.isInternal,
      message: body.message,
    });

    return NextResponse.json(comment.toJSON(), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = message === "Unauthorized" ? 401 : 500;
    console.error("POST /api/tickets/comments failed", error);
    return NextResponse.json({ error: message }, { status });
  }
}
