"use client";

import { useState } from "react";
import { User } from "lucide-react";
import {
  useParticipantMessages,
  useInstructorNote,
  useSendIntervention,
} from "@/hooks/useDiscussion";
import { InterventionDialog } from "./InterventionDialog";
import type { DiscussionParticipant, PinnedQuote, InterventionType } from "@/types/discussion";
import { INTERVENTION_TEMPLATES } from "@/types/discussion";
import { toast } from "sonner";
import { StudentDetailHeader } from "./detail/StudentDetailHeader";
import { StudentStanceSummary } from "./detail/StudentStanceSummary";
import { StudentInterventionActions } from "./detail/StudentInterventionActions";
import { StudentChatTranscript } from "./detail/StudentChatTranscript";
import { StudentChatInput } from "./detail/StudentChatInput";

interface StudentDetailPanelProps {
  sessionId: string;
  participant: DiscussionParticipant | null;
  isAnonymous: boolean;
  onPinQuote: (quote: Omit<PinnedQuote, "id" | "pinnedAt" | "sortOrder">) => void;
}

export function StudentDetailPanel({
  sessionId,
  participant,
  isAnonymous,
  onPinQuote,
}: StudentDetailPanelProps) {
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [chatMessage, setChatMessage] = useState("");

  const { data: messages = [], isLoading: messagesLoading } =
    useParticipantMessages(sessionId, participant?.id || null);

  const {
    data: instructorNote,
    saveNote,
  } = useInstructorNote(participant?.id || null);

  const sendIntervention = useSendIntervention(sessionId);
  const [noteText, setNoteText] = useState("");

  const handleNoteDialogChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setNoteText(instructorNote?.note ?? "");
    }
    setShowNoteDialog(nextOpen);
  };

  const handlePinMessage = (content: string) => {
    if (!participant) return;
    const displayName = isAnonymous
      ? participant.displayName || `Student ${participant.id.slice(0, 4)}`
      : participant.realName || participant.displayName;

    onPinQuote({
      sessionId,
      participantId: participant.id,
      content,
      displayName,
    });
  };

  const handleTemplateClick = (type: InterventionType) => {
    const templates = INTERVENTION_TEMPLATES.filter((t) => t.type === type);
    if (templates.length > 0) {
      // 첫 번째 템플릿의 메시지를 입력창에 자동 입력
      // 기존 메시지가 있으면 덮어쓰기
      setChatMessage(templates[0].prompt);
    }
  };

  const handleSendMessage = async () => {
    if (!participant || !chatMessage.trim()) return;

    try {
      await sendIntervention.mutateAsync({
        participantId: participant.id,
        content: chatMessage.trim(),
        messageType: "custom",
        isVisibleToStudent: true,
      });
      setChatMessage("");
      toast.success("메시지가 전송되었습니다");
    } catch {
      toast.error("메시지 전송에 실패했습니다");
    }
  };

  // Empty state
  if (!participant) {
    return (
      <div className="h-full flex items-center justify-center text-center p-8">
        <div className="text-muted-foreground">
          <User className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">학생을 선택하세요</p>
          <p className="text-sm mt-1">왼쪽 목록에서 학생을 클릭하면 상세 정보가 표시됩니다</p>
        </div>
      </div>
    );
  }

  const getDisplayName = () => {
    if (isAnonymous) {
      return (
        participant.displayName || `Student ${participant.id.slice(0, 4)}`
      );
    }
    return (
      participant.realName ||
      participant.displayName ||
      `Student ${participant.id.slice(0, 4)}`
    );
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <StudentDetailHeader
        participant={participant}
        isAnonymous={isAnonymous}
      />

      <StudentStanceSummary participant={participant} />

      <StudentInterventionActions
        onOpenNote={() => handleNoteDialogChange(true)}
        onTemplateClick={handleTemplateClick}
      />

      <StudentChatTranscript
        messages={messages}
        loading={messagesLoading}
        onPinMessage={handlePinMessage}
      />

      <StudentChatInput
        value={chatMessage}
        onChange={setChatMessage}
        onSend={handleSendMessage}
        loading={sendIntervention.isPending}
        participant={participant}
      />

      {/* Instructor Note Dialog */}
      <InterventionDialog
        open={showNoteDialog}
        onOpenChange={handleNoteDialogChange}
        sessionId={sessionId}
        participantId={participant.id}
        participantName={getDisplayName()}
        initialType="custom"
        isNoteMode={true}
        noteText={noteText}
        onNoteChange={setNoteText}
        onSaveNote={() => {
          if (noteText.trim()) {
            saveNote.mutate(noteText.trim());
          }
        }}
        isSaving={saveNote.isPending}
      />
    </div>
  );
}
