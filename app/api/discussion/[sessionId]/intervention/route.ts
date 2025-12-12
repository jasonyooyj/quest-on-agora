import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// POST /api/discussion/[sessionId]/intervention - Send instructor intervention
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
    const { participantId, content, messageType, isVisibleToStudent } = body;

    if (!participantId || !content) {
      return NextResponse.json(
        { error: "participantId and content are required" },
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

    // Verify participant belongs to session
    const participant = await prisma.discussion_participants.findFirst({
      where: {
        id: participantId,
        session_id: sessionId,
      },
    });

    if (!participant) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    // Create the intervention message
    const message = await prisma.discussion_messages.create({
      data: {
        session_id: sessionId,
        participant_id: participantId,
        role: "instructor",
        content,
        message_type: messageType || "nudge",
        is_visible_to_student: isVisibleToStudent ?? true,
        metadata: {
          instructor_id: user.id,
          intervention_type: messageType,
        },
      },
    });

    return NextResponse.json({
      message: {
        id: message.id,
        sessionId: message.session_id,
        participantId: message.participant_id,
        role: message.role,
        content: message.content,
        messageType: message.message_type,
        isVisibleToStudent: message.is_visible_to_student,
        createdAt: message.created_at.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error sending intervention:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
