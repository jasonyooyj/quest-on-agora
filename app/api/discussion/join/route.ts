import { NextRequest, NextResponse } from "next/server";
import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// POST /api/discussion/join - Join a discussion session with join code
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { joinCode } = body;

    if (!joinCode || typeof joinCode !== "string" || joinCode.length !== 6) {
      return NextResponse.json(
        { error: "Invalid join code" },
        { status: 400 }
      );
    }

    // Find discussion session by join code
    const session = await prisma.discussion_sessions.findUnique({
      where: { join_code: joinCode.toUpperCase() },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Discussion session not found" },
        { status: 404 }
      );
    }

    // Check if session is active
    if (session.status !== "active") {
      return NextResponse.json(
        {
          error: "Session not active",
          message:
            session.status === "closed"
              ? "이 토론 세션이 종료되었습니다."
              : "이 토론 세션이 아직 시작되지 않았습니다.",
        },
        { status: 400 }
      );
    }

    // Check if student already joined
    const existingParticipant =
      await prisma.discussion_participants.findUnique({
        where: {
          session_id_student_id: {
            session_id: session.id,
            student_id: user.id,
          },
        },
      });

    if (existingParticipant) {
      // Already joined, return session info
      return NextResponse.json({
        session: {
          id: session.id,
          title: session.title,
          description: session.description,
          status: session.status,
          joinCode: session.join_code,
          settings: session.settings,
          createdAt: session.created_at.toISOString(),
        },
        participant: {
          id: existingParticipant.id,
          stance: existingParticipant.stance,
          isSubmitted: existingParticipant.is_submitted,
        },
        isNew: false,
      });
    }

    // Get student profile for display name
    const profile = await prisma.student_profiles.findUnique({
      where: { student_id: user.id },
    });

    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(user.id);

    // Generate display name (anonymous mode or real name)
    const settings = session.settings as {
      anonymous?: boolean;
      stanceOptions?: string[];
    };
    const isAnonymous = settings?.anonymous ?? true;

    let displayName: string;
    if (isAnonymous) {
      // Count existing participants to generate "Student N" name
      const participantCount =
        await prisma.discussion_participants.count({
          where: { session_id: session.id },
        });
      displayName = `Student ${participantCount + 1}`;
    } else {
      displayName =
        profile?.name ||
        clerkUser.firstName ||
        clerkUser.emailAddresses[0]?.emailAddress ||
        `Student ${user.id.slice(0, 4)}`;
    }

    // Create participant
    const participant = await prisma.discussion_participants.create({
      data: {
        session_id: session.id,
        student_id: user.id,
        display_name: displayName,
        is_online: true,
        last_active_at: new Date(),
      },
    });

    return NextResponse.json({
      session: {
        id: session.id,
        title: session.title,
        description: session.description,
        status: session.status,
        joinCode: session.join_code,
        settings: session.settings,
        createdAt: session.created_at.toISOString(),
      },
      participant: {
        id: participant.id,
        displayName: participant.display_name,
        stance: participant.stance,
        isSubmitted: participant.is_submitted,
      },
      isNew: true,
    });
  } catch (error) {
    console.error("Error joining discussion session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

