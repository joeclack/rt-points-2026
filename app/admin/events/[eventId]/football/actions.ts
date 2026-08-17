"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createKnockoutFixtures,
  createRoundRobinFixtures,
} from "@/lib/football-fixtures";
import type {
  FootballKnockoutStage,
  FootballMatchStage,
  FootballTournamentFormat,
} from "@/lib/football-types";
import type { Json } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

function getText(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function getEventId(formData: FormData) {
  const eventId = getText(formData, "event_id");

  if (!eventId) {
    redirect("/admin/events");
  }

  return eventId;
}

function getTournamentId(formData: FormData) {
  const tournamentId = getText(formData, "tournament_id");

  if (!tournamentId) {
    throw new Error("Tournament ID is required");
  }

  return tournamentId;
}

function getMatchId(formData: FormData) {
  const matchId = getText(formData, "match_id");

  if (!matchId) {
    throw new Error("Match ID is required");
  }

  return matchId;
}

function footballAdminPath(
  eventId: string,
  tournamentId: string | null,
  params: Record<string, string>,
) {
  const searchParams = new URLSearchParams(params);

  if (tournamentId) {
    searchParams.set("tournament", tournamentId);
  }

  return `/admin/events/${eventId}/football?${searchParams.toString()}`;
}

function fail(
  eventId: string,
  tournamentId: string | null,
  message: string,
): never {
  redirect(footballAdminPath(eventId, tournamentId, { error: message }));
}

async function requireEventAdmin(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("event_admins")
    .select("role")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    redirect("/admin/events");
  }

  return { supabase, userId: user.id };
}

