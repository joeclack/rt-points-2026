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

type PublicEventPayload = EventRow & {
  teams: Array<{
    id: string;
    name: string;
    colour: string;
    badge_text: string | null;
    badge_url: string | null;
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

function mapPublicEventPayload(payload: PublicEventPayload): EventSummary {
  return mapEvent(
    payload,
    payload.teams.map((team) => ({
      id: team.id,
      name: team.name,
      colour: team.colour,
      badge: team.badge_text ?? team.name.charAt(0).toUpperCase(),
      badgeUrl: team.badge_url,
      points: team.points,
    })),
  );
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

export async function getPublicEventBySlug(slug: string, accessCode = "") {
  if (!isSupabaseConfigured()) {
    return getEventBySlug(slug);
  }

  const supabase = await createClient();
  const { data: event, error } = await supabase.rpc(
    "get_public_event_for_viewer",
    {
      event_slug: slug,
      submitted_code: accessCode,
    },
  );

  if (error || !event) {
    return getEventBySlug(slug);
  }

  return mapPublicEventPayload(event as PublicEventPayload);
}

export async function getPublicEventShellBySlug(slug: string) {
  if (!isSupabaseConfigured()) {
    const event = getEventBySlug(slug);

    return mapEvent(
      {
        id: event.id,
        name: event.name,
        slug: event.slug,
        description: event.description,
        date_label: event.dateLabel,
        location: event.location,
        visibility: event.visibility,
        game_points_enabled: event.trackers.includes("game-points"),
        football_enabled: event.trackers.includes("football"),
      },
      [],
    );
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

  return mapEvent(event);
}

export async function eventRequiresViewerAccess(slug: string) {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const supabase = await createClient();
  const { data } = await supabase.rpc("event_requires_viewer_access", {
    event_slug: slug,
  });

  return Boolean(data);
}

export async function verifyViewerAccess(slug: string, code: string) {
  if (!isSupabaseConfigured()) {
    return true;
  }

  const supabase = await createClient();
  const { data } = await supabase.rpc("verify_event_viewer_access", {
    event_slug: slug,
    submitted_code: code,
  });

  return Boolean(data);
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

  const accessCodeQuery = supabase
    .from("event_viewer_access_codes")
    .select("access_code")
    .eq("event_id", id)
    .maybeSingle();

  const [
    { data: event, error },
    { data: teams },
    { data: accessCode },
  ] = await Promise.all([
    eventQuery,
    teamsQuery,
    accessCodeQuery,
  ]);

  if (error || !event) {
    notFound();
  }

  return {
    ...mapEvent(event, (teams ?? []).map((team) => mapTeam(team))),
    viewerAccessCode: accessCode?.access_code ?? null,
  };
}
