"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { InstructorNote } from "@/types/discussion";

/**
 * Hook for instructor notes on participants
 */
export function useInstructorNote(participantId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["instructor-note", participantId],
    queryFn: async (): Promise<InstructorNote | null> => {
      if (!participantId) return null;
      const response = await fetch(
        `/api/discussions/participants/${participantId}/note`
      );
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
        `/api/discussions/participants/${participantId}/note`,
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
