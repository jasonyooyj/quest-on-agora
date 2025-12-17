"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertTriangle,
  CheckCircle,
  Loader2,
  MessageSquare,
  Search,
  Users,
  History,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import type {
  DiscussionParticipant,
  ParticipantFilter,
  ParticipantSortOption,
} from "@/types/discussion";

interface StudentsPanelProps {
  participants: DiscussionParticipant[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (participantId: string | null) => void;
  isAnonymous: boolean;
}

export function StudentsPanel({
  participants,
  isLoading,
  selectedId,
  onSelect,
  isAnonymous,
}: StudentsPanelProps) {
  const [search, setSearch] = useState("");
  const [stanceFilter, setStanceFilter] = useState<ParticipantFilter>("all");
  const [sortOption, setSortOption] = useState<ParticipantSortOption>("recent");
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [showNeedsHelpOnly, setShowNeedsHelpOnly] = useState(false);

  // Filter and sort participants
  const filteredParticipants = useMemo(() => {
    let result = [...participants];

    // Search filter
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter((p) => {
        const displayName = p.displayName || `Student ${p.id.slice(0, 4)}`;
        return (
          displayName.toLowerCase().includes(query) ||
          p.studentNumber?.toLowerCase().includes(query) ||
          p.realName?.toLowerCase().includes(query)
        );
      });
    }

    // Stance filter
    if (stanceFilter !== "all") {
      if (stanceFilter === "unsubmitted") {
        result = result.filter((p) => !p.isSubmitted);
      } else {
        result = result.filter((p) => p.stance === stanceFilter);
      }
    }

    // Active only
    if (showActiveOnly) {
      result = result.filter((p) => p.isOnline);
    }

    // Needs help only - show both current and past help requests
    if (showNeedsHelpOnly) {
      result = result.filter((p) => p.needsHelp || p.helpRequestedAt);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortOption) {
        case "recent":
          return (
            new Date(b.lastActiveAt).getTime() -
            new Date(a.lastActiveAt).getTime()
          );
        case "messages":
          return (b.messageCount || 0) - (a.messageCount || 0);
        case "submitted":
          if (a.isSubmitted && !b.isSubmitted) return -1;
          if (!a.isSubmitted && b.isSubmitted) return 1;
          return 0;
        default:
          return 0;
      }
    });

    return result;
  }, [
    participants,
    search,
    stanceFilter,
    sortOption,
    showActiveOnly,
    showNeedsHelpOnly,
  ]);

  const getStanceBadge = (participant: DiscussionParticipant) => {
    if (!participant.isSubmitted) {
      return (
        <Badge variant="outline" className="text-[10px] text-muted-foreground">
          미제출
        </Badge>
      );
    }

    switch (participant.stance) {
      case "pro":
        return (
          <Badge className="text-[10px] bg-blue-100 text-blue-700 border-blue-200">
            찬성
          </Badge>
        );
      case "con":
        return (
          <Badge className="text-[10px] bg-red-100 text-red-700 border-red-200">
            반대
          </Badge>
        );
      case "neutral":
        return (
          <Badge className="text-[10px] bg-slate-100 text-slate-700 border-slate-200">
            중립
          </Badge>
        );
      default:
        return null;
    }
  };

  const getDisplayName = (participant: DiscussionParticipant) => {
    if (isAnonymous) {
      return participant.displayName || `Student ${participant.id.slice(0, 4)}`;
    }
    return (
      participant.realName ||
      participant.displayName ||
      `Student ${participant.id.slice(0, 4)}`
    );
  };

  const getAvatarInitials = (participant: DiscussionParticipant) => {
    const name = getDisplayName(participant);
    return name.slice(-2);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Filter Bar (Sticky) */}
      <div className="p-4 border-b bg-background/95 backdrop-blur-sm space-y-3 shrink-0">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="이름, 학번으로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters Row */}
        <div className="flex gap-2">
          <Select
            value={stanceFilter}
            onValueChange={(v) => setStanceFilter(v as ParticipantFilter)}
          >
            <SelectTrigger className="w-[110px] h-8">
              <SelectValue placeholder="입장" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="pro">찬성</SelectItem>
              <SelectItem value="con">반대</SelectItem>
              <SelectItem value="neutral">중립</SelectItem>
              <SelectItem value="unsubmitted">미제출</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={sortOption}
            onValueChange={(v) => setSortOption(v as ParticipantSortOption)}
          >
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue placeholder="정렬" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">최근 활동</SelectItem>
              <SelectItem value="messages">메시지 수</SelectItem>
              <SelectItem value="submitted">제출 순</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Toggle Chips */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={showActiveOnly ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowActiveOnly(!showActiveOnly)}
          >
            활성
          </Button>
          <Button
            variant={showNeedsHelpOnly ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowNeedsHelpOnly(!showNeedsHelpOnly)}
          >
            도움 필요
          </Button>
        </div>
      </div>

      {/* Students List */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredParticipants.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">필터에 맞는 학생이 없습니다</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredParticipants.map((participant) => (
              <div
                key={participant.id}
                className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                  selectedId === participant.id ? "bg-muted" : ""
                }`}
                onClick={() => onSelect(participant.id)}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="relative">
                    <Avatar className="h-10 w-10 border">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                        {getAvatarInitials(participant)}
                      </AvatarFallback>
                    </Avatar>
                    {/* Online Indicator */}
                    {participant.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">
                        {getDisplayName(participant)}
                      </span>
                      {getStanceBadge(participant)}
                      {participant.needsHelp ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" title="도움 요청 중" />
                      ) : participant.helpRequestedAt ? (
                        <History className="w-3.5 h-3.5 text-amber-400/70" title="도움 요청 이력 있음" />
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {participant.messageCount || 0}
                      </span>
                      <span>
                        {formatDistanceToNow(
                          new Date(participant.lastActiveAt),
                          {
                            addSuffix: true,
                            locale: ko,
                          }
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Submitted Check */}
                  {participant.isSubmitted && (
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-3 border-t bg-muted/30 text-xs text-muted-foreground shrink-0">
        <div className="flex items-center justify-between">
          <span>
            {filteredParticipants.length} / {participants.length}명 표시
          </span>
          <span>
            제출: {participants.filter((p) => p.isSubmitted).length}명
          </span>
        </div>
      </div>
    </div>
  );
}
