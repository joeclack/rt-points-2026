"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";

export function TeamRequestsRealtimeRefresh({ eventId }: { eventId: string }) {
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

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        queueRefresh();
      }
    }

    const supabase = createClient();
    const channel = supabase
      .channel(`team-requests:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_join_requests",
          filter: `event_id=eq.${eventId}`,
        },
        queueRefresh,
      )
      .subscribe();
    const fallbackInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        queueRefresh();
      }
    }, 5000);

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      if (refreshTimeout) {
        window.clearTimeout(refreshTimeout);
      }

      window.clearInterval(fallbackInterval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      void supabase.removeChannel(channel);
    };
  }, [eventId, router]);

  return null;
}
