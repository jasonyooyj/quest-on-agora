import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// GET /api/discussion/[sessionId]/activity - Get activity stats for last 5 minutes
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

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    // Verify session ownership
    let session;
    try {
      session = await prisma.discussion_sessions.findUnique({
        where: { id: sessionId },
        select: { instructor_id: true },
      });
    } catch (sessionError) {
      console.error("Error fetching session:", {
        error: sessionError,
        message: sessionError instanceof Error ? sessionError.message : "Unknown error",
        sessionId,
      });
      return NextResponse.json(
        { error: "Failed to verify session" },
        { status: 500 }
      );
    }

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.instructor_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get messages from last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    let messages: Array<{ created_at: Date }> = [];
    try {
      messages = await prisma.discussion_messages.findMany({
        where: {
          session_id: sessionId,
          created_at: {
            gte: fiveMinutesAgo,
          },
        },
        select: {
          created_at: true,
        },
        orderBy: {
          created_at: "asc",
        },
      });
    } catch (dbError) {
      console.error("Database error fetching messages:", {
        error: dbError,
        message: dbError instanceof Error ? dbError.message : "Unknown error",
        stack: dbError instanceof Error ? dbError.stack : undefined,
        sessionId,
      });
      // Return empty stats instead of failing
      messages = [];
    }

    // Group messages by 30-second intervals (10 intervals for 5 minutes)
    const intervalMs = 30 * 1000; // 30 seconds
    const intervals: number[] = Array(10).fill(0); // 10 intervals
    const timestamps: string[] = [];

    // Generate timestamps for each interval
    for (let i = 0; i < 10; i++) {
      const intervalStart = new Date(
        fiveMinutesAgo.getTime() + i * intervalMs
      );
      timestamps.push(intervalStart.toISOString());
    }

    // Count messages in each interval
    messages.forEach((message) => {
      try {
        // Ensure created_at is a Date object
        const createdAt =
          message.created_at instanceof Date
            ? message.created_at
            : new Date(message.created_at);
        const messageTime = createdAt.getTime();
        const timeSinceStart = messageTime - fiveMinutesAgo.getTime();
        const intervalIndex = Math.floor(timeSinceStart / intervalMs);

        if (intervalIndex >= 0 && intervalIndex < 10) {
          intervals[intervalIndex]++;
        }
      } catch (dateError) {
        console.error("Error processing message date:", {
          error: dateError,
          message,
        });
        // Skip this message if date parsing fails
      }
    });

    return NextResponse.json({
      messagesPerInterval: intervals,
      timestamps,
      totalMessages: messages.length,
    });
  } catch (error) {
    console.error("Error fetching activity stats:", {
      error,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      sessionId: sessionId || "unknown",
    });
    
    // Return empty stats instead of failing completely
    // This prevents the UI from breaking
    return NextResponse.json({
      messagesPerInterval: Array(10).fill(0),
      timestamps: [],
      totalMessages: 0,
    });
  }
}

