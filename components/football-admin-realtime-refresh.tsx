"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";

export function FootballAdminRealtimeRefresh({
  eventId,
}: {
  eventId: string;
}) {
  const router = useRouter();

  useEffect(() => {
    if (eventId.startsWith("evt_")) {
      return;
    }

    let refreshTimeout: number | undefined;

    function queueRefresh() {
      if (refreshTimeout) {
        window.clearTimeout(refreshTimeout);
      }

      refreshTimeout = window.setTimeout(() => router.refresh(), 120);
    }

    const supabase = createClient();
    const channel = supabase
      .channel(`football-admin:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "football_matches",
          filter: `event_id=eq.${eventId}`,
        },
        queueRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "football_tournaments",
          filter: `event_id=eq.${eventId}`,
        },
        queueRefresh,
      )
      .subscribe();
    const fallbackInterval = window.setInterval(
      () => router.refresh(),
      5000,
    );

    return () => {
      if (refreshTimeout) {
        window.clearTimeout(refreshTimeout);
      }

      window.clearInterval(fallbackInterval);
      void supabase.removeChannel(channel);
    };
  }, [eventId, router]);

  return null;
}

