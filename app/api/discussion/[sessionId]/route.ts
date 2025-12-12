import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// GET /api/discussion/[sessionId] - Get discussion session details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await params;
    const userRole = user.unsafeMetadata?.role as string;

    const session = await prisma.discussion_sessions.findUnique({
      where: { id: sessionId },
      include: {
        _count: {
          select: { participants: true },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // If instructor, verify ownership
    if (userRole === "instructor") {
      if (session.instructor_id !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      // If student, verify they are a participant
      const participant = await prisma.discussion_participants.findUnique({
        where: {
          session_id_student_id: {
            session_id: sessionId,
            student_id: user.id,
          },
        },
      });

      if (!participant) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({
      session: {
        id: session.id,
        instructorId: session.instructor_id,
        title: session.title,
        description: session.description,
        status: session.status,
        joinCode: session.join_code,
        settings: session.settings,
        createdAt: session.created_at.toISOString(),
        updatedAt: session.updated_at.toISOString(),
        closedAt: session.closed_at?.toISOString(),
        participantCount: session._count.participants,
      },
    });
  } catch (error) {
    console.error("Error fetching discussion session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
