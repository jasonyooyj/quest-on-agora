import { createSupabaseRouteClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import type { PinnedQuote } from "@/types/discussion";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createSupabaseRouteClient();

        const { data: quotesData, error } = await supabase
            .from("discussion_pinned_quotes")
            .select("*")
            .eq("session_id", id)
            .order("sort_order", { ascending: true });

        if (error) {
            console.error("Error fetching pinned quotes:", error);
            return NextResponse.json(
                { error: "Failed to fetch pinned quotes" },
                { status: 500 }
            );
        }

        // Map snake_case to camelCase
        const quotes: PinnedQuote[] = (quotesData || []).map((q) => ({
            id: q.id,
            sessionId: q.session_id,
            participantId: q.participant_id,
            content: q.content,
            displayName: q.display_name,
            pinnedAt: q.pinned_at,
            sortOrder: q.sort_order,
        }));

        return NextResponse.json({ quotes });
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const supabase = await createSupabaseRouteClient();

        // Get current max sort order
        const { data: maxOrderData } = await supabase
            .from("discussion_pinned_quotes")
            .select("sort_order")
            .eq("session_id", id)
            .order("sort_order", { ascending: false })
            .limit(1)
            .single();

        const nextOrder = (maxOrderData?.sort_order ?? -1) + 1;

        const { data: quote, error } = await supabase
            .from("discussion_pinned_quotes")
            .insert({
                session_id: id,
                participant_id: body.participantId,
                content: body.content,
                display_name: body.displayName,
                sort_order: nextOrder,
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating pinned quote:", error);
            return NextResponse.json(
                { error: "Failed to create pinned quote" },
                { status: 500 }
            );
        }

        return NextResponse.json({ quote });
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
