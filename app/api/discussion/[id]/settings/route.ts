import { createSupabaseRouteClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    // Apply rate limiting
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'discussion-settings')
    if (rateLimitResponse) return rateLimitResponse

    try {
        const { id } = await params;
        const settings = await request.json();
        const supabase = await createSupabaseRouteClient();

        // Authentication check
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // First, fetch current settings and verify ownership
        const { data: currentSession, error: fetchError } = await supabase
            .from("discussion_sessions")
            .select("settings, instructor_id")
            .eq("id", id)
            .single();

        // Authorization check - only instructor can modify settings
        if (currentSession && currentSession.instructor_id !== user.id) {
            return NextResponse.json(
                { error: "Forbidden: Only the instructor can modify discussion settings" },
                { status: 403 }
            );
        }

        if (fetchError) {
            return NextResponse.json(
                { error: "Failed to fetch session" },
                { status: 500 }
            );
        }

        const newSettings = {
            ...(currentSession?.settings as object),
            ...settings,
        };

        const { error } = await supabase
            .from("discussion_sessions")
            .update({
                settings: newSettings,
            })
            .eq("id", id);

        if (error) {
            console.error("Error updating settings:", error);
            return NextResponse.json(
                { error: "Failed to update settings" },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
