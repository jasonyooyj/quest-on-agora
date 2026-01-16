import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseRouteClient } from "@/lib/supabase-server";
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';

// GET /api/discussion/participant/[participantId]/note - Get instructor note
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ participantId: string }> }
) {
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'instructor-note')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "instructor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { participantId } = await params;
    const supabase = await createSupabaseRouteClient();

    // Verify participant's session belongs to instructor
    const { data: participant, error: participantError } = await supabase
      .from("discussion_participants")
      .select(`
        *,
        session:discussion_sessions (
          instructor_id
        )
      `)
      .eq("id", participantId)
      .single();

    if (participantError || !participant) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    const session = participant.session as any;

    if (session?.instructor_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the note
    const { data: note } = await supabase
      .from("discussion_instructor_notes")
      .select("*")
      .eq("participant_id", participantId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!note) {
      return NextResponse.json({ note: null });
    }

    return NextResponse.json({
      note: {
        id: note.id,
        participantId: note.participant_id,
        note: note.note,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
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
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'instructor-note')
  if (rateLimitResponse) return rateLimitResponse

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

    const supabase = await createSupabaseRouteClient();

    // Verify participant's session belongs to instructor
    const { data: participant, error: participantError } = await supabase
      .from("discussion_participants")
      .select(`
        *,
        session:discussion_sessions (
          instructor_id
        )
      `)
      .eq("id", participantId)
      .single();

    if (participantError || !participant) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    const session = participant.session as any;

    if (session?.instructor_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Upsert the note logic handled by checking existence first? 
    // Actually in Supabase UPSERT is easier.
    // However, we need to know the ID to update OR we can try to find existing one first.
    // The previous logic was: findFirst, if exists update, else create.
    // Since there's no unique constraint on (participant_id) enforced by schema (it's not unique in schema def, just index),
    // we should replicate logic: Find most recent note, update it. OR create new if none.
    // Actually, looking at schema: discussion_instructor_notes has ID PK. participant_id is FK.
    // It seems one participant CAN have multiple notes? The Previous FindFirst logic used "orderBy updated_at desc".
    // This implies there might be multiple notes but we only edit the latest one?
    // BUT the previous implementation's POST logic said: `findFirst ... if (existingNote) update`.
    // This implies purely "Single Note per Participant" logic is intended at application level.
    // So I will find existing note first to get its ID, then update it. If not found, create.

    const { data: existingNote } = await supabase
      .from("discussion_instructor_notes")
      .select("id")
      .eq("participant_id", participantId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let note;
    if (existingNote) {
      const { data: updated, error } = await supabase
        .from("discussion_instructor_notes")
        .update({
          note: noteContent,
          updated_at: new Date().toISOString()
        })
        .eq("id", existingNote.id)
        .select()
        .single();

      if (error) throw error;
      note = updated;
    } else {
      const { data: created, error } = await supabase
        .from("discussion_instructor_notes")
        .insert({
          participant_id: participantId,
          note: noteContent
        })
        .select()
        .single();

      if (error) throw error;
      note = created;
    }

    return NextResponse.json({
      note: {
        id: note.id,
        participantId: note.participant_id,
        note: note.note,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
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
