import { createSupabaseRouteClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const settings = await request.json();
        const supabase = await createSupabaseRouteClient();

        // First, fetch current settings to merge
        const { data: currentSession, error: fetchError } = await supabase
            .from("discussion_sessions")
            .select("settings")
            .eq("id", id)
            .single();

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
