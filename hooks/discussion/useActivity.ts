"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

interface ActivityStats {
  messagesPerInterval: number[];
  timestamps: string[];
  totalMessages: number;
}

/**
 * Hook for activity stats (last 5 minutes)
 */
export function useActivityStats(sessionId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["discussion-activity", sessionId],
    queryFn: async (): Promise<ActivityStats> => {
      try {
        const response = await fetch(`/api/discussions/${sessionId}/activity`);
        if (!response.ok) {
          // If error, return empty stats instead of throwing
          console.error(
            "Failed to fetch activity stats:",
            response.status,
            response.statusText
          );
          return {
            messagesPerInterval: Array(10).fill(0),
            timestamps: [],
            totalMessages: 0,
          };
        }
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error in activity stats query:", error);
        // Return empty stats on error to prevent UI blocking
        return {
          messagesPerInterval: Array(10).fill(0),
          timestamps: [],
          totalMessages: 0,
        };
      }
    },
    enabled: !!sessionId,
    staleTime: 1000 * 10, // 10 seconds
    refetchInterval: 1000 * 10, // Refetch every 10 seconds
    retry: 1, // Only retry once
    retryDelay: 1000, // Wait 1 second before retry
  });

  // Invalidate when new messages arrive
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (
        event.type === "updated" &&
        event.query.queryKey[0] === "discussion-global-feed" &&
        event.query.queryKey[1] === sessionId
      ) {
        queryClient.invalidateQueries({
          queryKey: ["discussion-activity", sessionId],
        });
      }
    });

    return () => unsubscribe();
  }, [sessionId, queryClient]);

  return query;
}
