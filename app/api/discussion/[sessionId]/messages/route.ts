import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { openai, AI_MODEL } from "@/lib/openai";

// GET /api/discussion/[sessionId]/messages - Get messages
// Optional query params: participantId, limit
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const participantId = searchParams.get("participantId");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const userRole = user.unsafeMetadata?.role as string;

    // Verify session exists
    const session = await prisma.discussion_sessions.findUnique({
      where: { id: sessionId },
      select: { instructor_id: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // If student, verify they are a participant
    if (userRole !== "instructor") {
      if (!participantId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const participant = await prisma.discussion_participants.findUnique({
        where: { id: participantId },
      });

      if (!participant || participant.student_id !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Students can only see their own messages
      const whereClause = {
        session_id: sessionId,
        participant_id: participantId,
        is_visible_to_student: true, // Only show messages visible to students
      };

      const messages = await prisma.discussion_messages.findMany({
        where: whereClause,
        orderBy: { created_at: "asc" },
        take: limit,
      });

      const formattedMessages = messages.map((m) => ({
        id: m.id,
        sessionId: m.session_id,
        participantId: m.participant_id,
        role: m.role,
        content: m.content,
        messageType: m.message_type,
        isVisibleToStudent: m.is_visible_to_student,
        createdAt: m.created_at.toISOString(),
        metadata: m.metadata,
      }));

      return NextResponse.json({ messages: formattedMessages });
    }

    // Instructor: verify ownership
    if (session.instructor_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build query
    const whereClause: Record<string, unknown> = {
      session_id: sessionId,
    };

    if (participantId) {
      whereClause.participant_id = participantId;
    }

    const messages = await prisma.discussion_messages.findMany({
      where: whereClause,
      orderBy: { created_at: "asc" },
      take: limit,
      include: {
        participant: {
          select: {
            id: true,
            display_name: true,
            stance: true,
          },
        },
      },
    });

    const formattedMessages = messages.map((m) => ({
      id: m.id,
      sessionId: m.session_id,
      participantId: m.participant_id,
      role: m.role,
      content: m.content,
      messageType: m.message_type,
      isVisibleToStudent: m.is_visible_to_student,
      createdAt: m.created_at.toISOString(),
      metadata: m.metadata,
      participant: m.participant
        ? {
            id: m.participant.id,
            displayName: m.participant.display_name,
            stance: m.participant.stance,
          }
        : undefined,
    }));

    return NextResponse.json({ messages: formattedMessages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/discussion/[sessionId]/messages - Send a message (student or instructor)
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
    const { participantId, content, role = "user" } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const userRole = user.unsafeMetadata?.role as string;

    // Verify session exists
    const session = await prisma.discussion_sessions.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // If student, verify they are a participant
    if (userRole !== "instructor") {
      if (!participantId) {
        return NextResponse.json(
          { error: "participantId is required for students" },
          { status: 400 }
        );
      }

      const participant = await prisma.discussion_participants.findUnique({
        where: { id: participantId },
      });

      if (!participant || participant.student_id !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (participant.session_id !== sessionId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Create student message
      const message = await prisma.discussion_messages.create({
        data: {
          session_id: sessionId,
          participant_id: participantId,
          role: "user",
          content,
          is_visible_to_student: true,
        },
      });

      // Update participant last active
      await prisma.discussion_participants.update({
        where: { id: participantId },
        data: {
          is_online: true,
          last_active_at: new Date(),
        },
      });

      // Generate AI response
      try {
        console.log(`[AI Response] Starting AI response generation for participant ${participantId}`);
        
        // Get previous response_id for conversation chaining
        const previousAiMessage = await prisma.discussion_messages.findFirst({
          where: {
            session_id: sessionId,
            participant_id: participantId,
            role: "ai",
            response_id: { not: null },
          },
          orderBy: { created_at: "desc" },
        });

        const previousResponseId: string | null = previousAiMessage?.response_id || null;

        if (process.env.NODE_ENV === "development") {
          console.log(
            `[AI Response] Previous response ID: ${previousResponseId || "none (first message)"}`
          );
        }

        // Build system prompt with discussion context
        const stanceLabel =
          participant.stance === "pro"
            ? "찬성"
            : participant.stance === "con"
              ? "반대"
              : participant.stance === "neutral"
                ? "중립"
                : "미정";

        // Extract AI context from settings
        const settings = session.settings as { aiContext?: string } | null;
        const aiContext = settings?.aiContext || null;

        const systemPrompt = `당신은 토론 세션에서 학생과 대화하는 AI 조교입니다.

토론 주제: ${session.title}
${session.description ? `설명: ${session.description}` : ""}
${aiContext ? `\n추가 컨텍스트 (강사자 지시사항):\n${aiContext}` : ""}

학생 정보:
- 입장: ${stanceLabel}
${participant.stance_statement ? `- 입장 진술: ${participant.stance_statement}` : ""}
${(() => {
  // Parse evidence array from JSON
  let evidenceArray: string[] = [];
  if (participant.evidence) {
    try {
      evidenceArray = Array.isArray(participant.evidence)
        ? participant.evidence
        : JSON.parse(participant.evidence as string);
    } catch {
      evidenceArray = [];
    }
  }
  // Fallback to legacy format
  if (evidenceArray.length === 0) {
    if (participant.evidence_1) evidenceArray.push(participant.evidence_1);
    if (participant.evidence_2) evidenceArray.push(participant.evidence_2);
  }
  return evidenceArray.map((ev, idx) => `- 근거 ${idx + 1}: ${ev}`).join("\n");
})()}

역할:
- 학생의 사고를 확장시키고 깊이 있게 탐구하도록 돕습니다.
- 학생의 입장과 근거를 바탕으로 질문하고 토론을 이끕니다.
- 비판적 사고를 자극하는 질문을 제시합니다.
- 존댓말을 사용하며 친근하고 전문적인 톤을 유지합니다.
${aiContext ? "- 위의 '추가 컨텍스트'에 명시된 강사자의 지시사항을 반드시 고려하여 대화를 진행합니다." : ""}

규칙:
1. 학생의 질문에 직접적이고 명확하게 답변합니다.
2. 학생의 입장과 근거를 고려하여 대화를 진행합니다.
3. 추가적인 질문이나 반대 의견을 제시하여 사고를 확장시킵니다.
4. 토론 주제와 관련된 구체적인 예시나 사례를 제시할 수 있습니다.
5. 답변은 간결하고 핵심적이어야 합니다.
6. 반드시 한국어로 응답합니다.`;

        console.log(`[AI Response] Calling OpenAI Responses API with model: ${AI_MODEL}`);
        
        const aiStartTime = Date.now();
        
        // Use OpenAI Responses API for conversation chaining
        const response = await openai.responses.create({
          model: AI_MODEL,
          instructions: systemPrompt,
          input: content,
          previous_response_id: previousResponseId || undefined,
          store: true, // 응답을 저장하여 나중에 참조 가능하도록
        });

        const aiDuration = Date.now() - aiStartTime;
        console.log(
          `⏱️  [PERFORMANCE] OpenAI Responses API response time: ${aiDuration}ms`
        );

        if (process.env.NODE_ENV === "development") {
          console.log("OpenAI Responses API response received:", {
            responseId: response.id,
            hasOutput: !!response.output,
            outputLength: response.output?.length || 0,
          });
        }

        // Extract response text from output array
        let responseText = "";
        const outputArray = response.output as any;
        
        console.log(`[AI Response] Raw output type:`, typeof outputArray);
        console.log(`[AI Response] Raw output is array:`, Array.isArray(outputArray));
        console.log(`[AI Response] Raw output:`, JSON.stringify(outputArray, null, 2));
        
        if (outputArray && Array.isArray(outputArray)) {
          // type이 'message'인 항목 찾기
          const messageOutput = outputArray.find(
            (item: any) => item.type === "message" && item.content
          );

          console.log(`[AI Response] Found message output:`, messageOutput ? "yes" : "no");
          
          if (messageOutput) {
            console.log(`[AI Response] Message output content type:`, typeof messageOutput.content);
            console.log(`[AI Response] Message output content is array:`, Array.isArray(messageOutput.content));
            
            if (Array.isArray(messageOutput.content)) {
              // content 배열에서 텍스트 추출
              const textParts = messageOutput.content
                .filter((part: any) => part.type === "output_text" && part.text)
                .map((part: any) => part.text);
              responseText = textParts.join("");
              console.log(`[AI Response] Extracted text from content array (length: ${responseText.length})`);
            } else if (typeof messageOutput.content === "string") {
              // content가 직접 문자열인 경우
              responseText = messageOutput.content;
              console.log(`[AI Response] Extracted text directly from content (length: ${responseText.length})`);
            }
          }
        } else if (typeof outputArray === "string") {
          // output이 직접 문자열인 경우
          responseText = outputArray;
          console.log(`[AI Response] Output is direct string (length: ${responseText.length})`);
        } else if (outputArray && typeof outputArray === "object") {
          // output이 객체인 경우, 다양한 필드 확인
          console.log(`[AI Response] Output is object, checking fields...`);
          if (outputArray.text) {
            responseText = outputArray.text;
            console.log(`[AI Response] Found text field (length: ${responseText.length})`);
          } else if (outputArray.content) {
            responseText = typeof outputArray.content === "string" 
              ? outputArray.content 
              : JSON.stringify(outputArray.content);
            console.log(`[AI Response] Found content field (length: ${responseText.length})`);
          } else {
            // 객체를 문자열로 변환
            responseText = JSON.stringify(outputArray);
            console.log(`[AI Response] Converting object to string (length: ${responseText.length})`);
          }
        }

        if (!responseText || responseText.trim().length === 0) {
          console.error("[AI Response] OpenAI returned empty or null response");
          console.error("[AI Response] Full response object:", JSON.stringify(response, null, 2));
          responseText = "죄송합니다. 응답을 생성하는 중에 문제가 발생했습니다. 다시 시도해주세요.";
        }

        if (responseText) {
          console.log(`[AI Response] Successfully generated response (length: ${responseText.length})`);
          
          // Save AI response with response_id
          await prisma.discussion_messages.create({
            data: {
              session_id: sessionId,
              participant_id: participantId,
              role: "ai",
              content: responseText,
              is_visible_to_student: true,
              response_id: response.id, // Save response_id for conversation chaining
            },
          });
          
          console.log(`[AI Response] AI response saved to database with response_id: ${response.id}`);
        } else {
          console.error("[AI Response] Failed to generate AI response: empty response from OpenAI");
        }
      } catch (aiError) {
        // Log detailed error information
        console.error("[AI Response] Error generating AI response:");
        console.error("[AI Response] Error type:", aiError instanceof Error ? aiError.constructor.name : typeof aiError);
        console.error("[AI Response] Error message:", aiError instanceof Error ? aiError.message : String(aiError));
        console.error("[AI Response] Error stack:", aiError instanceof Error ? aiError.stack : "No stack trace");
        console.error("[AI Response] Full error object:", JSON.stringify(aiError, Object.getOwnPropertyNames(aiError), 2));
        
        // Log to browser console as well (will appear in server logs that can be viewed)
        console.error(`[AI Response] Failed for participant ${participantId}, session ${sessionId}`);
      }

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
    }

    // Instructor: verify ownership
    if (session.instructor_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Create instructor message
    const message = await prisma.discussion_messages.create({
      data: {
        session_id: sessionId,
        participant_id: participantId || null,
        role: role === "instructor" ? "instructor" : "system",
        content,
        is_visible_to_student: body.isVisibleToStudent ?? true,
        message_type: body.messageType,
      },
    });

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
    console.error("Error creating message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
