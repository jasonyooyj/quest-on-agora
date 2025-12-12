"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function NewDiscussionPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [isCreating, setIsCreating] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [aiContext, setAiContext] = useState("");
  const [anonymous, setAnonymous] = useState(true);

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("토론 주제를 입력하세요");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/discussion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          settings: {
            anonymous,
            stanceOptions: ["pro", "con", "neutral"],
            aiContext: aiContext.trim() || null,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create discussion");
      }

      const data = await response.json();
      toast.success("토론 세션이 생성되었습니다");
      router.push(`/instructor/discussions/${data.session.id}`);
    } catch (error) {
      console.error("Error creating discussion:", error);
      toast.error("토론 세션 생성에 실패했습니다");
    } finally {
      setIsCreating(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const userRole = user?.unsafeMetadata?.role as string;
  if (userRole !== "instructor") {
    router.push("/student");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/instructor")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">새 토론 세션</h1>
            <p className="text-muted-foreground">
              학생들과 실시간 토론을 진행하세요
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              토론 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">토론 주제 *</Label>
              <Input
                id="title"
                placeholder="예: 인공지능이 인간의 일자리를 대체해야 하는가?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">설명 (선택)</Label>
              <Textarea
                id="description"
                placeholder="토론의 배경이나 참고사항을 입력하세요..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* AI Context */}
            <div className="space-y-2">
              <Label htmlFor="aiContext">AI 컨텍스트 (선택)</Label>
              <Textarea
                id="aiContext"
                placeholder="AI 조교에게 전달할 추가 정보나 지시사항을 입력하세요. 예: 특정 관점을 강조하거나, 특정 사례를 언급하도록 안내 등..."
                value={aiContext}
                onChange={(e) => setAiContext(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                이 정보는 AI 조교가 학생과 대화할 때 참고하게 됩니다. 토론 주제와 관련된 추가 배경 정보, 특별히 다뤄야 할 관점, 참고할 사례 등을 입력할 수 있습니다.
              </p>
            </div>

            {/* Anonymous Mode */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
              <div className="space-y-0.5">
                <Label className="font-medium">익명 모드</Label>
                <p className="text-xs text-muted-foreground">
                  학생들의 실명을 숨기고 "Student 1", "Student 2" 등으로 표시합니다
                </p>
              </div>
              <Switch checked={anonymous} onCheckedChange={setAnonymous} />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push("/instructor")}
              >
                취소
              </Button>
              <Button
                className="flex-1 bg-purple-700 hover:bg-purple-800 text-white"
                onClick={handleCreate}
                disabled={isCreating || !title.trim()}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  "토론 시작"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
