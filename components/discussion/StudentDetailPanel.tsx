"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertTriangle,
  ArrowDown,
  CheckCircle,
  FileText,
  Lightbulb,
  Loader2,
  MessageSquare,
  Pin,
  Send,
  User,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import {
  useParticipantMessages,
  useInstructorNote,
} from "@/hooks/useDiscussion";
import { InterventionDialog } from "./InterventionDialog";
import AIMessageRenderer from "@/components/chat/AIMessageRenderer";
import type { DiscussionParticipant, PinnedQuote } from "@/types/discussion";

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
  const [showIntervention, setShowIntervention] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading: messagesLoading } =
    useParticipantMessages(sessionId, participant?.id || null);
  const {
    data: instructorNote,
    saveNote,
    isLoading: noteLoading,
  } = useInstructorNote(participant?.id || null);

  const [noteText, setNoteText] = useState("");

  // Sync note text with loaded data
  useEffect(() => {
    if (instructorNote) {
      setNoteText(instructorNote.note);
    } else {
      setNoteText("");
    }
  }, [instructorNote]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  const handleSaveNote = () => {
    if (noteText.trim()) {
      saveNote.mutate(noteText.trim());
    }
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

  const getStanceBadge = () => {
    if (!participant.isSubmitted) {
      return (
        <Badge variant="outline" className="text-muted-foreground">
          미제출
        </Badge>
      );
    }

    switch (participant.stance) {
      case "pro":
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
            찬성
          </Badge>
        );
      case "con":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            반대
          </Badge>
        );
      case "neutral":
        return (
          <Badge className="bg-slate-100 text-slate-700 border-slate-200">
            중립
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header Card */}
      <div className="p-4 border-b shrink-0">
        <div className="flex items-start gap-3">
          <div className="relative">
            <Avatar className="h-12 w-12 border">
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {getDisplayName().slice(-2)}
              </AvatarFallback>
            </Avatar>
            {participant.isOnline && (
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-background rounded-full" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold truncate">{getDisplayName()}</span>
              {getStanceBadge()}
              {participant.isOnline && (
                <span className="text-xs text-green-600">온라인</span>
              )}
            </div>
            {!isAnonymous && participant.studentNumber && (
              <div className="text-xs text-muted-foreground">
                {participant.studentNumber}
                {participant.school && ` · ${participant.school}`}
              </div>
            )}
            <div className="text-xs text-muted-foreground mt-0.5">
              마지막 활동:{" "}
              {formatDistanceToNow(new Date(participant.lastActiveAt), {
                addSuffix: true,
                locale: ko,
              })}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-3 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8"
            onClick={() => setShowIntervention(true)}
          >
            <Lightbulb className="w-3.5 h-3.5 mr-1" />
            개입
          </Button>
          {participant.needsHelp && (
            <Badge
              variant="outline"
              className="bg-amber-50 text-amber-700 border-amber-200"
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              도움 요청
            </Badge>
          )}
        </div>
      </div>

      {/* Stance Summary Card */}
      {participant.isSubmitted && (
        <div className="p-4 border-b shrink-0">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="w-4 h-4" />
              최종 입장
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
            </div>
            {participant.stanceStatement && (
              <p className="text-sm bg-muted/50 p-3 rounded-lg">
                {participant.stanceStatement}
              </p>
            )}
            {((participant.evidence && participant.evidence.length > 0) ||
              participant.evidence1 ||
              participant.evidence2) && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground font-medium">
                  근거
                </div>
                {/* New format: array */}
                {participant.evidence &&
                  participant.evidence.map((ev, index) => (
                    <div
                      key={index}
                      className="text-xs p-2 rounded bg-muted/30 border-l-2 border-primary/50"
                    >
                      {ev}
                    </div>
                  ))}
                {/* Legacy format: fallback */}
                {(!participant.evidence ||
                  participant.evidence.length === 0) && (
                  <>
                    {participant.evidence1 && (
                      <div className="text-xs p-2 rounded bg-muted/30 border-l-2 border-primary/50">
                        {participant.evidence1}
                      </div>
                    )}
                    {participant.evidence2 && (
                      <div className="text-xs p-2 rounded bg-muted/30 border-l-2 border-primary/50">
                        {participant.evidence2}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat Transcript */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MessageSquare className="w-4 h-4" />
            대화 기록 ({messages.length})
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              setAutoScroll(true);
              if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop =
                  chatContainerRef.current.scrollHeight;
              }
            }}
          >
            <ArrowDown className="w-3 h-3 mr-1" />
            최신
          </Button>
        </div>

        <div
          ref={chatContainerRef}
          className="flex-1 overflow-auto p-4 space-y-3"
          onScroll={(e) => {
            const target = e.currentTarget;
            const isAtBottom =
              target.scrollHeight - target.scrollTop - target.clientHeight < 50;
            if (isAtBottom !== autoScroll) {
              setAutoScroll(isAtBottom);
            }
          }}
        >
          {messagesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              아직 대화가 없습니다
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`group flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "ai" ? (
                  <AIMessageRenderer
                    content={message.content}
                    timestamp={message.createdAt}
                  />
                ) : (
                  <div
                    className={`max-w-[85%] rounded-lg p-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : message.role === "instructor"
                        ? "bg-amber-50 border border-amber-200"
                        : "bg-blue-50 border border-blue-200"
                    }`}
                  >
                    {message.role === "instructor" && (
                      <div className="text-[10px] text-amber-600 mb-1 font-medium">
                        교수 메시지
                      </div>
                    )}
                    {message.role === "system" && (
                      <div className="text-[10px] text-blue-600 mb-1 font-medium">
                        시스템
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                    <div
                      className={`text-[10px] mt-1.5 flex items-center justify-between gap-2 ${
                        message.role === "user"
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      <span>
                        {formatDistanceToNow(new Date(message.createdAt), {
                          addSuffix: true,
                          locale: ko,
                        })}
                      </span>
                      {message.role === "user" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handlePinMessage(message.content)}
                        >
                          <Pin className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Instructor Note */}
      <div className="p-4 border-t shrink-0">
        <div className="text-xs font-medium text-muted-foreground mb-2">
          교수 메모 (학생에게 보이지 않음)
        </div>
        <div className="flex gap-2">
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="이 학생에 대한 메모를 남기세요..."
            className="min-h-[60px] text-sm resize-none"
          />
          <Button
            size="icon"
            variant="outline"
            onClick={handleSaveNote}
            disabled={saveNote.isPending || !noteText.trim()}
            className="shrink-0"
          >
            {saveNote.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Intervention Dialog */}
      {participant && (
        <InterventionDialog
          open={showIntervention}
          onOpenChange={setShowIntervention}
          sessionId={sessionId}
          participantId={participant.id}
          participantName={getDisplayName()}
        />
      )}
    </div>
  );
}
