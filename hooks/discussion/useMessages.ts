"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { createSupabaseClient } from "@/lib/supabase-client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { DiscussionMessage } from "@/types/discussion";
import { normalizeMessage, type DiscussionMessageRow } from "./types";

/**
 * Hook for fetching messages for a specific participant
 */
export function useParticipantMessages(
  sessionId: string,
  participantId: string | null
) {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<RealtimeChannel | null>(null);

  const query = useQuery({
    queryKey: ["discussion-messages", sessionId, participantId],
    queryFn: async (): Promise<DiscussionMessage[]> => {
      if (!participantId) return [];
      const response = await fetch(
        `/api/discussions/${sessionId}/messages?participant_id=${participantId}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }
      const data = await response.json();
      return (data.messages || []).map(normalizeMessage);
    },
    enabled: !!sessionId && !!participantId,
    staleTime: 1000 * 10, // 10 seconds
  });

  // Subscribe to realtime updates for this participant
  useEffect(() => {
    if (!sessionId || !participantId) return;

    const supabase = createSupabaseClient();
    const channel = supabase
      .channel(`discussion-messages:${sessionId}:${participantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "discussion_messages",
          filter: `participant_id=eq.${participantId}`,
        },
        (payload) => {
          // Only add messages that are visible to students
          // Database uses snake_case, but we need to convert to camelCase
          const dbMessage = payload.new as DiscussionMessageRow;
          const isVisibleToStudent = dbMessage.is_visible_to_student ?? true;

          if (isVisibleToStudent !== false) {
            // Convert database format to DiscussionMessage format
            // Convert null to undefined for optional fields
            const newMessage: DiscussionMessage = {
              id: dbMessage.id,
              sessionId: dbMessage.session_id,
              participantId: dbMessage.participant_id ?? undefined,
              role: dbMessage.role as DiscussionMessage["role"],
              content: dbMessage.content,
              messageType: dbMessage.message_type ?? undefined,
              isVisibleToStudent: isVisibleToStudent,
              createdAt: dbMessage.created_at
                ? new Date(dbMessage.created_at).toISOString()
                : new Date().toISOString(),
              metadata: dbMessage.metadata ?? undefined,
            };

            // Optimistically add the new message
            queryClient.setQueryData<DiscussionMessage[]>(
              ["discussion-messages", sessionId, participantId],
              (old = []) => {
                // Check if message already exists to avoid duplicates
                const exists = old.some((msg) => msg.id === newMessage.id);
                if (exists) return old;
                return [...old, newMessage];
              }
            );

            // Also invalidate to ensure we get the latest data from server
            queryClient.invalidateQueries({
              queryKey: ["discussion-messages", sessionId, participantId],
            });
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [sessionId, participantId, queryClient]);

  return query;
}

/**
 * Hook for global message feed (recent messages across all participants)
 */
export function useGlobalMessageFeed(sessionId: string, limit = 20) {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<RealtimeChannel | null>(null);

  const query = useQuery({
    queryKey: ["discussion-global-feed", sessionId],
    queryFn: async (): Promise<DiscussionMessage[]> => {
      const response = await fetch(
        `/api/discussions/${sessionId}/messages?limit=${limit}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch global feed");
      }
      const data = await response.json();
      return (data.messages || []).map(normalizeMessage);
    },
    enabled: !!sessionId,
    staleTime: 1000 * 5, // 5 seconds
  });

  // Subscribe to all messages in the session
  useEffect(() => {
    if (!sessionId) return;

    const supabase = createSupabaseClient();
    const channel = supabase
      .channel(`discussion-global-feed:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "discussion_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          // Refetch the global feed on new message
          queryClient.invalidateQueries({
            queryKey: ["discussion-global-feed", sessionId],
          });
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [sessionId, queryClient]);

  return query;
}

/**
 * Hook for sending instructor intervention
 */
export function useSendIntervention(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      participantId,
      content,
      messageType,
      isVisibleToStudent,
    }: {
      participantId: string;
      content: string;
      messageType: string;
      isVisibleToStudent: boolean;
    }) => {
      const response = await fetch(`/api/discussions/${sessionId}/intervention`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId,
          content,
          messageType,
          isVisibleToStudent,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to send intervention");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate participant's messages
      queryClient.invalidateQueries({
        queryKey: ["discussion-messages", sessionId, variables.participantId],
      });
    },
  });
}
