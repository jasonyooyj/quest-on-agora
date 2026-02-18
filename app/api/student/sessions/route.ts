import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";

const ITEMS_PER_PAGE = 10;

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey);
}

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'student-sessions')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = getSupabaseClient();

    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase client configuration is missing" },
        { status: 500 }
      );
    }

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is student
    if (user.role !== "student") {
      return NextResponse.json(
        { error: "Student access required" },
        { status: 403 }
      );
    }

    // Get pagination parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(
      searchParams.get("limit") || String(ITEMS_PER_PAGE),
      10
    );
    const offset = (page - 1) * limit;

    // Note: We'll calculate total count after filtering duplicates
    // This is more accurate than counting all sessions

    // Get all sessions for this student (we need to filter duplicates before pagination)
    const { data: allSessions, error: sessionsError } = await supabase
      .from("sessions")
      .select("id, exam_id, submitted_at, created_at")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false });

    if (sessionsError) {
      console.error("Error fetching student sessions:", sessionsError);
      throw sessionsError;
    }

    if (!allSessions || allSessions.length === 0) {
      return NextResponse.json({
        sessions: [],
        pagination: {
          page,
          limit,
          total: 0,
          hasMore: false,
        },
      });
    }

    // Filter: For each exam, keep only the most recent unsubmitted session
    // Submitted sessions are kept separately (they represent past attempts)
    const examSessionMap = new Map<string, (typeof allSessions)[0]>();
    const submittedSessions: typeof allSessions = [];

    for (const session of allSessions) {
      if (session.submitted_at) {
        // Submitted sessions: keep all (they are historical records)
        submittedSessions.push(session);
      } else {
        // Unsubmitted sessions: keep only the most recent one per exam
        const examId = session.exam_id;
        // Since sessions are already sorted by created_at desc, first one is most recent
        if (!examSessionMap.has(examId)) {
          examSessionMap.set(examId, session);
        }
      }
    }

    // Combine: unsubmitted (one per exam) + all submitted sessions
    const unsubmittedSessions = Array.from(examSessionMap.values());
    const filteredSessions = [
      ...unsubmittedSessions,
      ...submittedSessions,
    ].sort((a, b) => {
      // Sort by created_at desc (most recent first)
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    // Apply pagination after filtering
    const sessions = filteredSessions.slice(offset, offset + limit);
    const filteredTotalCount = filteredSessions.length;
    const hasMore = filteredTotalCount
      ? offset + limit < filteredTotalCount
      : false;

    if (sessions.length === 0) {
      return NextResponse.json({
        sessions: [],
        pagination: {
          page,
          limit,
          total: filteredTotalCount,
          hasMore,
        },
      });
    }

    // Collect all unique exam_ids
    const examIds = [...new Set(sessions.map((s) => s.exam_id))];

    // Fetch all exams in one query
    const { data: exams, error: examsError } = await supabase
      .from("exams")
      .select("id, title, code, duration, instructor_id")
      .in("id", examIds);

    if (examsError) {
      console.error("Error fetching exams:", examsError);
      throw examsError;
    }

    // Create a map of exam_id -> exam for quick lookup
    const examMap = new Map((exams || []).map((exam) => [exam.id, exam]));

    const sessionIds = sessions.map((session) => session.id);

    // Fetch session-linked records in bulk to avoid N+1 queries.
    const [{ data: submissions, error: submissionsError }, { data: grades, error: gradesError }] =
      await Promise.all([
        supabase
          .from("submissions")
          .select("session_id")
          .in("session_id", sessionIds),
        supabase
          .from("grades")
          .select("session_id, score")
          .in("session_id", sessionIds),
      ]);

    if (submissionsError) {
      console.error("Error fetching submissions:", submissionsError);
    }

    if (gradesError) {
      console.error("Error fetching grades:", gradesError);
    }

    const submissionCountBySession = new Map<string, number>();
    for (const submission of submissions || []) {
      const sessionId = submission.session_id as string;
      submissionCountBySession.set(
        sessionId,
        (submissionCountBySession.get(sessionId) || 0) + 1
      );
    }

    const gradesBySession = new Map<string, number[]>();
    for (const grade of grades || []) {
      const sessionId = grade.session_id as string;
      const score = Number(grade.score) || 0;
      const sessionGrades = gradesBySession.get(sessionId) || [];
      sessionGrades.push(score);
      gradesBySession.set(sessionId, sessionGrades);
    }

    const sessionsWithDetails = sessions.map((session) => {
      const exam = examMap.get(session.exam_id);
      const sessionGrades = gradesBySession.get(session.id) || [];

      // Calculate score - each grade is 0-100, calculate average.
      let totalScore = null;
      let maxScore = null;
      let averageScore = null;
      const isGraded = sessionGrades.length > 0;

      if (isGraded) {
        const totalPoints = sessionGrades.reduce((sum, score) => sum + score, 0);
        averageScore = Math.round(totalPoints / sessionGrades.length);
        totalScore = totalPoints;
        maxScore = sessionGrades.length * 100;
      }

      return {
        id: session.id,
        examId: session.exam_id,
        examTitle: exam?.title || "알 수 없는 시험",
        examCode: exam?.code || "",
        duration: exam?.duration || 0,
        status: session.submitted_at ? "completed" : "in-progress",
        submittedAt: session.submitted_at || null,
        createdAt: session.created_at,
        submissionCount: submissionCountBySession.get(session.id) || 0,
        score: totalScore,
        maxScore: maxScore,
        averageScore: averageScore, // Average percentage across all graded questions
        isGraded: isGraded, // Whether instructor has graded this session
      };
    });

    return NextResponse.json({
      sessions: sessionsWithDetails,
      pagination: {
        page,
        limit,
        total: filteredTotalCount,
        hasMore,
      },
    });
  } catch (error) {
    console.error("Get student sessions error:", error);
    return NextResponse.json(
      { error: "Failed to get student sessions" },
      { status: 500 }
    );
  }
}
