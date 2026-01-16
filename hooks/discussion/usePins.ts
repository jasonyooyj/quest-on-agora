"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { PinnedQuote } from "@/types/discussion";
import { normalizePin, type RawRecord } from "./types";

/**
 * Hook for pinned quotes management
 */
export function usePinnedQuotes(sessionId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["discussion-pinned-quotes", sessionId],
    queryFn: async (): Promise<PinnedQuote[]> => {
      const response = await fetch(`/api/discussions/${sessionId}/pins`);
      if (!response.ok) {
        throw new Error("Failed to fetch pinned quotes");
      }
      const data = await response.json();
      return (data.pins || []).map((pin: RawRecord, index: number) =>
        normalizePin(pin, sessionId, index)
      );
    },
    enabled: !!sessionId,
    staleTime: 1000 * 30, // 30 seconds
  });

  const pinQuote = useMutation({
    mutationFn: async (quote: Omit<PinnedQuote, "id" | "pinnedAt" | "sortOrder">) => {
      const response = await fetch(`/api/discussions/${sessionId}/pins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: quote.participantId,
          quote: quote.content,
          context: null,
        }),
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
        `/api/discussions/${sessionId}/pins?pinId=${quoteId}`,
        {
          method: "DELETE",
        }
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
