import { createSupabaseRouteClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createSupabaseRouteClient();

        const { error } = await supabase
            .from("discussion_sessions")
            .update({
                status: "closed",
                closed_at: new Date().toISOString(),
            })
            .eq("id", id);

        if (error) {
            console.error("Error closing session:", error);
            return NextResponse.json(
                { error: "Failed to close session" },
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
