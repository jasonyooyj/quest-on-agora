import { NextRequest, NextResponse } from "next/server";
import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// GET /api/discussion/[sessionId]/participants - Get all participants (instructor) or single participant (student)
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
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    const userRole = user.unsafeMetadata?.role as string;

    // If studentId is provided, return single participant (for students)
    if (studentId) {
      if (studentId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const participant = await prisma.discussion_participants.findUnique({
        where: {
          session_id_student_id: {
            session_id: sessionId,
            student_id: user.id,
          },
        },
      });

      if (!participant) {
        return NextResponse.json(
          { error: "Participant not found" },
          { status: 404 }
        );
      }

      // Get student profile
      const profile = await prisma.student_profiles.findUnique({
        where: { student_id: user.id },
      });

      // Parse evidence array from JSON
      let evidenceArray: string[] = [];
      if (participant.evidence) {
        try {
          evidenceArray = Array.isArray(participant.evidence)
            ? participant.evidence
            : JSON.parse(participant.evidence as string);
        } catch {
          evidenceArray = [];
        }
      }

      return NextResponse.json({
        participant: {
          id: participant.id,
          sessionId: participant.session_id,
          studentId: participant.student_id,
          displayName: participant.display_name,
          realName: profile?.name,
          studentNumber: profile?.student_number,
          school: profile?.school,
          stance: participant.stance,
          stanceStatement: participant.stance_statement,
          evidence: evidenceArray,
          evidence1: participant.evidence_1, // Legacy support
          evidence2: participant.evidence_2, // Legacy support
          isSubmitted: participant.is_submitted,
          isOnline: participant.is_online,
          lastActiveAt: participant.last_active_at.toISOString(),
          createdAt: participant.created_at.toISOString(),
          confusionNote: participant.confusion_note,
          needsHelp: participant.needs_help,
        },
      });
    }

    // Otherwise, return all participants (instructor only)
    if (userRole !== "instructor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    // Get participants with message count
    const participants = await prisma.discussion_participants.findMany({
      where: { session_id: sessionId },
      include: {
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { last_active_at: "desc" },
    });

    // Get student profiles for real names
    const studentIds = participants.map((p) => p.student_id);
    const profiles = await prisma.student_profiles.findMany({
      where: { student_id: { in: studentIds } },
    });
    const profileMap = new Map(profiles.map((p) => [p.student_id, p]));

    // Fetch Clerk user data for additional info
    const clerk = await clerkClient();
    const clerkUsers = await clerk.users.getUserList({
      userId: studentIds,
    });
    const clerkUserMap = new Map(clerkUsers.data.map((u) => [u.id, u]));

    const formattedParticipants = participants.map((p) => {
      const profile = profileMap.get(p.student_id);
      const clerkUser = clerkUserMap.get(p.student_id);

      // Parse evidence array from JSON
      let evidenceArray: string[] = [];
      if (p.evidence) {
        try {
          evidenceArray = Array.isArray(p.evidence)
            ? p.evidence
            : JSON.parse(p.evidence as string);
        } catch {
          evidenceArray = [];
        }
      }

      return {
        id: p.id,
        sessionId: p.session_id,
        studentId: p.student_id,
        displayName: p.display_name,
        realName:
          profile?.name ||
          clerkUser?.firstName ||
          clerkUser?.emailAddresses[0]?.emailAddress,
        studentNumber: profile?.student_number,
        school: profile?.school,
        stance: p.stance,
        stanceStatement: p.stance_statement,
        evidence: evidenceArray,
        evidence1: p.evidence_1, // Legacy support
        evidence2: p.evidence_2, // Legacy support
        isSubmitted: p.is_submitted,
        isOnline: p.is_online,
        lastActiveAt: p.last_active_at.toISOString(),
        createdAt: p.created_at.toISOString(),
        confusionNote: p.confusion_note,
        needsHelp: p.needs_help,
        messageCount: p._count.messages,
      };
    });

    return NextResponse.json({ participants: formattedParticipants });
  } catch (error) {
    console.error("Error fetching participants:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
