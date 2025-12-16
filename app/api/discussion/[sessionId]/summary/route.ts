import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { openai, AI_MODEL } from "@/lib/openai";

// POST /api/discussion/[sessionId]/summary - Generate summary from conversation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await params;
    const body = await request.json();
    const { participantId } = body;

    if (!participantId) {
      return NextResponse.json(
        { error: "participantId is required" },
        { status: 400 }
      );
    }

    // Verify session exists
    const session = await prisma.discussion_sessions.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Verify participant exists and belongs to user
    const participant = await prisma.discussion_participants.findUnique({
      where: { id: participantId },
    });

    if (!participant || participant.student_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all messages for this participant
    const messages = await prisma.discussion_messages.findMany({
      where: {
        session_id: sessionId,
        participant_id: participantId,
        is_visible_to_student: true,
      },
      orderBy: { created_at: "asc" },
    });

    if (messages.length < 2) {
      return NextResponse.json(
        { error: "Not enough conversation to summarize" },
        { status: 400 }
      );
    }

    // Extract settings
    const settings = session.settings as {
      stanceLabels?: Record<string, string>;
    } | null;

    const stanceLabels = settings?.stanceLabels || {
      pro: "찬성",
      con: "반대",
      neutral: "중립",
    };

    // Build conversation transcript
    const transcript = messages
      .map((msg) => {
        const role = msg.role === "user" ? "학생" : msg.role === "ai" ? "AI" : "강사";
        return `${role}: ${msg.content}`;
      })
      .join("\n\n");

    // System prompt for summary generation
    const systemPrompt = `당신은 토론 내용을 분석하고 정리하는 AI 조교입니다.

토론 주제: ${session.title}
${session.description ? `설명: ${session.description}` : ""}

입장 옵션:
- pro (${stanceLabels.pro || "찬성"})
- con (${stanceLabels.con || "반대"})
- neutral (${stanceLabels.neutral || "중립"})

아래의 대화 내용을 분석하여 학생의 최종 입장과 근거를 정리해주세요.

규칙:
1. 반드시 아래의 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.
2. stance는 반드시 "pro", "con", "neutral" 중 하나여야 합니다.
3. stanceStatement는 학생의 최종 입장을 2-3문장으로 명확하게 정리하세요.
4. evidence는 학생이 제시한 근거를 배열로 정리하세요. 각 근거는 1-2문장으로 요약하세요.
5. 학생이 명확한 입장을 밝히지 않았다면 대화 맥락에서 가장 가까운 입장을 추론하세요.
6. 근거가 없거나 불명확하면 대화에서 언급된 관련 내용을 근거로 정리하세요.

응답 형식:
{
  "stance": "pro" | "con" | "neutral",
  "stanceStatement": "학생의 입장 진술",
  "evidence": ["근거 1", "근거 2", "근거 3"]
}`;

    console.log(`[Summary] Generating summary for participant ${participantId}`);
    console.log(`[Summary] Transcript length: ${transcript.length} characters`);

    // Generate summary using OpenAI
    const response = await openai.responses.create({
      model: AI_MODEL,
      instructions: systemPrompt,
      input: `대화 내용:\n\n${transcript}`,
      store: false,
    });

    // Extract response text
    let responseText = "";
    const outputArray = response.output as any;

    if (outputArray && Array.isArray(outputArray)) {
      const messageOutput = outputArray.find(
        (item: any) => item.type === "message" && item.content
      );

      if (messageOutput && Array.isArray(messageOutput.content)) {
        const textParts = messageOutput.content
          .filter((part: any) => part.type === "output_text" && part.text)
          .map((part: any) => part.text);
        responseText = textParts.join("");
      } else if (messageOutput && typeof messageOutput.content === "string") {
        responseText = messageOutput.content;
      }
    } else if (typeof outputArray === "string") {
      responseText = outputArray;
    }

    console.log(`[Summary] Raw response: ${responseText}`);

    // Parse JSON response
    let summary: {
      stance: "pro" | "con" | "neutral";
      stanceStatement: string;
      evidence: string[];
    };

    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        summary = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }

      // Validate stance
      if (!["pro", "con", "neutral"].includes(summary.stance)) {
        summary.stance = "neutral";
      }

      // Ensure evidence is an array
      if (!Array.isArray(summary.evidence)) {
        summary.evidence = [];
      }

      // Ensure stanceStatement is a string
      if (typeof summary.stanceStatement !== "string") {
        summary.stanceStatement = "";
      }
    } catch (parseError) {
      console.error("[Summary] Failed to parse JSON response:", parseError);
      // Return default summary
      summary = {
        stance: "neutral",
        stanceStatement:
          "대화 내용을 바탕으로 입장을 정리해주세요.",
        evidence: ["대화에서 언급한 내용을 근거로 작성해주세요."],
      };
    }

    console.log(`[Summary] Parsed summary:`, summary);

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Error generating summary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


