"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, use, useMemo } from "react";
import { Loader2, WifiOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useDiscussionSession,
  useDiscussionParticipants,
  useStanceDistribution,
  usePinnedQuotes,
  useRealtimeStatus,
} from "@/hooks/useDiscussion";

// Components
import { DiscussionSessionHeader } from "@/components/discussion/DiscussionSessionHeader";
import { OverviewPanel } from "@/components/discussion/OverviewPanel";
import { TopicClustersPanel } from "@/components/discussion/TopicClustersPanel";
import { PinnedQuotesPanel } from "@/components/discussion/PinnedQuotesPanel";
import { StudentsPanel } from "@/components/discussion/StudentsPanel";
import { StudentDetailPanel } from "@/components/discussion/StudentDetailPanel";

export default function DiscussionDashboardPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const resolvedParams = use(params);
  const sessionId = resolvedParams.sessionId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded, user } = useUser();

  // Selected student from URL query
  const selectedStudentId = searchParams.get("student");

  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<"overview" | "students" | "detail">(
    "overview"
  );

  // Cluster filter state
  const [selectedClusterIds, setSelectedClusterIds] = useState<Set<string>>(
    new Set()
  );

  // Data hooks
  const { data: session, isLoading: sessionLoading, error: sessionError } =
    useDiscussionSession(sessionId);
  const { data: participants = [], isLoading: participantsLoading } =
    useDiscussionParticipants(sessionId);
  const { data: stanceDistribution } = useStanceDistribution(sessionId);
  const { data: pinnedQuotes = [], pinQuote, unpinQuote } = usePinnedQuotes(sessionId);
  const { isConnected, reconnect } = useRealtimeStatus();

  // Role check
  const userRole = (user?.unsafeMetadata?.role as string) || "student";

  // Redirect non-instructors
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      if (!user?.unsafeMetadata?.role) {
        router.push("/onboarding");
        return;
      }
      if (userRole !== "instructor") {
        router.push("/student");
      }
    }
  }, [isLoaded, isSignedIn, userRole, user, router]);

  // Handle student selection
  const handleSelectStudent = (participantId: string | null) => {
    const url = new URL(window.location.href);
    if (participantId) {
      url.searchParams.set("student", participantId);
      setMobileTab("detail");
    } else {
      url.searchParams.delete("student");
    }
    router.push(url.pathname + url.search);
  };

  // Handle cluster selection
  const handleSelectCluster = (participantIds: string[]) => {
    setSelectedClusterIds(new Set(participantIds));
    // Switch to students view when cluster is selected
    setMobileTab("students");
  };

  // Clear cluster filter
  const handleClearClusterFilter = () => {
    setSelectedClusterIds(new Set());
  };

  // Filter participants by cluster
  const filteredParticipants = useMemo(() => {
    if (selectedClusterIds.size === 0) {
      return participants;
    }
    return participants.filter((p) => selectedClusterIds.has(p.id));
  }, [participants, selectedClusterIds]);

  // Get selected participant (from all participants, not filtered)
  const selectedParticipant = participants.find(
    (p) => p.id === selectedStudentId
  );

  // Loading state
  if (!isLoaded || sessionLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">불러오는 중...</p>
        </div>
      </div>
    );
  }

  // Not authorized
  if (!isSignedIn || userRole !== "instructor") {
    return null;
  }

  // Error state
  if (sessionError || !session) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-red-600 mb-2">오류 발생</h2>
          <p className="text-muted-foreground mb-4">
            토론 세션을 불러올 수 없습니다.
          </p>
          <Button variant="outline" onClick={() => router.push("/instructor")}>
            대시보드로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Connection Status Banner */}
      {!isConnected && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-destructive">
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">실시간 연결이 끊어졌습니다</span>
          </div>
          <Button variant="outline" size="sm" onClick={reconnect}>
            재연결
          </Button>
        </div>
      )}

      {/* Session Header */}
      <DiscussionSessionHeader
        session={session}
        participantCount={participants.length}
      />

      {/* Mobile View: Tabs */}
      <div className="lg:hidden flex-1 overflow-hidden">
        <Tabs
          value={mobileTab}
          onValueChange={(v) => setMobileTab(v as typeof mobileTab)}
          className="h-full flex flex-col"
        >
          <TabsList className="w-full justify-start border-b rounded-none h-12 px-4 gap-2">
            <TabsTrigger value="overview" className="flex-1">
              개요
            </TabsTrigger>
            <TabsTrigger value="students" className="flex-1">
              학생 ({participants.length})
            </TabsTrigger>
            <TabsTrigger
              value="detail"
              className="flex-1"
              disabled={!selectedStudentId}
            >
              상세
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="flex-1 overflow-auto p-4 mt-0">
            <div className="space-y-4">
              <OverviewPanel
                stanceDistribution={stanceDistribution}
                participants={participants}
                sessionId={sessionId}
              />
              <TopicClustersPanel
                sessionId={sessionId}
                onSelectCluster={handleSelectCluster}
                onPinQuote={(quote) => pinQuote.mutate(quote)}
              />
              <PinnedQuotesPanel
                quotes={pinnedQuotes}
                onUnpin={(quoteId) => unpinQuote.mutate(quoteId)}
                isAnonymous={session.settings.anonymous}
              />
            </div>
          </TabsContent>
          <TabsContent value="students" className="flex-1 overflow-hidden mt-0">
            {selectedClusterIds.size > 0 && (
              <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">
                  클러스터 필터: {selectedClusterIds.size}명
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleClearClusterFilter}
                >
                  <X className="w-3 h-3 mr-1" />
                  필터 해제
                </Button>
              </div>
            )}
            <StudentsPanel
              participants={filteredParticipants}
              isLoading={participantsLoading}
              selectedId={selectedStudentId}
              onSelect={handleSelectStudent}
              isAnonymous={session.settings.anonymous}
            />
          </TabsContent>
          <TabsContent value="detail" className="flex-1 overflow-hidden mt-0">
            <StudentDetailPanel
              sessionId={sessionId}
              participant={selectedParticipant || null}
              isAnonymous={session.settings.anonymous}
              onPinQuote={(quote) => pinQuote.mutate(quote)}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop View: 3-Panel Layout */}
      <div className="hidden lg:grid lg:grid-cols-12 flex-1 overflow-hidden">
        {/* Left Panel: Overview + Clusters + Pinned */}
        <div className="col-span-4 border-r overflow-auto p-4 space-y-4">
          <OverviewPanel
            stanceDistribution={stanceDistribution}
            participants={participants}
            sessionId={sessionId}
          />
          <TopicClustersPanel
            sessionId={sessionId}
            onSelectCluster={handleSelectCluster}
            onPinQuote={(quote) => pinQuote.mutate(quote)}
          />
          <PinnedQuotesPanel
            quotes={pinnedQuotes}
            onUnpin={(quoteId) => unpinQuote.mutate(quoteId)}
            isAnonymous={session.settings.anonymous}
          />
        </div>

        {/* Middle Panel: Students List */}
        <div className="col-span-4 border-r overflow-hidden flex flex-col">
          {selectedClusterIds.size > 0 && (
            <div className="p-3 border-b bg-muted/30 flex items-center justify-between shrink-0">
              <Badge variant="secondary" className="text-xs">
                클러스터 필터: {selectedClusterIds.size}명
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={handleClearClusterFilter}
              >
                <X className="w-3 h-3 mr-1" />
                필터 해제
              </Button>
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <StudentsPanel
              participants={filteredParticipants}
              isLoading={participantsLoading}
              selectedId={selectedStudentId}
              onSelect={handleSelectStudent}
              isAnonymous={session.settings.anonymous}
            />
          </div>
        </div>

        {/* Right Panel: Student Detail */}
        <div className="col-span-4 overflow-hidden">
          <StudentDetailPanel
            sessionId={sessionId}
            participant={selectedParticipant || null}
            isAnonymous={session.settings.anonymous}
            onPinQuote={(quote) => pinQuote.mutate(quote)}
          />
        </div>
      </div>
    </div>
  );
}
