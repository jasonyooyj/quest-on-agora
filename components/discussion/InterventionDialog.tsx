"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Lightbulb, FileQuestion, Scale, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useSendIntervention } from "@/hooks/useDiscussion";
import { INTERVENTION_TEMPLATES, type InterventionType } from "@/types/discussion";

interface InterventionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  participantId: string;
  participantName: string;
  initialType?: InterventionType;
  isNoteMode?: boolean;
  noteText?: string;
  onNoteChange?: (text: string) => void;
  onSaveNote?: () => void;
  isSaving?: boolean;
}

export function InterventionDialog({
  open,
  onOpenChange,
  sessionId,
  participantId,
  participantName,
  initialType = "nudge",
  isNoteMode = false,
  noteText = "",
  onNoteChange,
  onSaveNote,
  isSaving = false,
}: InterventionDialogProps) {
  const [interventionType, setInterventionType] = useState<InterventionType>(initialType);
  const [content, setContent] = useState("");
  const [isVisibleToStudent, setIsVisibleToStudent] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && !isNoteMode) {
      setInterventionType(initialType);
      setContent("");
      setSelectedTemplateId("");
    }
    onOpenChange(nextOpen);
  };

  const sendIntervention = useSendIntervention(sessionId);

  const filteredTemplates = INTERVENTION_TEMPLATES.filter(
    (t) => t.type === interventionType
  );

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = INTERVENTION_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setContent(template.prompt);
    }
  };

  const handleTypeChange = (type: InterventionType) => {
    setInterventionType(type);
    setSelectedTemplateId("");
    setContent("");
  };

  const handleSend = async () => {
    if (!content.trim()) {
      toast.error("메시지를 입력하세요");
      return;
    }

    try {
      await sendIntervention.mutateAsync({
        participantId,
        content: content.trim(),
        messageType: interventionType,
        isVisibleToStudent,
      });
      toast.success(
        isVisibleToStudent
          ? "학생에게 메시지가 전송되었습니다"
          : "AI에게만 지시가 전달되었습니다"
      );
      handleOpenChange(false);
      // Reset form
      setContent("");
      setSelectedTemplateId("");
    } catch {
      toast.error("메시지 전송에 실패했습니다");
    }
  };

  const getTypeIcon = (type: InterventionType) => {
    switch (type) {
      case "nudge":
        return <Lightbulb className="w-4 h-4" />;
      case "evidence_request":
        return <FileQuestion className="w-4 h-4" />;
      case "counterexample":
        return <Scale className="w-4 h-4" />;
      case "custom":
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  // Note mode: Simple textarea for instructor notes
  if (isNoteMode) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>교수 메모</DialogTitle>
            <DialogDescription>
              {participantName} 학생에 대한 개인 메모입니다 (학생에게 보이지 않음)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>메모 내용</Label>
              <Textarea
                value={noteText}
                onChange={(e) => onNoteChange?.(e.target.value)}
                placeholder="이 학생에 대한 메모를 남기세요..."
                className="min-h-[200px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              취소
            </Button>
            <Button
              onClick={() => {
                onSaveNote?.();
                handleOpenChange(false);
              }}
              disabled={isSaving || !noteText.trim()}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : (
                "저장"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>교수 메모</DialogTitle>
          <DialogDescription>
            {participantName} 학생에게 메시지를 보내거나 AI에게 지시를 전달합니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Intervention Type */}
          <div className="space-y-2">
            <Label>개입 유형</Label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { type: "nudge", label: "격려/힌트" },
                  { type: "evidence_request", label: "근거 요청" },
                  { type: "counterexample", label: "반례 질문" },
                  { type: "custom", label: "직접 입력" },
                ] as const
              ).map(({ type, label }) => (
                <Button
                  key={type}
                  variant={interventionType === type ? "default" : "outline"}
                  className="justify-start gap-2"
                  onClick={() => handleTypeChange(type)}
                >
                  {getTypeIcon(type)}
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Template Selection (except custom) */}
          {interventionType !== "custom" && filteredTemplates.length > 0 && (
            <div className="space-y-2">
              <Label>템플릿 선택</Label>
              <Select
                value={selectedTemplateId}
                onValueChange={handleTemplateSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="템플릿을 선택하세요..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Message Content */}
          <div className="space-y-2">
            <Label>메시지 내용</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="학생에게 보낼 메시지를 입력하세요..."
              className="min-h-[120px]"
            />
          </div>

          {/* Visibility Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div className="space-y-0.5">
              <Label className="font-medium">학생에게 직접 표시</Label>
              <p className="text-xs text-muted-foreground">
                {isVisibleToStudent
                  ? "학생 화면에 교수 메시지로 표시됩니다"
                  : "AI에게만 전달되어 AI가 자연스럽게 질문합니다"}
              </p>
            </div>
            <Switch
              checked={isVisibleToStudent}
              onCheckedChange={setIsVisibleToStudent}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={handleSend}
            disabled={sendIntervention.isPending || !content.trim()}
          >
            {sendIntervention.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                전송 중...
              </>
            ) : (
              "전송"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
