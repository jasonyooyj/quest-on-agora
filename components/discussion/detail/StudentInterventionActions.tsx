import { Button } from "@/components/ui/button";
import { StickyNote, Lightbulb, FileQuestion, Scale } from "lucide-react";
import type { InterventionType } from "@/types/discussion";

interface StudentInterventionActionsProps {
    onOpenNote: () => void;
    onTemplateClick: (type: InterventionType) => void;
}

export function StudentInterventionActions({
    onOpenNote,
    onTemplateClick,
}: StudentInterventionActionsProps) {
    return (
        <div className="px-4 py-3 border-b shrink-0 bg-muted/30">
            <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-medium text-muted-foreground">
                    교수 메모
                </div>
                <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7"
                    onClick={onOpenNote}
                >
                    <StickyNote className="w-3.5 h-3.5 mr-1" />
                    메모 남기기
                </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
                {(
                    [
                        { type: "nudge" as const, label: "격려/힌트", icon: Lightbulb },
                        { type: "evidence_request" as const, label: "근거 요청", icon: FileQuestion },
                        { type: "counterexample" as const, label: "반례 질문", icon: Scale },
                    ] as const
                ).map(({ type, label, icon: Icon }) => (
                    <Button
                        key={type}
                        size="sm"
                        variant="outline"
                        className="text-xs h-9 justify-start gap-2"
                        onClick={() => onTemplateClick(type)}
                    >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                    </Button>
                ))}
            </div>
        </div>
    );
}
