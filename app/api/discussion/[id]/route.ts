import { createSupabaseRouteClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import type { DiscussionSession } from "@/types/discussion";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createSupabaseRouteClient();

        const { data: sessionData, error } = await supabase
            .from("discussion_sessions")
            .select("*")
            .eq("id", id)
            .single();

        if (error) {
            console.error("Error fetching discussion session:", error);
            return NextResponse.json(
                { error: "Failed to fetch discussion session" },
                { status: 500 }
            );
        }

        if (!sessionData) {
            return NextResponse.json(
                { error: "Discussion session not found" },
                { status: 404 }
            );
        }

        // Map snake_case to camelCase
        const session: DiscussionSession = {
            id: sessionData.id,
            instructorId: sessionData.instructor_id,
            title: sessionData.title,
            description: sessionData.description,
            status: sessionData.status,
            joinCode: sessionData.join_code,
            settings: sessionData.settings,
            createdAt: sessionData.created_at,
            updatedAt: sessionData.updated_at,
            closedAt: sessionData.closed_at,
        };

        return NextResponse.json({ session });
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
