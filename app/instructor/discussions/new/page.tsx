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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Loader2, MessageSquare, HelpCircle, Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { AIMode } from "@/types/discussion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function NewDiscussionPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [isCreating, setIsCreating] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [aiContext, setAiContext] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [aiMode, setAiMode] = useState<AIMode>("socratic");

  // 커스텀 입장 옵션
  const [useCustomStances, setUseCustomStances] = useState(false);
  const [stanceA, setStanceA] = useState("찬성");
  const [stanceB, setStanceB] = useState("반대");
  // 추가 입장들 (기본값: "중립")
  const [additionalStances, setAdditionalStances] = useState<Array<{ id: string; label: string }>>([]);

  // 토론 시간 설정 (분 단위)
  const [duration, setDuration] = useState(15);

  // 시간에 따른 예상 문답 횟수 계산 (약 3분당 1회 문답)
  const estimatedTurns = Math.max(3, Math.round(duration / 3));

  // 추가 입장 추가
  const addAdditionalStance = () => {
    const nextId = String.fromCharCode(67 + additionalStances.length); // C, D, E, ...
    setAdditionalStances([...additionalStances, { id: `stance_${nextId.toLowerCase()}`, label: "중립" }]);
  };

  // 추가 입장 제거
  const removeAdditionalStance = (id: string) => {
    setAdditionalStances(additionalStances.filter((s) => s.id !== id));
  };

  // 추가 입장 라벨 업데이트
  const updateAdditionalStance = (id: string, label: string) => {
    setAdditionalStances(
      additionalStances.map((s) => (s.id === id ? { ...s, label } : s))
    );
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("토론 주제를 입력하세요");
      return;
    }

    setIsCreating(true);
    try {
      // 동적으로 stanceOptions와 stanceLabels 생성
      let stanceOptions: string[];
      let stanceLabels: Record<string, string>;

      if (useCustomStances) {
        // 커스텀 입장 사용 시
        stanceOptions = ["pro", "con", ...additionalStances.map((s) => s.id)];
        stanceLabels = {
          pro: stanceA.trim(),
          con: stanceB.trim(),
          ...additionalStances.reduce((acc, s) => {
            acc[s.id] = s.label.trim() || "중립";
            return acc;
          }, {} as Record<string, string>),
        };
        // neutral은 항상 포함
        if (!stanceOptions.includes("neutral")) {
          stanceOptions.push("neutral");
        }
        stanceLabels.neutral = "중립";
      } else {
        // 기본 입장 사용 시
        stanceOptions = ["pro", "con", "neutral"];
        stanceLabels = { pro: "찬성", con: "반대", neutral: "중립" };
      }

      const response = await fetch("/api/discussion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          settings: {
            anonymous,
            stanceOptions,
            stanceLabels,
            aiContext: aiContext.trim() || null,
            aiMode,
            maxTurns: estimatedTurns,
            duration,
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

            {/* AI Mode Selection */}
            <div className="space-y-3">
              <Label>AI 모드 *</Label>
              <RadioGroup value={aiMode} onValueChange={(value) => setAiMode(value as AIMode)}>
                <div className="flex items-start space-x-3 p-4 rounded-lg border bg-muted/30">
                  <RadioGroupItem value="socratic" id="socratic" className="mt-1" />
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="socratic" className="font-medium cursor-pointer">
                      소크라테스 모드
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      AI가 바로 답을 주지 않고 질문으로 사고를 깊이 있게 파고듭니다.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-4 rounded-lg border bg-muted/30">
                  <RadioGroupItem value="debate" id="debate" className="mt-1" />
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="debate" className="font-medium cursor-pointer">
                      토론 모드
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      AI가 반대편 논리를 강하게 제시하여 학생의 주장을 검증합니다.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Custom Stance Options */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div className="space-y-0.5">
                  <Label className="font-medium">커스텀 입장 옵션</Label>
                  <p className="text-xs text-muted-foreground">
                    기본 &quot;찬성/반대&quot; 대신 직접 입장 이름을 설정합니다
                  </p>
                </div>
                <Switch checked={useCustomStances} onCheckedChange={setUseCustomStances} />
              </div>
              {useCustomStances && (
                <div className="space-y-3 pl-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="stanceA">입장 A</Label>
                      <Input
                        id="stanceA"
                        placeholder="예: 기술 낙관론"
                        value={stanceA}
                        onChange={(e) => setStanceA(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stanceB">입장 B</Label>
                      <Input
                        id="stanceB"
                        placeholder="예: 기술 비관론"
                        value={stanceB}
                        onChange={(e) => setStanceB(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  {/* 추가 입장들 */}
                  {additionalStances.map((stance, index) => {
                    const stanceLetter = String.fromCharCode(67 + index); // C, D, E, ...
                    return (
                      <div key={stance.id} className="flex items-end gap-2">
                        <div className="flex-1 space-y-2">
                          <Label htmlFor={stance.id}>입장 {stanceLetter}</Label>
                          <Input
                            id={stance.id}
                            placeholder="예: 중립"
                            value={stance.label}
                            onChange={(e) => updateAdditionalStance(stance.id, e.target.value)}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAdditionalStance(stance.id)}
                          className="mb-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                  
                  {/* 입장 추가 버튼 */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAdditionalStance}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    입장 추가
                  </Button>
                </div>
              )}
            </div>

            {/* Discussion Duration */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label>예상 토론 시간</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      이 시간은 절대적인 토론 시간이 아닙니다. 설정한 시간을 기반으로 학생이 AI와 대화하는 문답 횟수가 결정됩니다. 문답 횟수에 도달하면 AI가 마무리 질문을 제시합니다.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground min-w-[60px]">
                    {duration}분
                  </span>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="5"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[10, 15, 20, 30, 45].map((time) => (
                    <Button
                      key={time}
                      type="button"
                      variant={duration === time ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDuration(time)}
                      className="text-xs"
                    >
                      {time}분
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  예상 문답 횟수: <span className="font-medium text-foreground">{estimatedTurns}회</span>
                </p>
              </div>
            </div>

            {/* Anonymous Mode */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
              <div className="space-y-0.5">
                <Label className="font-medium">익명 모드</Label>
                <p className="text-xs text-muted-foreground">
                  학생들의 실명을 숨기고 &quot;Student 1&quot;, &quot;Student 2&quot; 등으로 표시합니다
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
