"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  MessageSquare,
  TrendingUp,
  Users,
} from "lucide-react";
import type { StanceDistribution, DiscussionParticipant } from "@/types/discussion";

interface OverviewPanelProps {
  stanceDistribution?: StanceDistribution;
  participants: DiscussionParticipant[];
  sessionId?: string; // kept for backwards compatibility but no longer used
}

export function OverviewPanel({
  stanceDistribution,
  participants,
}: OverviewPanelProps) {

  // Calculate distribution from participants if not provided
  const distribution = useMemo(() => {
    if (stanceDistribution) return stanceDistribution;
    return {
      pro: participants.filter((p) => p.stance === "pro").length,
      con: participants.filter((p) => p.stance === "con").length,
      neutral: participants.filter((p) => p.stance === "neutral").length,
      unsubmitted: participants.filter((p) => !p.isSubmitted).length,
    };
  }, [stanceDistribution, participants]);

  const total = distribution.pro + distribution.con + distribution.neutral;
  const totalParticipants = participants.length;

  // Calculate percentages
  const proPercent = total > 0 ? Math.round((distribution.pro / total) * 100) : 0;
  const conPercent = total > 0 ? Math.round((distribution.con / total) * 100) : 0;
  const neutralPercent = total > 0 ? Math.round((distribution.neutral / total) * 100) : 0;

  // Calculate activity stats
  const activeNow = participants.filter((p) => p.isOnline).length;
  const needsHelp = participants.filter((p) => p.needsHelp).length;
  const hadRequestedHelp = participants.filter((p) => !p.needsHelp && p.helpRequestedAt).length;
  const totalMessages = participants.reduce(
    (sum, p) => sum + (p.messageCount || 0),
    0
  );

  // Find students who might need attention
  const needsAttention = useMemo(() => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return participants.filter((p) => {
      const lastActive = new Date(p.lastActiveAt);
      return (
        p.needsHelp ||
        p.helpRequestedAt || // Include students who have requested help at any point
        (p.isOnline && lastActive < fiveMinutesAgo) ||
        (!p.isSubmitted && p.messageCount === 0)
      );
    });
  }, [participants]);

  // Calculate attention reasons summary
  const attentionReasons = useMemo(() => {
    if (needsAttention.length === 0) return [];

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const reasons: string[] = [];
    let helpCount = 0;
    let hadHelpCount = 0;
    let inactiveCount = 0;
    let noActivityCount = 0;
    let longInactiveCount = 0;

    needsAttention.forEach((p) => {
      const lastActive = new Date(p.lastActiveAt);

      if (p.needsHelp) helpCount++;
      else if (p.helpRequestedAt) hadHelpCount++;
      if (!p.isSubmitted && p.messageCount === 0) noActivityCount++;
      if (p.isOnline && lastActive < fiveMinutesAgo) {
        if (lastActive < fifteenMinutesAgo) {
          longInactiveCount++;
        } else {
          inactiveCount++;
        }
      }
    });

    if (helpCount > 0) {
      reasons.push(`도움 요청 중 ${helpCount}명`);
    }
    if (hadHelpCount > 0) {
      reasons.push(`도움 요청 이력 ${hadHelpCount}명`);
    }
    if (longInactiveCount > 0) {
      reasons.push(`15분 이상 활동 없음 ${longInactiveCount}명`);
    } else if (inactiveCount > 0) {
      reasons.push(`5분 이상 활동 없음 ${inactiveCount}명`);
    }
    if (noActivityCount > 0) {
      reasons.push(`대화 없음 ${noActivityCount}명`);
    }

    return reasons;
  }, [needsAttention]);

  return (
    <div className="space-y-4">
      {/* Stance Distribution Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="w-4 h-4" />
            입장 분포
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stance Numbers */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
              <div className="text-2xl font-bold text-blue-600 font-mono">
                {distribution.pro}
              </div>
              <div className="text-xs text-blue-600/80">찬성</div>
            </div>
            <div className="p-3 rounded-lg bg-red-50 border border-red-100">
              <div className="text-2xl font-bold text-red-600 font-mono">
                {distribution.con}
              </div>
              <div className="text-xs text-red-600/80">반대</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <div className="text-2xl font-bold text-slate-600 font-mono">
                {distribution.neutral}
              </div>
              <div className="text-xs text-slate-600/80">중립</div>
            </div>
          </div>

          {/* Distribution Bar */}
          {total > 0 && (
            <div className="space-y-1">
              <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                {proPercent > 0 && (
                  <div
                    className="bg-blue-500 transition-all duration-500"
                    style={{ width: `${proPercent}%` }}
                  />
                )}
                {neutralPercent > 0 && (
                  <div
                    className="bg-slate-400 transition-all duration-500"
                    style={{ width: `${neutralPercent}%` }}
                  />
                )}
                {conPercent > 0 && (
                  <div
                    className="bg-red-500 transition-all duration-500"
                    style={{ width: `${conPercent}%` }}
                  />
                )}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{proPercent}%</span>
                <span>{neutralPercent}%</span>
                <span>{conPercent}%</span>
              </div>
            </div>
          )}

          {/* Unsubmitted count */}
          {distribution.unsubmitted > 0 && (
            <div className="text-xs text-muted-foreground text-center pt-1 border-t">
              미제출: {distribution.unsubmitted}명 / 전체 {totalParticipants}명
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Stats Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            활동 현황
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <div>
                <div className="text-sm font-medium">{activeNow}</div>
                <div className="text-[10px] text-muted-foreground">현재 활성</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">{totalMessages}</div>
                <div className="text-[10px] text-muted-foreground">총 메시지</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Needs Attention Card */}
      {needsAttention.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-4 h-4" />
              주의 필요
              {attentionReasons.length > 0 && (
                <span className="text-xs font-normal text-amber-600/80 ml-1">
                  ({attentionReasons.join(", ")})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {needsHelp > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-amber-700">도움 요청 중</span>
                  <Badge variant="outline" className="bg-amber-100 text-amber-700">
                    {needsHelp}명
                  </Badge>
                </div>
              )}
              {hadRequestedHelp > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-amber-600/80">도움 요청 이력</span>
                  <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
                    {hadRequestedHelp}명
                  </Badge>
                </div>
              )}
              {needsAttention.slice(0, 3).map((p) => (
                <div
                  key={p.id}
                  className="text-xs text-amber-700/80 pl-2 border-l-2 border-amber-300"
                >
                  {p.displayName || `Student ${p.id.slice(0, 4)}`}
                  {p.needsHelp && " - 도움 요청 중"}
                  {!p.needsHelp && p.helpRequestedAt && " - 도움 요청 취소됨"}
                  {!p.isSubmitted && p.messageCount === 0 && " - 활동 없음"}
                </div>
              ))}
              {needsAttention.length > 3 && (
                <div className="text-[10px] text-amber-600">
                  외 {needsAttention.length - 3}명...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confusion Notes Card */}
      {participants.some((p) => p.confusionNote) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              학생 질문/혼란점
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {participants
                .filter((p) => p.confusionNote)
                .slice(0, 3)
                .map((p) => (
                  <div
                    key={p.id}
                    className="text-xs p-2 rounded bg-muted/50 border-l-2 border-primary"
                  >
                    <div className="text-muted-foreground mb-1">
                      {p.displayName || `Student ${p.id.slice(0, 4)}`}
                    </div>
                    <div className="line-clamp-2">{p.confusionNote}</div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
