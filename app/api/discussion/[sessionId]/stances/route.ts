import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// GET /api/discussion/[sessionId]/stances - Get stance distribution
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  let sessionId: string | undefined;
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = user.unsafeMetadata?.role as string;
    if (userRole !== "instructor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const resolvedParams = await params;
    sessionId = resolvedParams.sessionId;

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

    // Count stances
    const participants = await prisma.discussion_participants.findMany({
      where: { session_id: sessionId },
      select: { stance: true, is_submitted: true },
    });

    const distribution = {
      pro: participants.filter((p) => p.stance === "pro").length,
      con: participants.filter((p) => p.stance === "con").length,
      neutral: participants.filter((p) => p.stance === "neutral").length,
      unsubmitted: participants.filter((p) => !p.is_submitted).length,
    };

    return NextResponse.json({ distribution });
  } catch (error) {
    console.error("Error fetching stance distribution:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      sessionId: sessionId || "unknown",
    });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
