import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { openai, AI_MODEL } from "@/lib/openai";

export const runtime = "nodejs";

interface GeneratedTopic {
  title: string;
  description: string;
  stances?: {
    pro: string;
    con: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 강사 권한 확인
    if (user.role !== "instructor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { context, fileUrl, fileName, mimeType } = body;

    let textContent = context || "";

    // 파일 URL이 제공된 경우 텍스트 추출
    if (fileUrl) {
      try {
        console.log("[generate-topics] Extracting text from file:", fileName);
        
        const extractResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/extract-text`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileUrl, fileName, mimeType }),
          }
        );

        if (extractResponse.ok) {
          const extractData = await extractResponse.json();
          if (extractData.text) {
            textContent = extractData.text;
            console.log("[generate-topics] Extracted text length:", textContent.length);
          }
        } else {
          console.error("[generate-topics] Text extraction failed:", await extractResponse.text());
        }
      } catch (extractError) {
        console.error("[generate-topics] Text extraction error:", extractError);
      }
    }

    if (!textContent.trim()) {
      return NextResponse.json(
        { error: "컨텍스트나 파일 내용이 필요합니다." },
        { status: 400 }
      );
    }

    // 텍스트가 너무 길면 잘라내기 (토큰 제한)
    const maxLength = 8000;
    const truncatedContent = textContent.length > maxLength 
      ? textContent.substring(0, maxLength) + "..." 
      : textContent;

    console.log("[generate-topics] Generating topics from content length:", truncatedContent.length);

    // GPT를 사용해 토론 주제 생성
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content: `당신은 대학 교육 전문가입니다. 주어진 학습 자료를 바탕으로 학생들이 토론할 수 있는 흥미롭고 교육적인 토론 주제를 생성합니다.

각 토론 주제는 다음 조건을 만족해야 합니다:
1. 학습 자료의 핵심 개념을 다루되, 단순한 사실 확인이 아닌 분석/평가/종합적 사고를 요구
2. 찬반 또는 다양한 관점에서 논의 가능한 주제
3. 학생들의 비판적 사고를 촉진하는 주제
4. 명확하고 구체적인 질문 형태

응답은 반드시 아래 JSON 형식으로만 출력하세요:
{
  "topics": [
    {
      "title": "토론 주제 질문",
      "description": "이 주제에 대한 간략한 배경 설명 (2-3문장)",
      "stances": {
        "pro": "찬성/긍정 측 입장 이름",
        "con": "반대/부정 측 입장 이름"
      }
    }
  ]
}

3-5개의 토론 주제를 생성하세요.`
        },
        {
          role: "user",
          content: `다음 학습 자료를 바탕으로 토론 주제를 생성해주세요:\n\n${truncatedContent}`
        }
      ],
      max_completion_tokens: 2000,
      response_format: { type: "json_object" }
    });

    const responseText = completion.choices[0]?.message?.content;
    
    if (!responseText) {
      throw new Error("GPT 응답이 비어있습니다.");
    }

    console.log("[generate-topics] GPT response:", responseText.substring(0, 200));

    let topics: GeneratedTopic[];
    try {
      const parsed = JSON.parse(responseText);
      topics = parsed.topics || [];
    } catch (parseError) {
      console.error("[generate-topics] JSON parse error:", parseError);
      throw new Error("토론 주제 생성 결과를 파싱할 수 없습니다.");
    }

    return NextResponse.json({
      success: true,
      topics,
      sourceLength: truncatedContent.length,
    });

  } catch (error) {
    console.error("[generate-topics] Error:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "토론 주제 생성에 실패했습니다.",
      },
      { status: 500 }
    );
  }
}

