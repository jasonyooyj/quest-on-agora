import { createSupabaseRouteClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import type { DiscussionParticipant } from "@/types/discussion";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createSupabaseRouteClient();

        const { data: participantsData, error } = await supabase
            .from("discussion_participants")
            .select("*")
            .eq("session_id", id);

        if (error) {
            console.error("Error fetching participants:", error);
            return NextResponse.json(
                { error: "Failed to fetch participants" },
                { status: 500 }
            );
        }

        // Map snake_case to camelCase
        const participants: DiscussionParticipant[] = (participantsData || []).map(
            (p) => ({
                id: p.id,
                sessionId: p.session_id,
                studentId: p.student_id,
                displayName: p.display_name,
                stance: p.stance,
                stanceStatement: p.stance_statement,
                evidence: p.evidence,
                evidence1: p.evidence_1,
                evidence2: p.evidence_2,
                isSubmitted: p.is_submitted,
                isOnline: p.is_online,
                lastActiveAt: p.last_active_at,
                createdAt: p.created_at,
                confusionNote: p.confusion_note,
                needsHelp: p.needs_help,
            })
        );

        return NextResponse.json({ participants });
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
