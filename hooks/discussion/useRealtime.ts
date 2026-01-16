"use client";

import { useState, useEffect, useCallback } from "react";
import { createSupabaseClient } from "@/lib/supabase-client";

/**
 * Hook for monitoring realtime connection status
 */
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
