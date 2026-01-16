import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, ArrowDown, Loader2, Pin } from "lucide-react";
import AIMessageRenderer from "@/components/chat/AIMessageRenderer";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import type { DiscussionMessage } from "@/types/discussion";

interface StudentChatTranscriptProps {
    messages: DiscussionMessage[];
    loading: boolean;
    onPinMessage: (content: string) => void;
}

export function StudentChatTranscript({
    messages,
    loading,
    onPinMessage,
}: StudentChatTranscriptProps) {
    const [autoScroll, setAutoScroll] = useState(true);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (autoScroll && chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, autoScroll]);

    return (
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
                            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
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
                {loading ? (
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
                            className={`group flex ${message.role === "user" ? "justify-end" : "justify-start"
                                }`}
                        >
                            {message.role === "ai" ? (
                                <AIMessageRenderer
                                    content={message.content}
                                    timestamp={message.createdAt}
                                />
                            ) : (
                                <div
                                    className={`max-w-[85%] rounded-lg p-3 ${message.role === "user"
                                        ? "bg-primary text-primary-foreground"
                                        : message.role === "instructor"
                                            ? "bg-amber-50 border border-amber-200"
                                            : "bg-blue-50 border border-blue-200"
                                        }`}
                                >
                                    {message.role === "instructor" && (
                                        <div className="text-[10px] text-amber-600 mb-1 font-medium">
                                            강사 메시지
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
                                        className={`text-[10px] mt-1.5 flex items-center justify-between gap-2 ${message.role === "user"
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
                                                onClick={() => onPinMessage(message.content)}
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
    );
}
