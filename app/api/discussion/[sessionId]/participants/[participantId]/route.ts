import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/discussion/[sessionId]/participants/[participantId] - Update participant
export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ sessionId: string; participantId: string }>;
  }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId, participantId } = await params;
    const body = await request.json();

    // Verify participant belongs to user
    const participant = await prisma.discussion_participants.findUnique({
      where: { id: participantId },
    });

    if (!participant) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    if (participant.student_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (participant.session_id !== sessionId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update participant
    // Only update fields that are explicitly provided
    const updateData: any = {
      is_online: true,
      last_active_at: new Date(),
      updated_at: new Date(),
    };

    if (body.stance !== undefined) updateData.stance = body.stance;
    if (body.stanceStatement !== undefined) updateData.stance_statement = body.stanceStatement;
    if (body.evidence !== undefined) {
      // New format: array of evidence
      updateData.evidence = body.evidence;
    } else if (body.evidence1 !== undefined || body.evidence2 !== undefined) {
      // Legacy format: migrate to array
      const evidenceArray: string[] = [];
      if (body.evidence1) evidenceArray.push(body.evidence1);
      if (body.evidence2) evidenceArray.push(body.evidence2);
      updateData.evidence = evidenceArray;
    }
    // Keep legacy fields for backward compatibility
    if (body.evidence1 !== undefined) updateData.evidence_1 = body.evidence1;
    if (body.evidence2 !== undefined) updateData.evidence_2 = body.evidence2;
    if (body.isSubmitted !== undefined) updateData.is_submitted = body.isSubmitted;

    const updated = await prisma.discussion_participants.update({
      where: { id: participantId },
      data: updateData,
    });

    // Parse evidence array from JSON
    let evidenceArray: string[] = [];
    if (updated.evidence) {
      try {
        evidenceArray = Array.isArray(updated.evidence)
          ? updated.evidence
          : JSON.parse(updated.evidence as string);
      } catch {
        evidenceArray = [];
      }
    }

    return NextResponse.json({
      participant: {
        id: updated.id,
        stance: updated.stance,
        stanceStatement: updated.stance_statement,
        evidence: evidenceArray,
        evidence1: updated.evidence_1, // Legacy support
        evidence2: updated.evidence_2, // Legacy support
        isSubmitted: updated.is_submitted,
      },
    });
  } catch (error) {
    console.error("Error updating participant:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