async function revalidateFootballPages(eventId: string) {
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("slug")
    .eq("id", eventId)
    .single();

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/admin/events/${eventId}/football`);

  if (event?.slug) {
    revalidatePath(`/events/${event.slug}`);
    revalidatePath(`/events/${event.slug}/football`);
  }
}

export async function createFootballTournament(formData: FormData) {
  const eventId = getEventId(formData);
  const name = getText(formData, "name");
  const format = getText(formData, "format") as FootballTournamentFormat;
  const startStage = getText(
    formData,
    "start_stage",
  ) as FootballKnockoutStage;
  const teamIds = [
    ...new Set(
      formData
        .getAll("team_ids")
        .map((value) => String(value))
        .filter(Boolean),
    ),
  ];

  if (!name) {
    fail(eventId, null, "Tournament name is required");
  }

  if (!["league", "knockout"].includes(format)) {
    fail(eventId, null, "Choose a tournament type");
  }

  if (teamIds.length < 2) {
    fail(eventId, null, "Choose at least two teams");
  }

  const requiredKnockoutTeams: Record<FootballKnockoutStage, number> = {
    quarter_final: 8,
    semi_final: 4,
    final: 2,
  };

  if (
    format === "knockout" &&
    (!requiredKnockoutTeams[startStage] ||
      teamIds.length !== requiredKnockoutTeams[startStage])
  ) {
    const count = requiredKnockoutTeams[startStage] ?? 2;
    fail(
      eventId,
      null,
      `${startStage === "quarter_final" ? "Quarter-finals" : startStage === "semi_final" ? "Semi-finals" : "A final"} needs exactly ${count} teams`,
    );
  }

  const { supabase } = await requireEventAdmin(eventId);
  const { data: validTeams, error: teamError } = await supabase
    .from("teams")
    .select("id")
    .eq("event_id", eventId)
    .in("id", teamIds);

  if (teamError || validTeams?.length !== teamIds.length) {
    fail(eventId, null, teamError?.message ?? "One or more teams are invalid");
  }

  const tournamentId = getText(formData, "creation_id") || crypto.randomUUID();

  const fixtures =
    format === "league"
      ? createRoundRobinFixtures(tournamentId, eventId, teamIds)
      : createKnockoutFixtures(
          tournamentId,
          eventId,
          teamIds,
          startStage,
        );
  const { error } = await supabase.rpc("create_football_tournament_atomic", {
    p_event_id: eventId,
    p_fixtures: fixtures as unknown as Json,
    p_format: format,
    p_name: name,
    p_start_stage: format === "knockout" ? startStage : null,
    p_team_ids: teamIds,
    p_tournament_id: tournamentId,
  });

  if (error) {
    fail(eventId, null, error.message);
  }

  await revalidateFootballPages(eventId);
  redirect(
    footballAdminPath(eventId, tournamentId, {
      message: `${name} created with ${fixtures.length} match${fixtures.length === 1 ? "" : "es"}`,
    }),
  );
}

export async function addFootballMatch(formData: FormData) {
  const eventId = getEventId(formData);
  const tournamentId = getTournamentId(formData);
  const homeTeamId = getText(formData, "home_team_id");
  const awayTeamId = getText(formData, "away_team_id");
  const kickoffAt = getText(formData, "kickoff_at_iso") || null;
  const venue = getText(formData, "venue") || null;
  const requestedStage = getText(formData, "stage") as FootballMatchStage;

  if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) {
    fail(eventId, tournamentId, "Choose two different teams");
  }

  const { supabase } = await requireEventAdmin(eventId);
  const { data: tournament } = await supabase
    .from("football_tournaments")
    .select("format")
    .eq("id", tournamentId)
    .eq("event_id", eventId)
    .single();

  if (!tournament) {
    fail(eventId, tournamentId, "Tournament not found");
  }

  const { data: teamRows } = await supabase
    .from("football_tournament_teams")
    .select("team_id")
    .eq("tournament_id", tournamentId)
    .in("team_id", [homeTeamId, awayTeamId]);

  if (teamRows?.length !== 2) {
    fail(eventId, tournamentId, "Both teams must be in this tournament");
  }

  const { data: lastMatch } = await supabase
    .from("football_matches")
    .select("position")
    .eq("tournament_id", tournamentId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const allowedStages: FootballMatchStage[] = [
    "league",
    "quarter_final",
    "semi_final",
    "third_place",
    "final",
    "friendly",
  ];
  const stage = allowedStages.includes(requestedStage)
    ? requestedStage
    : tournament.format === "league"
      ? "league"
      : "friendly";
  const { error } = await supabase.from("football_matches").insert({
    tournament_id: tournamentId,
    event_id: eventId,
    home_team_id: homeTeamId,
    away_team_id: awayTeamId,
    stage,
    round_number: 1,
    position: (lastMatch?.position ?? 0) + 1,
    kickoff_at: kickoffAt,
    venue,
  });

  if (error) {
    fail(eventId, tournamentId, error.message);
  }

  await revalidateFootballPages(eventId);
  redirect(
    footballAdminPath(eventId, tournamentId, { message: "Match added" }),
  );
}

export async function updateFootballMatchSchedule(formData: FormData) {
  const eventId = getEventId(formData);
  const tournamentId = getTournamentId(formData);
  const matchId = getMatchId(formData);
  const kickoffAt = getText(formData, "kickoff_at_iso") || null;
  const venue = getText(formData, "venue") || null;
  const { supabase, userId } = await requireEventAdmin(eventId);
  const { data: match } = await supabase
    .from("football_matches")
    .select("home_score,away_score,status")
    .eq("id", matchId)
    .eq("tournament_id", tournamentId)
    .eq("event_id", eventId)
    .single();

  if (!match) {
    fail(eventId, tournamentId, "Match not found");
  }

  if (!["scheduled", "postponed"].includes(match.status)) {
    fail(eventId, tournamentId, "Kickoff can only be edited before a match");
  }

  const { error } = await supabase
    .from("football_matches")
    .update({ kickoff_at: kickoffAt, venue })
    .eq("id", matchId);

  if (error) {
    fail(eventId, tournamentId, error.message);
  }

  await supabase.from("football_match_events").insert({
    event_id: eventId,
    tournament_id: tournamentId,
    match_id: matchId,
    actor_id: userId,
    event_type: "schedule",
    home_score: match.home_score,
    away_score: match.away_score,
    note: kickoffAt ? "Kickoff time updated" : "Kickoff time cleared",
  });

  await revalidateFootballPages(eventId);
  redirect(
    footballAdminPath(eventId, tournamentId, { message: "Schedule updated" }),
  );
}

async function readManagedMatch(
  eventId: string,
  tournamentId: string,
  matchId: string,
) {
  const { supabase } = await requireEventAdmin(eventId);
  const { data: match, error } = await supabase
    .from("football_matches")
    .select(
      "id,tournament_id,event_id,home_team_id,away_team_id,status,home_score,away_score,next_match_id,next_match_slot,winner_team_id,second_half_started_at,stoppage_started_at,first_half_stoppage_seconds,second_half_stoppage_seconds,control_version,controller_device_id,controller_claimed_at",
    )
    .eq("id", matchId)
    .eq("tournament_id", tournamentId)
    .eq("event_id", eventId)
    .single();

  if (error || !match) {
    fail(eventId, tournamentId, error?.message ?? "Match not found");
  }

  const { data: tournament } = await supabase
    .from("football_tournaments")
    .select("format")
    .eq("id", tournamentId)
    .eq("event_id", eventId)
    .single();

  if (!tournament) {
    fail(eventId, tournamentId, "Tournament not found");
  }

  return { supabase, match, tournament };
}

function getCommandId(formData: FormData) {
  return getText(formData, "command_id") || crypto.randomUUID();
}

function getExpectedVersion(formData: FormData) {
  const value = getText(formData, "expected_version");
  const version = Number(value);
  return value && Number.isInteger(version) && version >= 0 ? version : null;
}

async function applyMatchCommand(
  context: Awaited<ReturnType<typeof readManagedMatch>>,
  formData: FormData,
  command: string,
  payload: Record<string, string | number> = {},
) {
  return context.supabase.rpc("apply_football_match_command", {
    p_command: command,
    p_command_id: getCommandId(formData),
    p_expected_version: getExpectedVersion(formData),
    p_match_id: context.match.id,
    p_payload: payload,
  });
}

export async function adjustFootballMatchScore(formData: FormData) {
  const eventId = getEventId(formData);
  const tournamentId = getTournamentId(formData);
  const matchId = getMatchId(formData);
  const side = getText(formData, "side");
  const delta = Number(getText(formData, "delta"));
  const focused = getText(formData, "focused") === "true";
  const failScore = (message: string): never => {
    if (focused) {
      redirect(
        `/admin/events/${eventId}/football/matches/${matchId}?error=${encodeURIComponent(message)}`,
      );
    }

    fail(eventId, tournamentId, message);
  };
  const context = await readManagedMatch(eventId, tournamentId, matchId);

  if (!["live", "halftime"].includes(context.match.status)) {
    failScore("Start or reopen the match to change its score");
  }

  if (!["home", "away"].includes(side) || ![-1, 1].includes(delta)) {
    failScore("Score change is invalid");
  }

  // Score deltas are commutative and serialized by the database row lock.
  formData.delete("expected_version");
  const { error } = await applyMatchCommand(context, formData, "score_delta", {
    delta,
    device_id: getText(formData, "device_id"),
    side,
  });

  if (error) {
    failScore(error.message);
  }

  await revalidateFootballPages(eventId);
}

export async function setFootballMatchScore(formData: FormData) {
  const eventId = getEventId(formData);
  const tournamentId = getTournamentId(formData);
  const matchId = getMatchId(formData);
  const homeScore = Number(getText(formData, "home_score"));
  const awayScore = Number(getText(formData, "away_score"));
  const focused = getText(formData, "focused") === "true";
  const failScore = (message: string): never => {
    if (focused) {
      redirect(
        `/admin/events/${eventId}/football/matches/${matchId}?error=${encodeURIComponent(message)}`,
      );
    }

    fail(eventId, tournamentId, message);
  };
  const context = await readManagedMatch(eventId, tournamentId, matchId);

  if (!["live", "halftime"].includes(context.match.status)) {
    failScore("Start or reopen the match to correct its score");
  }

  if (
    !Number.isInteger(homeScore) ||
    !Number.isInteger(awayScore) ||
    homeScore < 0 ||
    awayScore < 0
  ) {
    failScore("Scores must be whole numbers of zero or more");
  }

  const { error } = await applyMatchCommand(context, formData, "set_score", {
    away_score: awayScore,
    device_id: getText(formData, "device_id"),
    home_score: homeScore,
  });

  if (error) {
    failScore(error.message);
  }

  await revalidateFootballPages(eventId);
  if (focused) {
    redirect(
      `/admin/events/${eventId}/football/matches/${matchId}?message=Score%20corrected`,
    );
  }
  redirect(
    footballAdminPath(eventId, tournamentId, { message: "Score corrected" }),
  );
}

export async function updateFootballMatchLifecycle(formData: FormData) {
  const eventId = getEventId(formData);
  const tournamentId = getTournamentId(formData);
  const matchId = getMatchId(formData);
  const command = getText(formData, "command");
  const focused = getText(formData, "focused") === "true";
  const failMatch = (message: string): never => {
    if (focused) {
      redirect(
        `/admin/events/${eventId}/football/matches/${matchId}?error=${encodeURIComponent(message)}`,
      );
    }

    fail(eventId, tournamentId, message);
  };
  const context = await readManagedMatch(eventId, tournamentId, matchId);
  const { error } = await applyMatchCommand(context, formData, command, {
    device_id: getText(formData, "device_id"),
  });

  if (error) {
    failMatch(error.message);
  }

  const messages: Record<string, string> = {
    claim_control: "Match control claimed",
    end_stoppage: "Stoppage tracking stopped",
    finish: "Full-time result published",
    halftime: "Half-time set",
    release_control: "Match control released",
    reopen: "Match reopened",
    start: "Match is live",
    start_second_half: "Second half started",
    start_stoppage: "Stoppage tracking started",
    take_control: "Match control taken over",
  };
  const message = messages[command] ?? "Match updated";

  await revalidateFootballPages(eventId);
  if (focused) {
    redirect(
      `/admin/events/${eventId}/football/matches/${matchId}?message=${encodeURIComponent(message)}`,
    );
  }
  redirect(footballAdminPath(eventId, tournamentId, { message }));
}
