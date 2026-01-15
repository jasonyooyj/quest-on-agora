import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import type { DiscussionParticipant } from "@/types/discussion";

interface StudentDetailHeaderProps {
    participant: DiscussionParticipant;
    isAnonymous: boolean;
}

export function StudentDetailHeader({
    participant,
    isAnonymous,
}: StudentDetailHeaderProps) {
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
                {participant.needsHelp ? (
                    <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-700 border-amber-200"
                    >
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        도움 요청 중
                    </Badge>
                ) : participant.helpRequestedAt ? (
                    <Badge
                        variant="outline"
                        className="bg-amber-50/50 text-amber-600/80 border-amber-200/50"
                    >
                        <AlertTriangle className="w-3 h-3 mr-1 opacity-70" />
                        도움 요청 취소됨
                    </Badge>
                ) : null}
            </div>
        </div>
    );
}
