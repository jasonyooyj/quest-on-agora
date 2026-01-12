import { Badge } from "@/components/ui/badge";
import { CheckCircle, FileText } from "lucide-react";
import type { DiscussionParticipant } from "@/types/discussion";

interface StudentStanceSummaryProps {
    participant: DiscussionParticipant;
}

export function StudentStanceSummary({ participant }: StudentStanceSummaryProps) {
    if (!participant.isSubmitted) return null;

    return (
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
    );
}
