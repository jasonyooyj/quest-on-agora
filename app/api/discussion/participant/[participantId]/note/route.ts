import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/discussion/participant/[participantId]/note - Get instructor note
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ participantId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "instructor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { participantId } = await params;

    // Verify participant's session belongs to instructor
    const participant = await prisma.discussion_participants.findUnique({
      where: { id: participantId },
      include: {
        session: {
          select: { instructor_id: true },
        },
      },
    });

    if (!participant) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    if (participant.session.instructor_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the note
    const note = await prisma.discussion_instructor_notes.findFirst({
      where: { participant_id: participantId },
      orderBy: { updated_at: "desc" },
    });

    if (!note) {
      return NextResponse.json({ note: null });
    }

    return NextResponse.json({
      note: {
        id: note.id,
        participantId: note.participant_id,
        note: note.note,
        createdAt: note.created_at.toISOString(),
        updatedAt: note.updated_at.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching instructor note:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/discussion/participant/[participantId]/note - Save instructor note
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ participantId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "instructor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { participantId } = await params;
    const body = await request.json();
    const { note: noteContent } = body;

    if (!noteContent || typeof noteContent !== "string") {
      return NextResponse.json(
        { error: "Note content is required" },
        { status: 400 }
      );
    }

    // Verify participant's session belongs to instructor
    const participant = await prisma.discussion_participants.findUnique({
      where: { id: participantId },
      include: {
        session: {
          select: { instructor_id: true },
        },
      },
    });

    if (!participant) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    if (participant.session.instructor_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Upsert the note
    const existingNote = await prisma.discussion_instructor_notes.findFirst({
      where: { participant_id: participantId },
    });

    let note;
    if (existingNote) {
      note = await prisma.discussion_instructor_notes.update({
        where: { id: existingNote.id },
        data: {
          note: noteContent,
          updated_at: new Date(),
        },
      });
    } else {
      note = await prisma.discussion_instructor_notes.create({
        data: {
          participant_id: participantId,
          note: noteContent,
        },
      });
    }

    return NextResponse.json({
      note: {
        id: note.id,
        participantId: note.participant_id,
        note: note.note,
        createdAt: note.created_at.toISOString(),
        updatedAt: note.updated_at.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error saving instructor note:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
