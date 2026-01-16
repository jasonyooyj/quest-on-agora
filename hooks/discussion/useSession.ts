"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { DiscussionSession } from "@/types/discussion";
import { normalizeSession } from "./types";

/**
 * Hook for fetching discussion session data
 */
export function useDiscussionSession(sessionId: string) {
  return useQuery({
    queryKey: ["discussion-session", sessionId],
    queryFn: async (): Promise<DiscussionSession> => {
      const response = await fetch(`/api/discussions/${sessionId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch discussion session");
      }
      const data = await response.json();
      const session = data.session ?? data.discussion;
      if (!session) {
        throw new Error("Missing discussion session data");
      }
      return normalizeSession(session);
    },
    enabled: !!sessionId,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook for session actions (close, update settings)
 */
export function useSessionActions(sessionId: string) {
  const queryClient = useQueryClient();

  const closeSession = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/discussions/${sessionId}/close`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to close session");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["discussion-session", sessionId],
      });
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (settings: Record<string, unknown>) => {
      const response = await fetch(`/api/discussions/${sessionId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!response.ok) {
        throw new Error("Failed to update settings");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["discussion-session", sessionId],
      });
    },
  });

  return { closeSession, updateSettings };
}
