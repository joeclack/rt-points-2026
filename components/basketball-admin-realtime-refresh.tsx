"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";

export function BasketballAdminRealtimeRefresh({ eventId }: { eventId: string }) {
  const router = useRouter();

  useEffect(() => {
    let refreshTimeout: number | undefined;
    const supabase = createClient();
    const channel = supabase
      .channel(`basketball-admin:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "basketball_matches",
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          if (refreshTimeout) window.clearTimeout(refreshTimeout);
          refreshTimeout = window.setTimeout(() => router.refresh(), 120);
        },
      )
      .subscribe();

    const fallback = window.setInterval(() => router.refresh(), 5000);

    return () => {
      if (refreshTimeout) window.clearTimeout(refreshTimeout);
      window.clearInterval(fallback);
      void supabase.removeChannel(channel);
    };
  }, [eventId, router]);

  return null;
}
