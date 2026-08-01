import { notFound } from "next/navigation";

import type { EventSummary, Team } from "@/lib/sample-data";
import { isSupabaseConfigured } from "@/lib/auth";
import { getEventById, getEventBySlug, sampleEvents } from "@/lib/sample-data";
import { createClient } from "@/lib/supabase/server";

type EventRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  date_label: string | null;
  location: string | null;
  visibility: "public" | "private";
  game_points_enabled: boolean;
  football_enabled: boolean;
};

type TeamScoreRow = {
  id: string;
  name: string;
  colour: string;
  badge_text: string | null;
  badge_url: string | null;
  game_points_scores: Array<{
    points: number;
  }>;
};

function mapEvent(row: EventRow, teams: Team[] = []): EventSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? "",
    dateLabel: row.date_label ?? "Date to be confirmed",
    location: row.location ?? "Location to be confirmed",
    visibility: row.visibility,
    trackers: [
      ...(row.game_points_enabled ? (["game-points"] as const) : []),
      ...(row.football_enabled ? (["football"] as const) : []),
    ],
    teams,
  };
}

function mapTeam(row: TeamScoreRow): Team {
  return {
    id: row.id,
    name: row.name,
    colour: row.colour,
    badge: row.badge_text ?? row.name.charAt(0).toUpperCase(),
    badgeUrl: row.badge_url,
    points: row.game_points_scores.at(0)?.points ?? 0,
  };
}

export async function searchPublicEvents() {
  if (!isSupabaseConfigured()) {
    return sampleEvents;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(
      "id,name,slug,description,date_label,location,visibility,game_points_enabled,football_enabled",
    )
    .eq("visibility", "public")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return sampleEvents;
  }

  return data.map((event) => mapEvent(event));
}

export async function getPublicEventBySlug(slug: string) {
  if (!isSupabaseConfigured()) {
    return getEventBySlug(slug);
  }

  const supabase = await createClient();
  const { data: event, error } = await supabase
    .from("events")
    .select(
      "id,name,slug,description,date_label,location,visibility,game_points_enabled,football_enabled",
    )
    .eq("slug", slug)
    .eq("visibility", "public")
    .single();

  if (error || !event) {
    return getEventBySlug(slug);
  }

  const { data: teams } = await supabase
    .from("teams")
    .select("id,name,colour,badge_text,badge_url,game_points_scores(points)")
    .eq("event_id", event.id)
    .order("created_at");

  return mapEvent(event, (teams ?? []).map((team) => mapTeam(team)));
}

export async function getAdminEvents(userId?: string) {
  if (!isSupabaseConfigured()) {
    return sampleEvents;
  }

  const supabase = await createClient();
  let adminUserId = userId;

  if (!adminUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    adminUserId = user?.id;
  }

  if (!adminUserId) {
    return [];
  }

  const { data, error } = await supabase
    .from("events")
    .select(
      "id,name,slug,description,date_label,location,visibility,game_points_enabled,football_enabled",
    )
    .eq("owner_id", adminUserId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((event) => mapEvent(event));
}

export async function getAdminEventById(
  id: string,
  userId?: string,
  options: { includeTeams?: boolean } = {},
) {
  if (!isSupabaseConfigured()) {
    return getEventById(id);
  }

  const supabase = await createClient();
  let adminUserId = userId;

  if (!adminUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    adminUserId = user?.id;
  }

  if (!adminUserId) {
    notFound();
  }

  const eventQuery = supabase
    .from("events")
    .select(
      "id,name,slug,description,date_label,location,visibility,game_points_enabled,football_enabled",
    )
    .eq("id", id)
    .eq("owner_id", adminUserId)
    .single();

  const teamsQuery = options.includeTeams
    ? supabase
        .from("teams")
        .select("id,name,colour,badge_text,badge_url,game_points_scores(points)")
        .eq("event_id", id)
        .order("created_at")
    : Promise.resolve({ data: null });

  const [{ data: event, error }, { data: teams }] = await Promise.all([
    eventQuery,
    teamsQuery,
  ]);

  if (error || !event) {
    notFound();
  }

  return mapEvent(event, (teams ?? []).map((team) => mapTeam(team)));
}
