import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// Generate a random 6-character join code
function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// POST /api/discussion - Create a new discussion session
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = user.unsafeMetadata?.role as string;
    if (userRole !== "instructor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, settings } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // Generate unique join code
    let joinCode = generateJoinCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.discussion_sessions.findUnique({
        where: { join_code: joinCode },
      });
      if (!existing) break;
      joinCode = generateJoinCode();
      attempts++;
    }

    // Create the session
    const session = await prisma.discussion_sessions.create({
      data: {
        instructor_id: user.id,
        title,
        description: description || null,
        status: "active",
        join_code: joinCode,
        settings: settings || { anonymous: true, stanceOptions: ["pro", "con", "neutral"] },
      },
    });

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
      },
    });
  } catch (error) {
    console.error("Error creating discussion session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/discussion - List all discussion sessions for the instructor
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = user.unsafeMetadata?.role as string;
    if (userRole !== "instructor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sessions = await prisma.discussion_sessions.findMany({
      where: { instructor_id: user.id },
      include: {
        _count: {
          select: { participants: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const formattedSessions = sessions.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      status: s.status,
      joinCode: s.join_code,
      settings: s.settings,
      createdAt: s.created_at.toISOString(),
      closedAt: s.closed_at?.toISOString(),
      participantCount: s._count.participants,
    }));

    return NextResponse.json({ sessions: formattedSessions });
  } catch (error) {
    console.error("Error listing discussion sessions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
