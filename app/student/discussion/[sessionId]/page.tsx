"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState, use, useRef, useCallback } from "react";
import {
  Loader2,
  MessageCircle,
  CheckCircle2,
  ArrowUp,
  HelpCircle,
  Send,
  Edit3,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useDiscussionSession,
  useParticipantMessages,
} from "@/hooks/useDiscussion";
import type { DiscussionMessage } from "@/types/discussion";
import AIMessageRenderer from "@/components/chat/AIMessageRenderer";
import { ChatLoadingIndicator } from "@/components/exam/ExamLoading";

export default function StudentDiscussionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const resolvedParams = use(params);
  const sessionId = resolvedParams.sessionId;
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const queryClient = useQueryClient();

  const [chatMessage, setChatMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    stance: "pro" | "con" | "neutral";
    stanceStatement: string;
    evidence: string[];
  } | null>(null);
  const [editedSummary, setEditedSummary] = useState<{
    stance: "pro" | "con" | "neutral";
    stanceStatement: string;
    evidence: string[];
  } | null>(null);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const hasInitializedRef = useRef(false);

  // Fetch session data
  const { data: session, isLoading: sessionLoading } =
    useDiscussionSession(sessionId);

  // Fetch participant data (current student)
  const { data: participant, isLoading: participantLoading } = useQuery({
    queryKey: ["discussion-participant", sessionId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const response = await fetch(
        `/api/discussion/${sessionId}/participants?studentId=${user.id}`
      );
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error("Failed to fetch participant");
      }
      const data = await response.json();
      return data.participant;
    },
    enabled: !!sessionId && !!user?.id && !!session,
  });

  // Fetch messages for this participant
  const { data: messages = [] } = useParticipantMessages(
    sessionId,
    participant?.id || null
  );

  // Toggle help request
  const toggleHelpRequest = useMutation({
    mutationFn: async (needsHelp: boolean) => {
      if (!participant?.id) throw new Error("Not a participant");
      const response = await fetch(
        `/api/discussion/${sessionId}/participants/${participant.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ needsHelp }),
        }
      );
      if (!response.ok) throw new Error("Failed to update help request");
      return response.json();
    },
    onSuccess: (_, needsHelp) => {
      toast.success(
        needsHelp ? "도움 요청이 전송되었습니다" : "도움 요청이 취소되었습니다"
      );
      queryClient.invalidateQueries({
        queryKey: ["discussion-participant", sessionId, user?.id],
      });
    },
    onError: () => {
      toast.error("도움 요청 업데이트에 실패했습니다");
    },
  });

  // Scroll to bottom of chat
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  // Send AI initial message when chat is empty
  const sendInitialMessage = useMutation({
    mutationFn: async () => {
      if (!participant?.id) throw new Error("Not a participant");
      const response = await fetch(
        `/api/discussion/${sessionId}/messages/initial`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participantId: participant.id }),
        }
      );
      if (!response.ok) throw new Error("Failed to send initial message");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["discussion-messages", sessionId, participant?.id],
      });
      scrollToBottom();
    },
  });

  // Send chat message
  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      if (!participant?.id) throw new Error("Not a participant");
      const response = await fetch(`/api/discussion/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: participant.id,
          content: message,
          role: "user",
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to send message");
      }
      return response.json();
    },
    onMutate: async (message: string) => {
      await queryClient.cancelQueries({
        queryKey: ["discussion-messages", sessionId, participant?.id],
      });

      const previousMessages = queryClient.getQueryData<DiscussionMessage[]>([
        "discussion-messages",
        sessionId,
        participant?.id,
      ]);

      const optimisticMessage: DiscussionMessage = {
        id: `temp-${Date.now()}`,
        sessionId,
        participantId: participant?.id || "",
        role: "user",
        content: message,
        createdAt: new Date().toISOString(),
        isVisibleToStudent: true,
      };

      queryClient.setQueryData<DiscussionMessage[]>(
        ["discussion-messages", sessionId, participant?.id],
        (old) => [...(old || []), optimisticMessage]
      );

      setIsTyping(true);
      scrollToBottom();

      return { previousMessages };
    },
    onSuccess: () => {
      setChatMessage("");
      queryClient.invalidateQueries({
        queryKey: ["discussion-messages", sessionId, participant?.id],
      });

      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      let pollCount = 0;
      const maxPolls = 40;
      pollingIntervalRef.current = setInterval(async () => {
        pollCount++;
        console.log(
          `[Client] Polling for AI response (attempt ${pollCount}/${maxPolls})`
        );

        try {
          await queryClient.invalidateQueries({
            queryKey: ["discussion-messages", sessionId, participant?.id],
          });

          const messages = queryClient.getQueryData<DiscussionMessage[]>([
            "discussion-messages",
            sessionId,
            participant?.id,
          ]);

          if (messages && messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.role === "ai") {
              console.log(`[Client] AI response received!`);
              setIsTyping(false);
              scrollToBottom();
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              return;
            }
          }

          if (pollCount >= maxPolls) {
            console.warn(
              `[Client] Polling timeout - AI response may not have been generated`
            );
            setIsTyping(false);
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          }
        } catch (error) {
          console.error(`[Client] Error polling for AI response:`, error);
          setIsTyping(false);
          if (pollCount >= maxPolls && pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      }, 500);
    },
    onError: (error: Error, _variables, context) => {
      console.error("[Client] Error sending message:", error);
      setIsTyping(false);
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["discussion-messages", sessionId, participant?.id],
          context.previousMessages
        );
      }
      toast.error(error.message || "메시지 전송에 실패했습니다");
    },
  });

  // Generate summary
  const generateSummary = useMutation({
    mutationFn: async () => {
      if (!participant?.id) throw new Error("Not a participant");
      const response = await fetch(`/api/discussion/${sessionId}/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: participant.id }),
      });
      if (!response.ok) throw new Error("Failed to generate summary");
      return response.json();
    },
    onSuccess: (data) => {
      setSummaryData(data.summary);
      setEditedSummary(data.summary);
      setIsGeneratingSummary(false);
    },
    onError: (error) => {
      console.error("Error generating summary:", error);
      toast.error("요약 생성에 실패했습니다");
      setIsGeneratingSummary(false);
    },
  });

  // Submit final summary
  const submitSummary = useMutation({
    mutationFn: async () => {
      if (!participant?.id || !editedSummary)
        throw new Error("Missing data");
      const response = await fetch(
        `/api/discussion/${sessionId}/participants/${participant.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stance: editedSummary.stance,
            stanceStatement: editedSummary.stanceStatement,
            evidence: editedSummary.evidence.filter((e) => e.trim() !== ""),
            isSubmitted: true,
          }),
        }
      );
      if (!response.ok) throw new Error("Failed to submit");
      return response.json();
    },
    onSuccess: () => {
      toast.success("토론 내용이 제출되었습니다");
      setShowSummaryDialog(false);
      queryClient.invalidateQueries({
        queryKey: ["discussion-participant", sessionId, user?.id],
      });
    },
    onError: () => {
      toast.error("제출에 실패했습니다");
    },
  });

  // Send initial AI message when participant is ready and no messages exist
  useEffect(() => {
    if (
      participant?.id &&
      !participant.isSubmitted &&
      messages.length === 0 &&
      !hasInitializedRef.current &&
      !sendInitialMessage.isPending
    ) {
      hasInitializedRef.current = true;
      sendInitialMessage.mutate();
    }
  }, [participant, messages.length, sendInitialMessage]);

  // Redirect if not loaded or not signed in
  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/sign-in");
    }
  }, [isLoaded, user, router]);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  // Handle finish discussion button
  const handleFinishDiscussion = () => {
    setShowSummaryDialog(true);
    setIsGeneratingSummary(true);
    generateSummary.mutate();
  };

  if (!isLoaded || sessionLoading || participantLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-red-600 mb-2">오류 발생</h2>
          <p className="text-muted-foreground mb-4">
            토론 세션을 찾을 수 없습니다.
          </p>
          <Button variant="outline" onClick={() => router.push("/student")}>
            대시보드로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const isSubmitted = participant?.isSubmitted || false;
  const settings = session.settings as {
    stanceLabels?: Record<string, string>;
    maxTurns?: number;
  };
  const stanceLabels = settings?.stanceLabels || {
    pro: "찬성",
    con: "반대",
    neutral: "중립",
  };
  
  // Get maxTurns from settings (default: 5)
  const maxTurns = settings?.maxTurns || 5;
  
  // Count user messages (학생이 보낸 메시지 수)
  const userMessageCount = messages.filter((m) => m.role === "user").length;
  
  // Enable finish button when user has completed at least the required turns
  // Allow finishing early (after at least 2 turns) but recommend completing all turns
  const minTurnsRequired = Math.min(2, maxTurns);
  const canFinish = userMessageCount >= minTurnsRequired;
  const turnsRemaining = Math.max(0, maxTurns - userMessageCount);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur-sm px-4 sm:px-6 py-4">
        <div className="container max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl sm:text-2xl font-bold">{session.title}</h1>
            <div className="flex items-center gap-2">
              {participant && !isSubmitted && (
                <Button
                  variant={participant.needsHelp ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => toggleHelpRequest.mutate(!participant.needsHelp)}
                  disabled={toggleHelpRequest.isPending}
                  className="gap-2"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {participant.needsHelp ? "도움 요청 취소" : "도움 요청"}
                  </span>
                </Button>
              )}
              {isSubmitted && (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  제출 완료
                </Badge>
              )}
            </div>
          </div>
          {session.description && (
            <p className="text-sm text-muted-foreground">{session.description}</p>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="container max-w-4xl mx-auto flex-1 flex flex-col overflow-hidden">
          {/* Chat Header */}
          <div className="px-4 sm:px-6 py-3 border-b border-border">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold bg-primary/10 text-primary border border-primary/20">
              <MessageCircle className="w-4 h-4" aria-hidden="true" />
              <span>AI와 토론하기</span>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto hide-scrollbar p-4 sm:p-6 pb-28 sm:pb-32 space-y-4 sm:space-y-6 min-h-0">
            {messages.length === 0 && !sendInitialMessage.isPending ? (
              <div className="flex flex-col items-center justify-center h-full text-center my-auto px-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-sm">
                  <MessageCircle
                    className="w-8 h-8 sm:w-10 sm:h-10 text-primary"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                  대화를 준비하고 있습니다
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground max-w-md leading-relaxed">
                  잠시만 기다려주세요...
                </p>
              </div>
            ) : (
              <>
                {messages.map((msg: DiscussionMessage) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    } animate-in fade-in slide-in-from-bottom-2 duration-300`}
                  >
                    {msg.role === "user" ? (
                      <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 sm:px-5 py-3 sm:py-3.5 max-w-[85%] sm:max-w-[70%] shadow-lg shadow-primary/20 relative transition-all duration-200 hover:shadow-xl hover:shadow-primary/30">
                        <p className="text-sm leading-[1.5] whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                        <p className="text-xs mt-2 sm:mt-2.5 opacity-80 text-right font-medium">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    ) : msg.role === "instructor" ? (
                      <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-800 rounded-2xl rounded-tl-md px-4 sm:px-5 py-3 sm:py-3.5 max-w-[85%] sm:max-w-[70%] shadow-lg relative transition-all duration-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            variant="outline"
                            className="bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700 text-xs font-semibold"
                          >
                            교수 메시지
                          </Badge>
                        </div>
                        <p className="text-sm leading-[1.5] whitespace-pre-wrap break-words text-amber-900 dark:text-amber-100">
                          {msg.content}
                        </p>
                        <p className="text-xs mt-2 sm:mt-2.5 opacity-70 text-left font-medium text-amber-700 dark:text-amber-300">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    ) : (
                      <AIMessageRenderer
                        content={msg.content}
                        timestamp={msg.createdAt}
                      />
                    )}
                  </div>
                ))}

                {/* Typing Indicator */}
                <div className="flex justify-start">
                  <ChatLoadingIndicator isTyping={isTyping} />
                </div>
              </>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          {!isSubmitted && (
            <div className="sticky bottom-0 z-20 bg-background/95 backdrop-blur-sm border-t border-border p-2 sm:p-3">
              <div className="flex items-center gap-2 mb-2">
                <Button
                  variant={turnsRemaining <= 0 ? "default" : "outline"}
                  size="sm"
                  onClick={handleFinishDiscussion}
                  disabled={!canFinish}
                  className="gap-2"
                >
                  <FileText className="w-4 h-4" />
                  토론 마무리하기
                </Button>
                <span className="text-xs text-muted-foreground">
                  {!canFinish ? (
                    `(${minTurnsRequired - userMessageCount}회 더 대화 후 마무리 가능)`
                  ) : turnsRemaining > 0 ? (
                    `(${userMessageCount}/${maxTurns}회 진행, ${turnsRemaining}회 남음)`
                  ) : (
                    `✓ ${maxTurns}회 완료 · 더 대화하거나 마무리하세요`
                  )}
                </span>
              </div>
              <InputGroup className="bg-background shadow-md">
                <InputGroupTextarea
                  placeholder="메시지를 입력하세요..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !e.shiftKey &&
                      !sendMessage.isPending
                    ) {
                      e.preventDefault();
                      if (chatMessage.trim()) {
                        sendMessage.mutate(chatMessage.trim());
                      }
                    }
                  }}
                  disabled={sendMessage.isPending || !participant}
                  className="min-h-[40px] sm:min-h-[44px] text-sm resize-none"
                  aria-label="메시지 입력"
                  rows={1}
                />
                <InputGroupAddon align="block-end">
                  <InputGroupText className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5 px-2">
                    <span className="hidden sm:flex items-center gap-1">
                      <Kbd>Enter</Kbd>
                      <span>전송</span>
                    </span>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:flex items-center gap-1">
                      <KbdGroup>
                        <Kbd>Shift</Kbd>
                        <span>+</span>
                        <Kbd>Enter</Kbd>
                      </KbdGroup>
                      <span>줄바꿈</span>
                    </span>
                  </InputGroupText>
                  <InputGroupText className="ml-auto text-xs text-muted-foreground px-2">
                    {chatMessage.length}자
                  </InputGroupText>
                  <Separator orientation="vertical" className="!h-5 sm:!h-6" />
                  <InputGroupButton
                    variant="default"
                    className="rounded-full min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px]"
                    size="icon-xs"
                    onClick={() => {
                      if (chatMessage.trim() && !sendMessage.isPending) {
                        sendMessage.mutate(chatMessage.trim());
                      }
                    }}
                    disabled={
                      sendMessage.isPending ||
                      !chatMessage.trim() ||
                      !participant
                    }
                    aria-label="메시지 전송"
                  >
                    <ArrowUp className="w-4 h-4" aria-hidden="true" />
                    <span className="sr-only">전송</span>
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </div>
          )}

          {/* Submitted State */}
          {isSubmitted && (
            <div className="sticky bottom-0 z-20 bg-background/95 backdrop-blur-sm border-t border-border p-4">
              <div className="text-center text-muted-foreground">
                <CheckCircle2 className="w-5 h-5 inline-block mr-2 text-green-600" />
                토론이 완료되었습니다. 제출된 내용은 강사에게 전달됩니다.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Dialog */}
      <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              토론 내용 정리
            </DialogTitle>
            <DialogDescription>
              AI가 대화 내용을 분석하여 정리했습니다. 내용을 확인하고 수정한 후
              제출하세요.
            </DialogDescription>
          </DialogHeader>

          {isGeneratingSummary ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                대화 내용을 분석하고 있습니다...
              </p>
            </div>
          ) : editedSummary ? (
            <div className="space-y-6">
              {/* Stance Selection */}
              <div className="space-y-2">
                <Label>최종 입장</Label>
                <Select
                  value={editedSummary.stance}
                  onValueChange={(v) =>
                    setEditedSummary({
                      ...editedSummary,
                      stance: v as "pro" | "con" | "neutral",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pro">
                      {stanceLabels.pro || "찬성"}
                    </SelectItem>
                    <SelectItem value="con">
                      {stanceLabels.con || "반대"}
                    </SelectItem>
                    <SelectItem value="neutral">
                      {stanceLabels.neutral || "중립"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Stance Statement */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  입장 진술
                  <Badge variant="outline" className="text-xs">
                    <Edit3 className="w-3 h-3 mr-1" />
                    수정 가능
                  </Badge>
                </Label>
                <Textarea
                  value={editedSummary.stanceStatement}
                  onChange={(e) =>
                    setEditedSummary({
                      ...editedSummary,
                      stanceStatement: e.target.value,
                    })
                  }
                  rows={4}
                  placeholder="입장 진술을 입력하세요..."
                />
              </div>

              {/* Evidence */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  근거
                  <Badge variant="outline" className="text-xs">
                    <Edit3 className="w-3 h-3 mr-1" />
                    수정 가능
                  </Badge>
                </Label>
                {editedSummary.evidence.map((ev, idx) => (
                  <div key={idx} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      근거 {idx + 1}
                    </Label>
                    <Textarea
                      value={ev}
                      onChange={(e) => {
                        const newEvidence = [...editedSummary.evidence];
                        newEvidence[idx] = e.target.value;
                        setEditedSummary({
                          ...editedSummary,
                          evidence: newEvidence,
                        });
                      }}
                      rows={2}
                      placeholder={`근거 ${idx + 1}을 입력하세요...`}
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEditedSummary({
                      ...editedSummary,
                      evidence: [...editedSummary.evidence, ""],
                    })
                  }
                >
                  근거 추가
                </Button>
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowSummaryDialog(false)}
            >
              취소
            </Button>
            <Button
              onClick={() => submitSummary.mutate()}
              disabled={
                submitSummary.isPending ||
                !editedSummary?.stanceStatement.trim()
              }
            >
              {submitSummary.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  제출 중...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  제출하기
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
