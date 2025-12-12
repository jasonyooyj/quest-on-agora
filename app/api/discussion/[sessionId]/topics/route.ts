import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { openai, AI_MODEL } from "@/lib/openai";
import type { TopicCluster } from "@/types/discussion";

// GET /api/discussion/[sessionId]/topics - Get topic clusters from GPT analysis
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
    const userRole = user.unsafeMetadata?.role as string;

    // Only instructors can view topics
    if (userRole !== "instructor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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

    // Get submitted participants with their stance statements and evidence
    const participants = await prisma.discussion_participants.findMany({
      where: {
        session_id: sessionId,
        is_submitted: true,
      },
      select: {
        id: true,
        student_id: true,
        stance: true,
        stance_statement: true,
        evidence: true,
      },
    });

    // If no submissions yet, return empty array
    if (participants.length === 0) {
      return NextResponse.json({ topics: [] });
    }

    // Prepare participant data for GPT analysis
    const participantData = participants.map((p: {
      id: string;
      student_id: string;
      stance: string | null;
      stance_statement: string | null;
      evidence: unknown;
    }) => {
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

      return {
        id: p.id,
        stance: p.stance || "neutral",
        statement: p.stance_statement || "",
        evidence: evidenceArray.filter((e: string) => e && e.trim().length > 0),
      };
    }).filter((p: { statement: string; evidence: string[] }) => p.statement.trim().length > 0 || p.evidence.length > 0);

    // If no valid data, return empty
    if (participantData.length === 0) {
      return NextResponse.json({ topics: [] });
    }

    // Build prompt for GPT to analyze and cluster topics
    const submissionsText = participantData
      .map((p: { stance: string; statement: string; evidence: string[] }, idx: number) => {
        const stanceLabel = p.stance === "pro" ? "찬성" : p.stance === "con" ? "반대" : "중립";
        const evidenceText = p.evidence.length > 0 ? `\n근거:\n${p.evidence.map((e: string, i: number) => `${i + 1}. ${e}`).join("\n")}` : "";
        return `참가자 ${idx + 1} (${stanceLabel}):\n입장: ${p.statement}${evidenceText}`;
      })
      .join("\n\n");

    const prompt = `다음은 토론 세션 "${session.title}"의 학생 제출 내용입니다. 주요 논점(topic clusters)을 분석하고 그룹화해주세요.

제출 내용:
${submissionsText}

다음 JSON 형식으로 응답해주세요. 각 클러스터는 유사한 주제나 논점을 공유하는 제출들을 그룹화한 것입니다:
{
  "clusters": [
    {
      "label": "논점 제목 (예: '경제적 효과', '환경적 영향')",
      "keywords": ["키워드1", "키워드2", "키워드3"],
      "participantIds": ["participant_id_1", "participant_id_2"],
      "sampleEvidence": "이 논점을 대표하는 대표적인 근거나 주장 한 문장"
    }
  ]
}

요구사항:
- 3-7개의 주요 논점 클러스터를 생성하세요
- 각 클러스터는 명확하고 구체적인 제목을 가져야 합니다
- participantIds는 해당 논점에 관련된 참가자들의 ID 배열입니다
- sampleEvidence는 해당 논점을 잘 대표하는 근거나 주장입니다
- JSON 형식만 반환하고 다른 설명은 포함하지 마세요`;

    // Call GPT to generate topic clusters
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content: "You are an expert at analyzing discussion submissions and identifying key topic clusters. Always respond with valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      console.error("[Topics API] Empty response from GPT");
      return NextResponse.json({ topics: [] });
    }

    // Parse GPT response
    let parsedResponse: { clusters?: Array<{
      label: string;
      keywords: string[];
      participantIds: string[];
      sampleEvidence: string;
    }> };
    
    try {
      parsedResponse = JSON.parse(responseContent);
    } catch (parseError) {
      console.error("[Topics API] Failed to parse GPT response:", parseError);
      console.error("[Topics API] Response content:", responseContent);
      return NextResponse.json({ topics: [] });
    }

    // Map to TopicCluster format
    const topics: TopicCluster[] = (parsedResponse.clusters || []).map((cluster, idx) => ({
      id: `cluster-${idx + 1}`,
      label: cluster.label,
      keywords: cluster.keywords || [],
      participantCount: cluster.participantIds?.length || 0,
      sampleEvidence: cluster.sampleEvidence || "",
      participantIds: cluster.participantIds || [],
    }));

    return NextResponse.json({ topics });
  } catch (error) {
    console.error("Error fetching topics:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
