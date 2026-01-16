import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseRouteClient } from "@/lib/supabase-server";
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';

// 프로필 조회
export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'student-profile')
  if (rateLimitResponse) return rateLimitResponse

  try {
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

    // Supabase를 사용하여 프로필 조회
    console.log("[Profile API] Fetching profile for student_id:", user.id);
    const supabase = await createSupabaseRouteClient();
    const { data: profile, error } = await supabase
      .from("student_profiles")
      .select("*")
      .eq("student_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "Relation not found" or "No rows found" locally in standard postgres, 
      // but in supabase .single() it returns error if no row. 
      // We tread no row as null profile if it's the first time.
      console.error("[Profile API] Supabase error:", error);
      throw error;
    }

    console.log("[Profile API] Profile found:", profile ? "yes" : "no");

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("[Profile API] Error fetching profile:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("[Profile API] Error stack:", errorStack);
    return NextResponse.json(
      {
        error: "Failed to fetch profile",
        details: errorMessage,
        // 개발 환경에서만 스택 트레이스 포함
        ...(process.env.NODE_ENV === "development" && { stack: errorStack }),
      },
      { status: 500 }
    );
  }
}

// 프로필 생성/업데이트
export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'student-profile')
  if (rateLimitResponse) return rateLimitResponse

  try {
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

    const { name, student_number, school } = await request.json();

    // Validation
    if (!name || !student_number || !school) {
      return NextResponse.json(
        { error: "Name, student number, and school are required" },
        { status: 400 }
      );
    }

    // Upsert profile (create or update)
    const supabase = await createSupabaseRouteClient();
    const { data: profile, error } = await supabase
      .from("student_profiles")
      .upsert({
        student_id: user.id,
        name,
        student_number,
        school,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ profile, success: true });
  } catch (error) {
    console.error("Error saving profile:", error);
    return NextResponse.json(
      { error: "Failed to save profile" },
      { status: 500 }
    );
  }
}
