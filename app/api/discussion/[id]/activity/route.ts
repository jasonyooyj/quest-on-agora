import { createSupabaseRouteClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    // Apply rate limiting
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'activity')
    if (rateLimitResponse) return rateLimitResponse

    try {
        const { id } = await params;
        const supabase = await createSupabaseRouteClient();

        // Get messages from the last 5 minutes (as per hook comment)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

        const { data: messages, error } = await supabase
            .from("discussion_messages")
            .select("created_at")
            .eq("session_id", id)
            .gte("created_at", fiveMinutesAgo)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Error fetching activity stats:", error);
            return NextResponse.json(
                { error: "Failed to fetch activity stats" },
                { status: 500 }
            );
        }

        // Process messages into intervals
        // We want 10 intervals over 5 minutes -> 30 seconds per interval
        const now = Date.now();
        const intervalDuration = 30 * 1000;
        const messagesPerInterval = new Array(10).fill(0);
        const timestamps: string[] = [];

        // Initialize timestamps
        for (let i = 0; i < 10; i++) {
            timestamps.push(
                new Date(now - (9 - i) * intervalDuration).toISOString()
            );
        }

        messages?.forEach((msg) => {
            const msgTime = new Date(msg.created_at).getTime();
            const timeDiff = now - msgTime;
            if (timeDiff <= 5 * 60 * 1000 && timeDiff >= 0) {
                // Find which interval it belongs to
                // interval 9 is [now-30s, now]
                // interval 0 is [now-5m, now-4m30s]
                const intervalIndex = 9 - Math.floor(timeDiff / intervalDuration);
                if (intervalIndex >= 0 && intervalIndex < 10) {
                    messagesPerInterval[intervalIndex]++;
                }
            }
        });

        const totalMessages = messages?.length || 0;

        return NextResponse.json({
            messagesPerInterval,
            timestamps,
            totalMessages,
        });
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
