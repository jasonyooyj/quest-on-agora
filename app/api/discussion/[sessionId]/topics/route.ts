import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { openai, AI_MODEL } from "@/lib/openai";

// GET /api/discussion/[sessionId]/topics - Get main discussion topics using GPT
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = user.unsafeMetadata?.role as string;
    if (userRole !== "instructor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { sessionId } = await params;

    // Verify session ownership
    const session = await prisma.discussion_sessions.findUnique({
      where: { id: sessionId },
      select: { instructor_id: true, title: true, description: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.instructor_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all participants with their statements
    const participants = await prisma.discussion_participants.findMany({
      where: {
        session_id: sessionId,
        is_submitted: true,
      },
      select: {
        id: true,
        stance: true,
        stance_statement: true,
        evidence: true,
        evidence_1: true, // Legacy support
        evidence_2: true, // Legacy support
      },
    });

    if (participants.length === 0) {
      return NextResponse.json({ topics: [] });
    }

    // Collect all student responses
    const studentResponses: Array<{
      participantId: string;
      stance: string | null;
      statements: string[];
    }> = [];

    participants.forEach((p) => {
      const statements: string[] = [];
      if (p.stance_statement) statements.push(p.stance_statement);
      
      // Parse evidence array from JSON
      let evidenceArray: string[] = [];
      if (p.evidence) {
        try {
          evidenceArray = Array.isArray(p.evidence)
            ? p.evidence
            : JSON.parse(p.evidence as string);
        } catch {
          evidenceArray = [];
        }
      }
      // Fallback to legacy format
      if (evidenceArray.length === 0) {
        if (p.evidence_1) evidenceArray.push(p.evidence_1);
        if (p.evidence_2) evidenceArray.push(p.evidence_2);
      }
      statements.push(...evidenceArray);

      if (statements.length > 0) {
        studentResponses.push({
          participantId: p.id,
          stance: p.stance || null,
          statements,
        });
      }
    });

    if (studentResponses.length === 0) {
      return NextResponse.json({ topics: [] });
    }

    // Get recent messages for additional context
    const recentMessages = await prisma.discussion_messages.findMany({
      where: {
        session_id: sessionId,
        role: "user",
      },
      select: {
        content: true,
      },
      orderBy: {
        created_at: "desc",
      },
      take: 20,
    });

    // Prepare text for GPT analysis
    const responsesText = studentResponses
      .map((r, idx) => {
        const stanceLabel =
          r.stance === "pro"
            ? "찬성"
            : r.stance === "con"
              ? "반대"
              : r.stance === "neutral"
                ? "중립"
                : "미정";
        return `[학생 ${idx + 1} (ID: ${r.participantId}) - ${stanceLabel}]
${r.statements.join("\n")}`;
      })
      .join("\n\n");

    const messagesText =
      recentMessages.length > 0
        ? "\n\n[최근 대화 내용]\n" +
          recentMessages
            .map((m, idx) => `대화 ${idx + 1}: ${m.content}`)
            .join("\n")
        : "";

    const systemPrompt = `당신은 토론 세션의 주요 논점을 분석하는 전문가입니다. 학생들의 입장과 근거를 바탕으로 주요 논점을 추출하고 분류해주세요.`;

    const userPrompt = `토론 주제: ${session.title}
${session.description ? `설명: ${session.description}\n` : ""}

[학생들의 입장과 근거]
${responsesText}${messagesText}

위 내용을 바탕으로 토론에서 나타난 주요 논점을 3-5개 추출해주세요. 각 논점은:
1. 명확하고 간결한 제목
2. 해당 논점을 다룬 학생 수
3. 대표적인 예시 문장

다음 JSON 형식으로 응답해주세요:
{
  "topics": [
    {
      "id": "topic-1",
      "label": "논점 제목",
      "keywords": ["키워드1", "키워드2"],
      "participantCount": 3,
      "sampleEvidence": "대표적인 예시 문장",
      "participantIds": ["실제 participant ID 1", "실제 participant ID 2"]
    }
  ]
}

중요: 각 논점의 participantIds는 위에 나온 학생들의 실제 ID (예: "ID: xxx" 형식)를 정확히 포함해야 합니다. 학생 번호가 아닌 실제 participantId를 사용하세요.`;

    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(
      completion.choices[0]?.message?.content || '{"topics": []}'
    );

    // Validate and format the response - filter participantIds to only include valid ones
    const validParticipantIds = new Set(
      participants.map((p) => p.id)
    );
    
    const topics = (result.topics || []).map((topic: any) => {
      const validIds = Array.isArray(topic.participantIds)
        ? topic.participantIds.filter((id: string) => validParticipantIds.has(id))
        : [];
      
      return {
        id: topic.id || `topic-${Math.random().toString(36).substr(2, 9)}`,
        label: topic.label || "논점",
        keywords: Array.isArray(topic.keywords) ? topic.keywords : [],
        participantCount: validIds.length > 0 ? validIds.length : (topic.participantCount || 0),
        sampleEvidence: topic.sampleEvidence || "",
        participantIds: validIds,
      };
    }).filter((topic) => topic.participantIds.length > 0); // Only include topics with valid participants

    return NextResponse.json({ topics });
  } catch (error) {
    console.error("Error generating topics:", error);
    // Return empty topics on error instead of failing
    return NextResponse.json({ topics: [] });
  }
}

