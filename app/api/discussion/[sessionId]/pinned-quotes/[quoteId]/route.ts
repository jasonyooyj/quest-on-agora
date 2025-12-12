import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// DELETE /api/discussion/[sessionId]/pinned-quotes/[quoteId] - Remove a pinned quote
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; quoteId: string }> }
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

    const { sessionId, quoteId } = await params;

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

    // Delete the quote
    await prisma.discussion_pinned_quotes.delete({
      where: { id: quoteId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting pinned quote:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
