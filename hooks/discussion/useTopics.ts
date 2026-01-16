"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { TopicCluster } from "@/types/discussion";

/**
 * Hook for discussion topics (GPT-generated)
 */
export function useDiscussionTopics(sessionId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["discussion-topics", sessionId],
    queryFn: async (): Promise<TopicCluster[]> => {
      const response = await fetch(`/api/discussions/${sessionId}/topics`);
      if (!response.ok) {
        throw new Error("Failed to fetch topics");
      }
      const data = await response.json();
      return data.topics || [];
    },
    enabled: !!sessionId,
    staleTime: 1000 * 60, // 1 minute - topics don't change as frequently
  });

  // Invalidate topics when participants update (new submissions)
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (
        event.type === "updated" &&
        event.query.queryKey[0] === "discussion-participants" &&
        event.query.queryKey[1] === sessionId
      ) {
        // When participants update, invalidate topics to trigger re-analysis
        // But add a small delay to avoid too frequent GPT calls
        setTimeout(() => {
          queryClient.invalidateQueries({
            queryKey: ["discussion-topics", sessionId],
          });
        }, 2000); // 2 second delay to batch multiple updates
      }
    });

    return () => unsubscribe();
  }, [sessionId, queryClient]);

  // Also invalidate when new messages arrive (but less frequently)
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (
        event.type === "updated" &&
        event.query.queryKey[0] === "discussion-global-feed" &&
        event.query.queryKey[1] === sessionId
      ) {
        // Debounce: only invalidate if last invalidation was more than 30 seconds ago
        const lastInvalidation =
          queryClient.getQueryState(["discussion-topics", sessionId])
            ?.dataUpdatedAt || 0;
        const now = Date.now();
        if (now - lastInvalidation > 30000) {
          // 30 seconds
          queryClient.invalidateQueries({
            queryKey: ["discussion-topics", sessionId],
          });
        }
      }
    });

    return () => unsubscribe();
  }, [sessionId, queryClient]);

  return query;
}
