import { unstable_noStore as noStore } from "next/cache";

import { isSupabaseConfigured } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type TeamJoinRequest = {
  id: string;
  eventId: string;
  teamName: string;
  teamColour: string;
  createdAt: string;
  players: Array<{
    slot: number;
    name: string;
  }>;
};

type TeamJoinRequestRow = {
  id: string;
  event_id: string;
  team_name: string;
  team_colour: string;
  created_at: string;
  players: Array<{
    slot: number;
    name: string;
  }>;
};

export async function getPendingTeamJoinRequests(eventId: string) {
  noStore();

  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_join_requests")
    .select(
      "id,event_id,team_name,team_colour,created_at,players:team_join_request_players(slot,name)",
    )
    .eq("event_id", eventId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Unable to load pending team requests: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  return (data as unknown as TeamJoinRequestRow[]).map((request) => ({
    id: request.id,
    eventId: request.event_id,
    teamName: request.team_name,
    teamColour: request.team_colour,
    createdAt: request.created_at,
    players: [...request.players].sort((a, b) => a.slot - b.slot),
  }));
}
