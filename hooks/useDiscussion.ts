"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase-client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type {
  DiscussionSession,
  DiscussionParticipant,
  DiscussionMessage,
  PinnedQuote,
  StanceDistribution,
  InstructorNote,
  TopicCluster,
} from "@/types/discussion";

// Hook for fetching discussion session data
export function useDiscussionSession(sessionId: string) {
  return useQuery({
    queryKey: ["discussion-session", sessionId],
    queryFn: async (): Promise<DiscussionSession> => {
      const response = await fetch(`/api/discussion/${sessionId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch discussion session");
      }
      const data = await response.json();
      return data.session;
    },
    enabled: !!sessionId,
    staleTime: 1000 * 60, // 1 minute
  });
}

// Hook for fetching participants with realtime updates
export function useDiscussionParticipants(sessionId: string) {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<RealtimeChannel | null>(null);

  const query = useQuery({
    queryKey: ["discussion-participants", sessionId],
    queryFn: async (): Promise<DiscussionParticipant[]> => {
      const response = await fetch(`/api/discussion/${sessionId}/participants`);
      if (!response.ok) {
        throw new Error("Failed to fetch participants");
      }
      const data = await response.json();
      return data.participants;
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

// Hook for fetching messages for a specific participant
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
        `/api/discussion/${sessionId}/messages?participantId=${participantId}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }
      const data = await response.json();
      return data.messages;
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
          const dbMessage = payload.new as any;
          const isVisibleToStudent = dbMessage.is_visible_to_student ?? true;
          
          if (isVisibleToStudent !== false) {
            // Convert database format to DiscussionMessage format
            const newMessage: DiscussionMessage = {
              id: dbMessage.id,
              sessionId: dbMessage.session_id,
              participantId: dbMessage.participant_id,
              role: dbMessage.role,
              content: dbMessage.content,
              messageType: dbMessage.message_type,
              isVisibleToStudent: isVisibleToStudent,
              createdAt: dbMessage.created_at
                ? new Date(dbMessage.created_at).toISOString()
                : new Date().toISOString(),
              metadata: dbMessage.metadata,
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

// Hook for global message feed (recent messages across all participants)
export function useGlobalMessageFeed(sessionId: string, limit = 20) {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<RealtimeChannel | null>(null);

  const query = useQuery({
    queryKey: ["discussion-global-feed", sessionId],
    queryFn: async (): Promise<DiscussionMessage[]> => {
      const response = await fetch(
        `/api/discussion/${sessionId}/messages?limit=${limit}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch global feed");
      }
      const data = await response.json();
      return data.messages;
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

// Hook for stance distribution
export function useStanceDistribution(sessionId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["discussion-stances", sessionId],
    queryFn: async (): Promise<StanceDistribution> => {
      const response = await fetch(`/api/discussion/${sessionId}/stances`);
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

// Hook for pinned quotes
export function usePinnedQuotes(sessionId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["discussion-pinned-quotes", sessionId],
    queryFn: async (): Promise<PinnedQuote[]> => {
      const response = await fetch(`/api/discussion/${sessionId}/pinned-quotes`);
      if (!response.ok) {
        throw new Error("Failed to fetch pinned quotes");
      }
      const data = await response.json();
      return data.quotes;
    },
    enabled: !!sessionId,
    staleTime: 1000 * 30, // 30 seconds
  });

  const pinQuote = useMutation({
    mutationFn: async (quote: Omit<PinnedQuote, "id" | "pinnedAt" | "sortOrder">) => {
      const response = await fetch(`/api/discussion/${sessionId}/pinned-quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quote),
      });
      if (!response.ok) {
        throw new Error("Failed to pin quote");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["discussion-pinned-quotes", sessionId],
      });
    },
  });

  const unpinQuote = useMutation({
    mutationFn: async (quoteId: string) => {
      const response = await fetch(
        `/api/discussion/${sessionId}/pinned-quotes/${quoteId}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        throw new Error("Failed to unpin quote");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["discussion-pinned-quotes", sessionId],
      });
    },
  });

  return { ...query, pinQuote, unpinQuote };
}

// Hook for instructor notes
export function useInstructorNote(participantId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["instructor-note", participantId],
    queryFn: async (): Promise<InstructorNote | null> => {
      if (!participantId) return null;
      const response = await fetch(`/api/discussion/participant/${participantId}/note`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error("Failed to fetch instructor note");
      }
      const data = await response.json();
      return data.note;
    },
    enabled: !!participantId,
    staleTime: 1000 * 60, // 1 minute
  });

  const saveNote = useMutation({
    mutationFn: async (note: string) => {
      if (!participantId) throw new Error("No participant selected");
      const response = await fetch(
        `/api/discussion/participant/${participantId}/note`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note }),
        }
      );
      if (!response.ok) {
        throw new Error("Failed to save note");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["instructor-note", participantId],
      });
    },
  });

  return { ...query, saveNote };
}

// Hook for sending instructor intervention
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
      const response = await fetch(`/api/discussion/${sessionId}/intervention`, {
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

// Hook for session actions
export function useSessionActions(sessionId: string) {
  const queryClient = useQueryClient();

  const closeSession = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/discussion/${sessionId}/close`, {
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
      const response = await fetch(`/api/discussion/${sessionId}/settings`, {
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

// Hook for activity stats (last 5 minutes)
export function useActivityStats(sessionId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["discussion-activity", sessionId],
    queryFn: async (): Promise<{
      messagesPerInterval: number[];
      timestamps: string[];
      totalMessages: number;
    }> => {
      try {
        const response = await fetch(`/api/discussion/${sessionId}/activity`);
        if (!response.ok) {
          // If error, return empty stats instead of throwing
          console.error("Failed to fetch activity stats:", response.status, response.statusText);
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

// Hook for discussion topics (GPT-generated)
export function useDiscussionTopics(sessionId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["discussion-topics", sessionId],
    queryFn: async (): Promise<TopicCluster[]> => {
      const response = await fetch(`/api/discussion/${sessionId}/topics`);
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
        const lastInvalidation = queryClient.getQueryState([
          "discussion-topics",
          sessionId,
        ])?.dataUpdatedAt || 0;
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

// Hook for connection status
export function useRealtimeStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [lastConnected, setLastConnected] = useState<Date | null>(null);

  useEffect(() => {
    const supabase = createSupabaseClient();

    // Monitor connection status
    const handleConnectionChange = (event: string) => {
      if (event === "SUBSCRIBED") {
        setIsConnected(true);
        setLastConnected(new Date());
      } else if (event === "CLOSED" || event === "CHANNEL_ERROR") {
        setIsConnected(false);
      }
    };

    // Create a dummy channel to monitor connection
    const channel = supabase
      .channel("connection-monitor")
      .subscribe((status) => {
        handleConnectionChange(status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const reconnect = useCallback(() => {
    // Force reconnection by recreating the client
    window.location.reload();
  }, []);

  return { isConnected, lastConnected, reconnect };
}
