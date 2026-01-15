"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lightbulb, Pin, Users, Loader2 } from "lucide-react";
import type { PinnedQuote } from "@/types/discussion";
import { useDiscussionTopics } from "@/hooks/useDiscussion";

interface TopicClustersPanelProps {
  sessionId: string;
  onSelectCluster: (participantIds: string[]) => void;
  onPinQuote: (quote: Omit<PinnedQuote, "id" | "pinnedAt" | "sortOrder">) => void;
}

export function TopicClustersPanel({
  sessionId,
  onSelectCluster,
  onPinQuote,
}: TopicClustersPanelProps) {
  // Fetch topics from GPT API
  const { data: clusters = [], isLoading, error } = useDiscussionTopics(sessionId);

  const handlePinEvidence = (cluster: typeof clusters[0]) => {
    onPinQuote({
      sessionId,
      participantId: cluster.participantIds[0] || undefined,
      content: cluster.sampleEvidence,
      displayName: `${cluster.label} 논점`,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            주요 논점
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
            <p className="text-sm">논점 분석 중...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || clusters.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            주요 논점
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">아직 충분한 데이터가 없습니다</p>
            <p className="text-xs mt-1">
              학생들이 입장을 제출하면 주요 논점이 표시됩니다
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Lightbulb className="w-4 h-4" />
          주요 논점 ({clusters.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {clusters.map((cluster) => (
          <div
            key={cluster.id}
            className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{cluster.label}</span>
                <Badge variant="secondary" className="text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  {cluster.participantCount}명
                </Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              &quot;{cluster.sampleEvidence}&quot;
            </p>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => handlePinEvidence(cluster)}
              >
                <Pin className="w-3 h-3 mr-1" />
                핀
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onSelectCluster(cluster.participantIds)}
              >
                <Users className="w-3 h-3 mr-1" />
                보기
              </Button>
            </div>
          </div>
        ))}

        {/* AI Generated Notice */}
        <div className="text-[10px] text-muted-foreground text-center pt-2 border-t">
          * AI가 분석한 주요 논점
        </div>
      </CardContent>
    </Card>
  );
}
