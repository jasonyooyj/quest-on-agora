import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { openai, AI_MODEL } from "@/lib/openai";

// POST /api/discussion/[sessionId]/messages/initial - Send initial AI message to start conversation
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

    // Check if there are already messages - don't send initial if there are
    const existingMessages = await prisma.discussion_messages.findFirst({
      where: {
        session_id: sessionId,
        participant_id: participantId,
      },
    });

    if (existingMessages) {
      return NextResponse.json({
        message: null,
        skipped: true,
        reason: "Messages already exist",
      });
    }

    // Extract settings
    const settings = session.settings as {
      aiContext?: string;
      aiMode?: "socratic" | "debate";
      stanceLabels?: Record<string, string>;
    } | null;

    const aiContext = settings?.aiContext || null;
    const aiMode = settings?.aiMode || "socratic";
    const stanceLabels = settings?.stanceLabels || {
      pro: "찬성",
      con: "반대",
      neutral: "중립",
    };

    // Build system prompt for initial message
    const systemPrompt = `당신은 토론 세션에서 학생과 대화하는 AI 조교입니다. 학생이 토론에 처음 참여했습니다.

토론 주제: ${session.title}
${session.description ? `설명: ${session.description}` : ""}
${aiContext ? `\n추가 컨텍스트 (강사자 지시사항):\n${aiContext}` : ""}

입장 옵션: ${stanceLabels.pro || "찬성"}, ${stanceLabels.con || "반대"}, ${stanceLabels.neutral || "중립"}

당신의 역할:
- 학생에게 토론 주제를 자연스럽게 소개하고, 이 주제에 대해 어떻게 생각하는지 물어보세요.
- 학생이 편하게 자신의 생각을 표현할 수 있도록 친근하고 격려하는 톤으로 대화를 시작하세요.
- 처음부터 입장을 강요하지 말고, 먼저 주제에 대한 학생의 초기 생각이나 경험을 물어보세요.
${aiMode === "socratic" ? "- 소크라테스식 대화법을 사용하여 질문으로 학생의 사고를 유도하세요." : "- 학생의 생각에 대해 다양한 관점을 제시하며 토론을 이끌어가세요."}
${aiContext ? "- 위의 '추가 컨텍스트'에 명시된 강사자의 지시사항을 고려하세요." : ""}

규칙:
1. 인사와 함께 토론 주제를 소개하세요.
2. 학생에게 이 주제에 대해 어떻게 생각하는지, 또는 관련 경험이 있는지 자연스럽게 물어보세요.
3. 너무 길지 않게, 2-3문장 정도로 간결하게 작성하세요.
4. 반드시 한국어로 응답하세요.
5. 존댓말을 사용하세요.`;

    console.log(`[Initial Message] Generating initial AI message for participant ${participantId}`);

    // Generate initial message using OpenAI
    const response = await openai.responses.create({
      model: AI_MODEL,
      instructions: systemPrompt,
      input: "토론 시작",
      store: true,
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

    if (!responseText || responseText.trim().length === 0) {
      console.error("[Initial Message] Empty response from OpenAI");
      responseText =
        "안녕하세요! 오늘 토론 주제에 대해 함께 이야기해보겠습니다. 이 주제에 대해 어떻게 생각하시나요?";
    }

    // Save initial AI message
    const message = await prisma.discussion_messages.create({
      data: {
        session_id: sessionId,
        participant_id: participantId,
        role: "ai",
        content: responseText,
        is_visible_to_student: true,
        response_id: response.id,
      },
    });

    console.log(`[Initial Message] Initial message saved with ID: ${message.id}`);

    return NextResponse.json({
      message: {
        id: message.id,
        sessionId: message.session_id,
        participantId: message.participant_id,
        role: message.role,
        content: message.content,
        createdAt: message.created_at.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error creating initial message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

