"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, use, useRef, useCallback } from "react";
import { Loader2, MessageSquare, Users, CheckCircle2, Plus, X, ArrowUp, MessageCircle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useDiscussionSession,
  useParticipantMessages,
  useGlobalMessageFeed,
} from "@/hooks/useDiscussion";
import type { DiscussionMessage } from "@/types/discussion";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
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

  const [stance, setStance] = useState<"pro" | "con" | "neutral" | null>(null);
  const [stanceStatement, setStanceStatement] = useState("");
  const [evidence, setEvidence] = useState<string[]>([""]);
  const [chatMessage, setChatMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch session data
  const { data: session, isLoading: sessionLoading } = useDiscussionSession(
    sessionId
  );

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

  // Submit stance and evidence
  const submitStance = useMutation({
    mutationFn: async () => {
      if (!participant?.id) throw new Error("Not a participant");
      const response = await fetch(
        `/api/discussion/${sessionId}/participants/${participant.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stance,
            stanceStatement,
            evidence: evidence.filter((e) => e.trim() !== ""),
            isSubmitted: true,
          }),
        }
      );
      if (!response.ok) throw new Error("Failed to submit");
      return response.json();
    },
    onSuccess: () => {
      toast.success("입장이 제출되었습니다");
      queryClient.invalidateQueries({
        queryKey: ["discussion-participant", sessionId, user?.id],
      });
    },
    onError: () => {
      toast.error("제출에 실패했습니다");
    },
  });

  // Save evidence (before or after submission)
  const saveEvidence = useMutation({
    mutationFn: async () => {
      if (!participant?.id) throw new Error("Not a participant");
      const response = await fetch(
        `/api/discussion/${sessionId}/participants/${participant.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            evidence: evidence.filter((e) => e.trim() !== ""),
          }),
        }
      );
      if (!response.ok) throw new Error("Failed to save evidence");
      return response.json();
    },
    onSuccess: () => {
      toast.success("근거가 저장되었습니다");
      queryClient.invalidateQueries({
        queryKey: ["discussion-participant", sessionId, user?.id],
      });
    },
    onError: () => {
      toast.error("근거 저장에 실패했습니다");
    },
  });

  // Toggle help request
  const toggleHelpRequest = useMutation({
    mutationFn: async (needsHelp: boolean) => {
      if (!participant?.id) throw new Error("Not a participant");
      const response = await fetch(
        `/api/discussion/${sessionId}/participants/${participant.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            needsHelp,
          }),
        }
      );
      if (!response.ok) throw new Error("Failed to update help request");
      return response.json();
    },
    onSuccess: (_, needsHelp) => {
      toast.success(needsHelp ? "도움 요청이 전송되었습니다" : "도움 요청이 취소되었습니다");
      queryClient.invalidateQueries({
        queryKey: ["discussion-participant", sessionId, user?.id],
      });
    },
    onError: () => {
      toast.error("도움 요청 업데이트에 실패했습니다");
    },
  });

  // Scroll to bottom of chat when message is sent or received
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

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
    onMutate: () => {
      // Set typing indicator immediately when user sends message
      setIsTyping(true);
      scrollToBottom();
    },
    onSuccess: () => {
      setChatMessage("");
      // Immediately invalidate to show user message
      queryClient.invalidateQueries({
        queryKey: ["discussion-messages", sessionId, participant?.id],
      });
      
      // Clear any existing polling interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      // Poll for AI response (AI 응답이 생성될 때까지 주기적으로 확인)
      let pollCount = 0;
      const maxPolls = 40; // 최대 40번 (약 20초)
      pollingIntervalRef.current = setInterval(async () => {
        pollCount++;
        console.log(`[Client] Polling for AI response (attempt ${pollCount}/${maxPolls})`);
        
        try {
          await queryClient.invalidateQueries({
            queryKey: ["discussion-messages", sessionId, participant?.id],
          });
          
          // Check if AI response has arrived
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
            console.warn(`[Client] Polling timeout - AI response may not have been generated`);
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
      }, 500); // 0.5초마다 확인
    },
    onError: (error: Error) => {
      console.error("[Client] Error sending message:", error);
      setIsTyping(false);
      toast.error(error.message || "메시지 전송에 실패했습니다");
    },
  });

  // Initialize participant data when loaded
  useEffect(() => {
    if (participant) {
      if (participant.stance) setStance(participant.stance);
      if (participant.stanceStatement) setStanceStatement(participant.stanceStatement);
      // Load evidence from array or fallback to old format
      if (participant.evidence && Array.isArray(participant.evidence) && participant.evidence.length > 0) {
        setEvidence(participant.evidence);
      } else if (participant.evidence1 || participant.evidence2) {
        // Migrate from old format
        const oldEvidence = [];
        if (participant.evidence1) oldEvidence.push(participant.evidence1);
        if (participant.evidence2) oldEvidence.push(participant.evidence2);
        setEvidence(oldEvidence.length > 0 ? oldEvidence : [""]);
      } else {
        setEvidence([""]);
      }
    }
  }, [participant]);

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
    anonymous?: boolean;
    stanceOptions?: string[];
  };
  const stanceOptions = settings?.stanceOptions || ["pro", "con", "neutral"];

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur-sm px-4 sm:px-6 py-4">
        <div className="container max-w-[1920px] mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold">{session.title}</h1>
            <div className="flex items-center gap-2">
              {participant && (
                <Button
                  variant={participant.needsHelp ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => toggleHelpRequest.mutate(!participant.needsHelp)}
                  disabled={toggleHelpRequest.isPending}
                  className="gap-2"
                >
                  <HelpCircle className="w-4 h-4" />
                  {participant.needsHelp ? "도움 요청 취소" : "도움 요청"}
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
            <p className="text-sm sm:text-base text-muted-foreground">{session.description}</p>
          )}
        </div>
      </div>

      {/* Main Content - Resizable Layout */}
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left: Stance and Evidence Form */}
          <ResizablePanel defaultSize={50} minSize={35} maxSize={65}>
            <div className="bg-background flex flex-col h-full overflow-hidden">
              <div className="p-4 sm:p-6 overflow-y-auto">
                <Card className="border-0 shadow-none">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <MessageSquare className="w-5 h-5" />
                      입장 및 근거 제출
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>입장 선택 *</Label>
                  <Select
                    value={stance || ""}
                    onValueChange={(v) => setStance(v as typeof stance)}
                    disabled={isSubmitted}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="입장을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {stanceOptions.includes("pro") && (
                        <SelectItem value="pro">찬성</SelectItem>
                      )}
                      {stanceOptions.includes("con") && (
                        <SelectItem value="con">반대</SelectItem>
                      )}
                      {stanceOptions.includes("neutral") && (
                        <SelectItem value="neutral">중립</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>입장 진술 *</Label>
                  <Textarea
                    placeholder="당신의 입장을 명확히 진술하세요..."
                    value={stanceStatement}
                    onChange={(e) => setStanceStatement(e.target.value)}
                    disabled={isSubmitted}
                    rows={4}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>근거 {!isSubmitted && "*"}</Label>
                    {!isSubmitted && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEvidence([...evidence, ""])}
                        className="gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        근거 추가
                      </Button>
                    )}
                  </div>
                  {evidence.map((ev, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>근거 {index + 1}</Label>
                        {!isSubmitted && evidence.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newEvidence = evidence.filter((_, i) => i !== index);
                              setEvidence(newEvidence.length > 0 ? newEvidence : [""]);
                            }}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <Textarea
                        placeholder={`${index + 1}번째 근거를 제시하세요...`}
                        value={ev}
                        onChange={(e) => {
                          const newEvidence = [...evidence];
                          newEvidence[index] = e.target.value;
                          setEvidence(newEvidence);
                        }}
                        disabled={isSubmitted}
                        rows={3}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  {!isSubmitted && (
                    <Button
                      className="flex-1"
                      onClick={() => submitStance.mutate()}
                      disabled={
                        !stance ||
                        !stanceStatement.trim() ||
                        evidence.filter((e) => e.trim() !== "").length === 0 ||
                        submitStance.isPending
                      }
                    >
                      {submitStance.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          제출 중...
                        </>
                      ) : (
                        "제출하기"
                      )}
                    </Button>
                  )}
                  <Button
                    className={isSubmitted ? "w-full" : "flex-1"}
                    variant="outline"
                    onClick={() => saveEvidence.mutate()}
                    disabled={saveEvidence.isPending}
                  >
                    {saveEvidence.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      isSubmitted ? "근거 업데이트" : "임시 저장"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
              </div>
            </div>
          </ResizablePanel>

          {/* Resizable Handle */}
          <ResizableHandle withHandle />

          {/* Right: Chat with AI */}
          <ResizablePanel defaultSize={50} minSize={35} maxSize={65}>
            <div className="bg-background flex flex-col h-full relative border-l border-border">
              <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border px-4 sm:px-6 py-3">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold bg-primary/10 text-primary border border-primary/20">
                    <MessageCircle className="w-4 h-4" aria-hidden="true" />
                    <span>AI와 대화하기</span>
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto hide-scrollbar p-4 sm:p-6 pb-28 sm:pb-32 space-y-4 sm:space-y-6 min-h-0">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center my-auto px-4">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-sm">
                        <MessageCircle
                          className="w-8 h-8 sm:w-10 sm:h-10 text-primary"
                          aria-hidden="true"
                        />
                      </div>
                      <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                        AI와 대화를 시작하세요
                      </h3>
                      <p className="text-sm sm:text-base text-muted-foreground max-w-md leading-relaxed">
                        토론 주제에 대해 질문하거나, 입장과 근거에 대해 더 깊이 탐구해보세요.
                      </p>
                    </div>
                  ) : (
                    <>
                      {messages.map((msg: DiscussionMessage) => (
                        <div
                          key={msg.id}
                          className={`flex ${
                            msg.role === "user"
                              ? "justify-end"
                              : "justify-start"
                          } animate-in fade-in slide-in-from-bottom-2 duration-300`}
                        >
                          {msg.role === "user" ? (
                            <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 sm:px-5 py-3 sm:py-3.5 max-w-[85%] sm:max-w-[70%] shadow-lg shadow-primary/20 relative transition-all duration-200 hover:shadow-xl hover:shadow-primary/30">
                              <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">
                                {msg.content}
                              </p>
                              <p className="text-xs mt-2 sm:mt-2.5 opacity-80 text-right font-medium">
                                {new Date(msg.createdAt).toLocaleTimeString(
                                  [],
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </p>
                            </div>
                          ) : msg.role === "instructor" ? (
                            <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-800 rounded-2xl rounded-tl-md px-4 sm:px-5 py-3 sm:py-3.5 max-w-[85%] sm:max-w-[70%] shadow-lg relative transition-all duration-200">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700 text-xs font-semibold">
                                  교수 메시지
                                </Badge>
                              </div>
                              <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words text-amber-900 dark:text-amber-100">
                                {msg.content}
                              </p>
                              <p className="text-xs mt-2 sm:mt-2.5 opacity-70 text-left font-medium text-amber-700 dark:text-amber-300">
                                {new Date(msg.createdAt).toLocaleTimeString(
                                  [],
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
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
              <div className="sticky bottom-0 z-20 bg-background/95 backdrop-blur-sm border-t border-border p-2 sm:p-3">
                  <InputGroup className="bg-background shadow-md">
                    <InputGroupTextarea
                      placeholder="AI에게 질문하기..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !sendMessage.isPending) {
                          e.preventDefault();
                          if (chatMessage.trim()) {
                            sendMessage.mutate(chatMessage.trim());
                          }
                        }
                      }}
                      disabled={sendMessage.isPending || !participant}
                      className="min-h-[40px] sm:min-h-[44px] text-sm resize-none"
                      aria-label="AI에게 질문 입력"
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
                      <Separator
                        orientation="vertical"
                        className="!h-5 sm:!h-6"
                      />
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
                          sendMessage.isPending || !chatMessage.trim() || !participant
                        }
                        aria-label="메시지 전송"
                      >
                        <ArrowUp className="w-4 h-4" aria-hidden="true" />
                        <span className="sr-only">전송</span>
                      </InputGroupButton>
                    </InputGroupAddon>
                </InputGroup>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

