import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import type { DiscussionParticipant } from "@/types/discussion";

interface StudentChatInputProps {
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    loading: boolean;
    participant: DiscussionParticipant | null;
}

export function StudentChatInput({
    value,
    onChange,
    onSend,
    loading,
    participant,
}: StudentChatInputProps) {
    return (
        <div className="p-4 border-t shrink-0 bg-background">
            <div className="flex gap-2">
                <Textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="학생에게 메시지를 입력하세요..."
                    className="min-h-[60px] text-sm resize-none"
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            onSend();
                        }
                    }}
                />
                <Button
                    size="icon"
                    variant="default"
                    onClick={onSend}
                    disabled={loading || !value.trim() || !participant}
                    className="shrink-0"
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Send className="w-4 h-4" />
                    )}
                </Button>
            </div>
        </div>
    );
}
