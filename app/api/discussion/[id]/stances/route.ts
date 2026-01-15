import { createSupabaseRouteClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import type { StanceDistribution } from "@/types/discussion";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createSupabaseRouteClient();

        const { data: participants, error } = await supabase
            .from("discussion_participants")
            .select("stance, is_submitted")
            .eq("session_id", id);

        if (error) {
            console.error("Error fetching participants for stances:", error);
            return NextResponse.json(
                { error: "Failed to fetch stances" },
                { status: 500 }
            );
        }

        const distribution: StanceDistribution = {
            pro: 0,
            con: 0,
            neutral: 0,
            unsubmitted: 0,
        };

        participants?.forEach((p) => {
            if (!p.is_submitted) {
                distribution.unsubmitted++;
            } else if (p.stance === "pro") {
                distribution.pro++;
            } else if (p.stance === "con") {
                distribution.con++;
            } else if (p.stance === "neutral") {
                distribution.neutral++;
            }
        });

        return NextResponse.json({ distribution });
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
