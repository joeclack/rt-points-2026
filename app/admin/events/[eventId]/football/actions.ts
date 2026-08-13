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

  const { supabase, userId } = await requireEventAdmin(eventId);
  const { data: validTeams, error: teamError } = await supabase
    .from("teams")
    .select("id")
    .eq("event_id", eventId)
    .in("id", teamIds);

  if (teamError || validTeams?.length !== teamIds.length) {
    fail(eventId, null, teamError?.message ?? "One or more teams are invalid");
  }

  const tournamentId = crypto.randomUUID();
  const { error: tournamentError } = await supabase
    .from("football_tournaments")
    .insert({
      id: tournamentId,
      event_id: eventId,
      name,
      format,
      start_stage: format === "knockout" ? startStage : null,
      created_by: userId,
    });

  if (tournamentError) {
    fail(eventId, null, tournamentError.message);
  }

  const { error: membershipError } = await supabase
    .from("football_tournament_teams")
    .insert(
      teamIds.map((teamId, index) => ({
        tournament_id: tournamentId,
        team_id: teamId,
        seed: index + 1,
      })),
    );

  if (membershipError) {
    await supabase
      .from("football_tournaments")
      .delete()
      .eq("id", tournamentId);
    fail(eventId, null, membershipError.message);
  }

  const fixtures =
    format === "league"
      ? createRoundRobinFixtures(tournamentId, eventId, teamIds)
      : createKnockoutFixtures(
          tournamentId,
          eventId,
          teamIds,
          startStage,
        );
  const { error: fixtureError } = await supabase
    .from("football_matches")
    .insert(fixtures);

  if (fixtureError) {
    await supabase
      .from("football_tournaments")
      .delete()
      .eq("id", tournamentId);
    fail(eventId, null, fixtureError.message);
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
  const { supabase, userId } = await requireEventAdmin(eventId);
  const { data: match, error } = await supabase
    .from("football_matches")
    .select(
      "id,tournament_id,event_id,home_team_id,away_team_id,status,home_score,away_score,next_match_id,next_match_slot,winner_team_id,second_half_started_at",
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

  return { supabase, userId, match, tournament };
}

async function addMatchHistory(
  context: Awaited<ReturnType<typeof readManagedMatch>>,
  eventType:
    | "score"
    | "kickoff"
    | "halftime"
    | "resume"
    | "full_time"
    | "reopen",
  homeScore: number,
  awayScore: number,
  note: string,
) {
  await context.supabase.from("football_match_events").insert({
    event_id: context.match.event_id,
    tournament_id: context.match.tournament_id,
    match_id: context.match.id,
    actor_id: context.userId,
    event_type: eventType,
    home_score: homeScore,
    away_score: awayScore,
    note,
  });
}

async function refreshTournamentStatus(
  context: Awaited<ReturnType<typeof readManagedMatch>>,
) {
  const { data: matches } = await context.supabase
    .from("football_matches")
    .select("status")
    .eq("tournament_id", context.match.tournament_id);
  const completed = (matches ?? []).every((match) =>
    ["full_time", "cancelled"].includes(match.status),
  );

  await context.supabase
    .from("football_tournaments")
    .update({ status: completed ? "completed" : "live" })
    .eq("id", context.match.tournament_id);
}

export async function adjustFootballMatchScore(formData: FormData) {
  const eventId = getEventId(formData);
  const tournamentId = getTournamentId(formData);
  const matchId = getMatchId(formData);
  const side = getText(formData, "side");
  const delta = Number(getText(formData, "delta"));
  const context = await readManagedMatch(eventId, tournamentId, matchId);

  if (!["live", "halftime"].includes(context.match.status)) {
    fail(eventId, tournamentId, "Start or reopen the match to change its score");
  }

  if (!["home", "away"].includes(side) || ![-1, 1].includes(delta)) {
    fail(eventId, tournamentId, "Score change is invalid");
  }

  const homeScore =
    side === "home"
      ? Math.max(0, context.match.home_score + delta)
      : context.match.home_score;
  const awayScore =
    side === "away"
      ? Math.max(0, context.match.away_score + delta)
      : context.match.away_score;
  const { error } = await context.supabase
    .from("football_matches")
    .update({ home_score: homeScore, away_score: awayScore })
    .eq("id", matchId);

  if (error) {
    fail(eventId, tournamentId, error.message);
  }

  await addMatchHistory(
    context,
    "score",
    homeScore,
    awayScore,
    `${side === "home" ? "Home" : "Away"} score ${delta > 0 ? "increased" : "decreased"}`,
  );
  await revalidateFootballPages(eventId);
}

export async function setFootballMatchScore(formData: FormData) {
  const eventId = getEventId(formData);
  const tournamentId = getTournamentId(formData);
  const matchId = getMatchId(formData);
  const homeScore = Number(getText(formData, "home_score"));
  const awayScore = Number(getText(formData, "away_score"));
  const context = await readManagedMatch(eventId, tournamentId, matchId);

  if (!["live", "halftime"].includes(context.match.status)) {
    fail(eventId, tournamentId, "Start or reopen the match to correct its score");
  }

  if (
    !Number.isInteger(homeScore) ||
    !Number.isInteger(awayScore) ||
    homeScore < 0 ||
    awayScore < 0
  ) {
    fail(eventId, tournamentId, "Scores must be whole numbers of zero or more");
  }

  const { error } = await context.supabase
    .from("football_matches")
    .update({ home_score: homeScore, away_score: awayScore })
    .eq("id", matchId);

  if (error) {
    fail(eventId, tournamentId, error.message);
  }

  await addMatchHistory(
    context,
    "score",
    homeScore,
    awayScore,
    "Exact score correction",
  );
  await revalidateFootballPages(eventId);
  redirect(
    footballAdminPath(eventId, tournamentId, { message: "Score corrected" }),
  );
}

export async function updateFootballMatchLifecycle(formData: FormData) {
  const eventId = getEventId(formData);
  const tournamentId = getTournamentId(formData);
  const matchId = getMatchId(formData);
  const command = getText(formData, "command");
  const context = await readManagedMatch(eventId, tournamentId, matchId);
  const now = new Date().toISOString();

  if (command === "start") {
    if (
      context.match.status !== "scheduled" ||
      !context.match.home_team_id ||
      !context.match.away_team_id
    ) {
      fail(eventId, tournamentId, "This match is not ready to start");
    }

    const { error } = await context.supabase
      .from("football_matches")
      .update({
        status: "live",
        started_at: now,
        second_half_started_at: null,
        ended_at: null,
      })
      .eq("id", matchId);

    if (error) {
      fail(eventId, tournamentId, error.message);
    }

    await context.supabase
      .from("football_tournaments")
      .update({ status: "live" })
      .eq("id", tournamentId);
    await addMatchHistory(
      context,
      "kickoff",
      context.match.home_score,
      context.match.away_score,
      "Match started",
    );
  } else if (command === "halftime") {
    if (
      context.match.status !== "live" ||
      context.match.second_half_started_at
    ) {
      fail(eventId, tournamentId, "Only the first half can reach half-time");
    }

    const { error } = await context.supabase
      .from("football_matches")
      .update({ status: "halftime" })
      .eq("id", matchId);

    if (error) {
      fail(eventId, tournamentId, error.message);
    }

    await addMatchHistory(
      context,
      "halftime",
      context.match.home_score,
      context.match.away_score,
      "Half-time",
    );
  } else if (command === "resume") {
    if (context.match.status !== "halftime") {
      fail(eventId, tournamentId, "Only a half-time match can resume");
    }

    const { error } = await context.supabase
      .from("football_matches")
      .update({ status: "live", second_half_started_at: now })
      .eq("id", matchId);

    if (error) {
      fail(eventId, tournamentId, error.message);
    }

    await addMatchHistory(
      context,
      "resume",
      context.match.home_score,
      context.match.away_score,
      "Second half started",
    );
  } else if (command === "finish") {
    if (!["live", "halftime"].includes(context.match.status)) {
      fail(eventId, tournamentId, "Only a started match can finish");
    }

    if (
      context.tournament.format === "knockout" &&
      context.match.home_score === context.match.away_score
    ) {
      fail(
        eventId,
        tournamentId,
        "Knockout matches need a winner before full-time",
      );
    }

    const winnerTeamId =
      context.match.home_score === context.match.away_score
        ? null
        : context.match.home_score > context.match.away_score
          ? context.match.home_team_id
          : context.match.away_team_id;
    const { error } = await context.supabase
      .from("football_matches")
      .update({
        status: "full_time",
        winner_team_id: winnerTeamId,
        ended_at: now,
      })
      .eq("id", matchId);

    if (error) {
      fail(eventId, tournamentId, error.message);
    }

    if (
      winnerTeamId &&
      context.match.next_match_id &&
      context.match.next_match_slot
    ) {
      const advanceQuery =
        context.match.next_match_slot === "home"
          ? context.supabase
              .from("football_matches")
              .update({ home_team_id: winnerTeamId })
          : context.supabase
              .from("football_matches")
              .update({ away_team_id: winnerTeamId });
      const { error: advanceError } = await advanceQuery
        .eq("id", context.match.next_match_id)
        .eq("status", "scheduled");

      if (advanceError) {
        fail(eventId, tournamentId, advanceError.message);
      }
    }

    await addMatchHistory(
      context,
      "full_time",
      context.match.home_score,
      context.match.away_score,
      "Full-time result published",
    );
    await refreshTournamentStatus(context);
  } else if (command === "reopen") {
    if (context.match.status !== "full_time") {
      fail(eventId, tournamentId, "Only a completed match can be reopened");
    }

    if (context.match.next_match_id && context.match.next_match_slot) {
      const { data: nextMatch } = await context.supabase
        .from("football_matches")
        .select("status,home_team_id,away_team_id")
        .eq("id", context.match.next_match_id)
        .single();

      if (nextMatch && nextMatch.status !== "scheduled") {
        fail(
          eventId,
          tournamentId,
          "The next knockout match has started, so this result can no longer be reopened",
        );
      }

      if (nextMatch && context.match.winner_team_id) {
        const currentSlotTeam =
          context.match.next_match_slot === "home"
            ? nextMatch.home_team_id
            : nextMatch.away_team_id;

        if (currentSlotTeam === context.match.winner_team_id) {
          const clearSlotQuery =
            context.match.next_match_slot === "home"
              ? context.supabase
                  .from("football_matches")
                  .update({ home_team_id: null })
              : context.supabase
                  .from("football_matches")
                  .update({ away_team_id: null });

          await clearSlotQuery.eq("id", context.match.next_match_id);
        }
      }
    }

    const { error } = await context.supabase
      .from("football_matches")
      .update({
        status: "live",
        winner_team_id: null,
        second_half_started_at: now,
        ended_at: null,
      })
      .eq("id", matchId);

    if (error) {
      fail(eventId, tournamentId, error.message);
    }

    await context.supabase
      .from("football_tournaments")
      .update({ status: "live" })
      .eq("id", tournamentId);
    await addMatchHistory(
      context,
      "reopen",
      context.match.home_score,
      context.match.away_score,
      "Result reopened for correction",
    );
  } else {
    fail(eventId, tournamentId, "Match action is invalid");
  }

  await revalidateFootballPages(eventId);
  redirect(
    footballAdminPath(eventId, tournamentId, {
      message:
        command === "start"
          ? "Match is live"
          : command === "halftime"
            ? "Half-time set"
            : command === "resume"
              ? "Match resumed"
              : command === "finish"
                ? "Full-time result published"
                : "Match reopened",
    }),
  );
}
