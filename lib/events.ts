import { notFound } from "next/navigation";
import { cache } from "react";

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
  football_enabled: boolean;
  team_size: number;
  football_match_minutes: number;
  sport: "football" | "basketball";
};

type TeamRow = {
  id: string;
  name: string;
  colour: string;
  badge_text: string | null;
  badge_url: string | null;
};

type PublicEventPayload = EventRow & {
  teams: Array<{
    id: string;
    name: string;
    colour: string;
    badge_text: string | null;
    badge_url: string | null;
  }>;
};

type AdminEventMembershipRow = {
  role: "owner" | "admin";
  events: EventRow | null;
};

type AdminEventDetailMembershipRow = {
  role: "owner" | "admin";
  events:
    | (EventRow & {
        teams: TeamRow[];
        event_viewer_access_codes:
          | { access_code: string }
          | Array<{ access_code: string }>
          | null;
      })
    | null;
};

export type EventAdminMember = {
  user_id: string;
  display_name: string;
  email: string;
  role: "owner" | "admin";
};

export type EventAdminCandidate = Omit<EventAdminMember, "role"> & {
  has_access: boolean;
};

function mapEvent(
  row: EventRow,
  teams: Team[] = [],
  adminRole?: "owner" | "admin",
): EventSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? "",
    dateLabel: row.date_label ?? "Date to be confirmed",
    location: row.location ?? "Location to be confirmed",
    visibility: row.visibility,
    teamSize: row.team_size,
    footballMatchMinutes: row.football_match_minutes,
    sport: row.sport,
    teams,
    adminRole,
  };
}

function mapTeam(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    colour: row.colour,
    badge: row.badge_text ?? row.name.charAt(0).toUpperCase(),
    badgeUrl: row.badge_url,
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
    })),
  );
}

export async function searchPublicEvents(query = "") {
  const normalizedQuery = query.trim();

  if (!isSupabaseConfigured()) {
    if (!normalizedQuery) {
      return sampleEvents;
    }

    const lowerQuery = normalizedQuery.toLowerCase();
    return sampleEvents.filter((event) =>
      event.name.toLowerCase().includes(lowerQuery),
    );
  }

  const supabase = await createClient();
  let eventQuery = supabase
    .from("events")
    .select(
      "id,name,slug,description,date_label,location,visibility,football_enabled,team_size,football_match_minutes,sport",
    )
    .eq("visibility", "public");

  if (normalizedQuery) {
    const escapedQuery = normalizedQuery.replace(/[%_]/g, "\\$&");
    eventQuery = eventQuery.ilike("name", `%${escapedQuery}%`);
  }

  const { data, error } = await eventQuery.order("created_at", {
    ascending: false,
  });

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
    return null;
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
        football_enabled: true,
        team_size: event.teamSize,
        football_match_minutes: event.footballMatchMinutes,
        sport: event.sport,
      },
      [],
    );
  }

  const supabase = await createClient();
  const { data: event, error } = await supabase
    .from("events")
    .select(
      "id,name,slug,description,date_label,location,visibility,football_enabled,team_size,football_match_minutes,sport",
    )
    .eq("slug", slug)
    .eq("visibility", "public")
    .single();

  if (error || !event) {
    notFound();
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
    .from("event_admins")
    .select(
      "role,events!inner(id,name,slug,description,date_label,location,visibility,football_enabled,team_size,football_match_minutes,sport)",
    )
    .eq("user_id", adminUserId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as unknown as AdminEventMembershipRow[]).flatMap(
    (membership) =>
      membership.events
        ? [mapEvent(membership.events, [], membership.role)]
        : [],
  );
}

const getAdminEventByIdCached = cache(async function getAdminEventByIdCached(
  id: string,
  userId?: string,
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

  const { data: membership, error } = await supabase
    .from("event_admins")
    .select(
      "role,events!inner(id,name,slug,description,date_label,location,visibility,football_enabled,team_size,football_match_minutes,sport,teams(id,name,colour,badge_text,badge_url),event_viewer_access_codes(access_code))",
    )
    .eq("event_id", id)
    .eq("user_id", adminUserId)
    .single();

  if (error || !membership) {
    notFound();
  }

  const detail = membership as unknown as AdminEventDetailMembershipRow;
  const event = detail.events;

  if (!event) {
    notFound();
  }

  const accessCodeRows = event.event_viewer_access_codes;
  const accessCode = Array.isArray(accessCodeRows)
    ? accessCodeRows[0]
    : accessCodeRows;

  return {
    ...mapEvent(
      event,
      event.teams.map((team) => mapTeam(team)),
      detail.role,
    ),
    viewerAccessCode: accessCode?.access_code ?? null,
  };
});

export function getAdminEventById(id: string, userId?: string) {
  return getAdminEventByIdCached(id, userId);
}

export async function getEventAdminMembers(eventId: string) {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_event_admin_members", {
    target_event_id: eventId,
  });

  if (error || !data) {
    return [];
  }

  return data as EventAdminMember[];
}

export async function searchEventAdminCandidates(
  eventId: string,
  query: string,
) {
  const normalizedQuery = query.trim();

  if (!isSupabaseConfigured() || normalizedQuery.length < 2) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "search_event_admin_candidates",
    {
      target_event_id: eventId,
      search_query: normalizedQuery,
    },
  );

  if (error || !data) {
    return [];
  }

  return data as EventAdminCandidate[];
}
