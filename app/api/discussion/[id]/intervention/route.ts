import { createSupabaseRouteClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { participantId, content, messageType, isVisibleToStudent } = body;
        const supabase = await createSupabaseRouteClient();

        const { data: message, error } = await supabase
            .from("discussion_messages")
            .insert({
                session_id: id,
                participant_id: participantId,
                role: "instructor",
                content,
                message_type: messageType,
                is_visible_to_student: isVisibleToStudent,
            })
            .select()
            .single();

        if (error) {
            console.error("Error sending intervention:", error);
            return NextResponse.json(
                { error: "Failed to send intervention" },
                { status: 500 }
            );
        }

        return NextResponse.json({ message });
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
