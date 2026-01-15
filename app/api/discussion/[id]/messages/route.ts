import { createSupabaseRouteClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import type { DiscussionMessage } from "@/types/discussion";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const participantId = searchParams.get("participantId");
        const limit = searchParams.get("limit");

        const supabase = await createSupabaseRouteClient();

        let query = supabase
            .from("discussion_messages")
            .select(`
        *,
        participant:discussion_participants(id, display_name, stance)
      `)
            .eq("session_id", id)
            .order("created_at", { ascending: true }); // Default to oldest first for chat history

        if (participantId) {
            query = query.eq("participant_id", participantId);
        }

        if (limit) {
            query = query.limit(parseInt(limit));
        }

        const { data: messagesData, error } = await query;

        if (error) {
            console.error("Error fetching messages:", error);
            return NextResponse.json(
                { error: "Failed to fetch messages" },
                { status: 500 }
            );
        }

        // Map snake_case to camelCase
        const messages: DiscussionMessage[] = (messagesData || []).map((m) => ({
            id: m.id,
            sessionId: m.session_id,
            participantId: m.participant_id,
            role: m.role,
            content: m.content,
            messageType: m.message_type,
            isVisibleToStudent: m.is_visible_to_student,
            createdAt: m.created_at,
            metadata: m.metadata,
            participant: m.participant
                ? {
                    id: m.participant.id,
                    displayName: m.participant.display_name,
                    stance: m.participant.stance,
                }
                : undefined,
        }));

        return NextResponse.json({ messages });
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
