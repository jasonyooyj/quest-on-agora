import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// GET /api/discussion/[sessionId]/pinned-quotes - Get all pinned quotes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = user.unsafeMetadata?.role as string;
    if (userRole !== "instructor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    // Verify session ownership
    const session = await prisma.discussion_sessions.findUnique({
      where: { id: sessionId },
      select: { instructor_id: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.instructor_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const quotes = await prisma.discussion_pinned_quotes.findMany({
      where: { session_id: sessionId },
      orderBy: { sort_order: "asc" },
    });

    const formattedQuotes = quotes.map((q) => ({
      id: q.id,
      sessionId: q.session_id,
      participantId: q.participant_id ?? null,
      content: q.content,
      displayName: q.display_name ?? null,
      pinnedAt: q.pinned_at?.toISOString() ?? new Date().toISOString(),
      sortOrder: q.sort_order ?? 0,
    }));

    return NextResponse.json({ quotes: formattedQuotes });
  } catch (error) {
    console.error("Error fetching pinned quotes:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error details:", { errorMessage, errorStack });
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

// POST /api/discussion/[sessionId]/pinned-quotes - Pin a quote
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = user.unsafeMetadata?.role as string;
    if (userRole !== "instructor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { sessionId } = await params;
    const body = await request.json();
    const { participantId, content, displayName } = body;

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    // Verify session ownership
    const session = await prisma.discussion_sessions.findUnique({
      where: { id: sessionId },
      select: { instructor_id: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.instructor_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get max sort order
    const maxOrder = await prisma.discussion_pinned_quotes.aggregate({
      where: { session_id: sessionId },
      _max: { sort_order: true },
    });

    const quote = await prisma.discussion_pinned_quotes.create({
      data: {
        session_id: sessionId,
        participant_id: participantId || null,
        content,
        display_name: displayName || null,
        sort_order: (maxOrder._max.sort_order || 0) + 1,
      },
    });

    return NextResponse.json({
      quote: {
        id: quote.id,
        sessionId: quote.session_id,
        participantId: quote.participant_id,
        content: quote.content,
        displayName: quote.display_name,
        pinnedAt: quote.pinned_at.toISOString(),
        sortOrder: quote.sort_order,
      },
    });
  } catch (error) {
    console.error("Error pinning quote:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error details:", { errorMessage, errorStack });
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
