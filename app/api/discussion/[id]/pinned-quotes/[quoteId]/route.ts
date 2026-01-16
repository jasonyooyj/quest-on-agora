import { createSupabaseRouteClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; quoteId: string }> }
) {
    // Apply rate limiting
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'pinned-quotes')
    if (rateLimitResponse) return rateLimitResponse

    try {
        const { id, quoteId } = await params;
        const supabase = await createSupabaseRouteClient();

        const { error } = await supabase
            .from("discussion_pinned_quotes")
            .delete()
            .eq("id", quoteId)
            .eq("session_id", id);

        if (error) {
            console.error("Error unpinning quote:", error);
            return NextResponse.json(
                { error: "Failed to unpin quote" },
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
