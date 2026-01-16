"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { createSupabaseClient } from "@/lib/supabase-client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type {
  DiscussionParticipant,
  StanceDistribution,
} from "@/types/discussion";
import { normalizeParticipant } from "./types";

/**
 * Hook for fetching participants with realtime updates
 */
export function useDiscussionParticipants(sessionId: string) {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<RealtimeChannel | null>(null);

  const query = useQuery({
    queryKey: ["discussion-participants", sessionId],
    queryFn: async (): Promise<DiscussionParticipant[]> => {
      const response = await fetch(`/api/discussions/${sessionId}/participants`);
      if (!response.ok) {
        throw new Error("Failed to fetch participants");
      }
      const data = await response.json();
      return (data.participants || []).map(normalizeParticipant);
    },
    enabled: !!sessionId,
    staleTime: 1000 * 5, // 5 seconds - reduced for more frequent updates
    refetchInterval: 1000 * 15, // Refetch every 15 seconds as fallback
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!sessionId) return;

    const supabase = createSupabaseClient();

    // Channel for participant table changes
    const participantsChannel = supabase
      .channel(`discussion-participants:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "discussion_participants",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          // Immediately refetch on any change
          console.log("[Realtime] Participant change detected, refetching...");
          queryClient.refetchQueries({
            queryKey: ["discussion-participants", sessionId],
          });
        }
      )
      .subscribe();

    // Also listen to message changes (which update participant last_active_at)
    const messagesChannel = supabase
      .channel(`discussion-participants-messages:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "discussion_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          // When new message is created, participant was updated, so refetch
          console.log("[Realtime] New message detected, refetching participants...");
          queryClient.refetchQueries({
            queryKey: ["discussion-participants", sessionId],
          });
        }
      )
      .subscribe();

    subscriptionRef.current = participantsChannel;

    return () => {
      if (participantsChannel) {
        supabase.removeChannel(participantsChannel);
      }
      if (messagesChannel) {
        supabase.removeChannel(messagesChannel);
      }
      subscriptionRef.current = null;
    };
  }, [sessionId, queryClient]);

  return query;
}

/**
 * Hook for stance distribution
 */
export function useStanceDistribution(sessionId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["discussion-stances", sessionId],
    queryFn: async (): Promise<StanceDistribution> => {
      const response = await fetch(`/api/discussions/${sessionId}/stances`);
      if (!response.ok) {
        throw new Error("Failed to fetch stances");
      }
      const data = await response.json();
      return data.distribution;
    },
    enabled: !!sessionId,
    staleTime: 1000 * 10, // 10 seconds
  });

  // Update stance distribution when participants change
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (
        event.type === "updated" &&
        event.query.queryKey[0] === "discussion-participants" &&
        event.query.queryKey[1] === sessionId
      ) {
        queryClient.invalidateQueries({
          queryKey: ["discussion-stances", sessionId],
        });
      }
    });

    return () => unsubscribe();
  }, [sessionId, queryClient]);

  return query;
}
