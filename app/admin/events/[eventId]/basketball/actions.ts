"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createRoundRobinFixtures } from "@/lib/football-fixtures";
import {
  createBasketballKnockoutFixtures,
  getBasketballKnockoutStartStage,
} from "@/lib/basketball-fixtures";
import type { BasketballStage } from "@/lib/basketball-types";
import type { Json } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, name: string) { return String(formData.get(name) ?? "").trim(); }
function path(eventId: string, tournamentId: string | null, params: Record<string, string>) {
  const query = new URLSearchParams(params); if (tournamentId) query.set("tournament", tournamentId);
  return `/admin/events/${eventId}/basketball?${query.toString()}`;
}
function fail(eventId: string, tournamentId: string | null, message: string): never { redirect(path(eventId, tournamentId, { error: message })); }

async function requireAdmin(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: membership } = await supabase.from("event_admins").select("role").eq("event_id", eventId).eq("user_id", user.id).maybeSingle();
  if (!membership) redirect("/admin/events");
  const { data: event } = await supabase.from("events").select("sport,slug").eq("id", eventId).single();
  if (!event || event.sport !== "basketball") redirect(`/admin/events/${eventId}`);
  return { supabase, userId: user.id, slug: event.slug };
}

async function refresh(eventId: string, slug: string) {
  revalidatePath(`/admin/events/${eventId}`); revalidatePath(`/admin/events/${eventId}/basketball`);
  revalidatePath(`/events/${slug}`); revalidatePath(`/events/${slug}/basketball`);
}

export async function createBasketballTournament(formData: FormData) {
  const eventId = text(formData, "event_id"); const name = text(formData, "name");
  const format = text(formData, "format") as "league" | "knockout";
  const gameMinutes = Number(text(formData, "game_minutes"));
  const teamIds = [...new Set(formData.getAll("team_ids").map(String).filter(Boolean))];
  const startStage = format === "knockout" ? getBasketballKnockoutStartStage(teamIds.length) : null;
  if (!eventId) redirect("/admin/events");
  if (!name) fail(eventId, null, "Tournament name is required");
  if (!["league", "knockout"].includes(format)) fail(eventId, null, "Choose a format");
  if (!Number.isInteger(gameMinutes) || gameMinutes < 1 || gameMinutes > 60) fail(eventId, null, "Game length must be between 1 and 60 minutes");
  if (teamIds.length < 2) fail(eventId, null, "Choose at least two teams");
  const { supabase, slug } = await requireAdmin(eventId);
  const { data: validTeams } = await supabase.from("teams").select("id").eq("event_id", eventId).in("id", teamIds);
  if (validTeams?.length !== teamIds.length) fail(eventId, null, "One or more teams are invalid");
  const creationId = text(formData, "creation_id");
  const tournamentId = creationId || crypto.randomUUID();
  const fixtures = format === "league"
    ? createRoundRobinFixtures(tournamentId, eventId, teamIds).map(({ id, tournament_id, event_id, home_team_id, away_team_id, stage, round_number, position, next_match_id, next_match_slot }) => ({ id, tournament_id, event_id, home_team_id, away_team_id, stage: stage === "round_of_16" ? "friendly" as const : stage, round_number, position, next_match_id, next_match_slot }))
    : createBasketballKnockoutFixtures(tournamentId, eventId, teamIds);
  const { error } = await supabase.rpc("create_basketball_tournament_atomic", {
    p_event_id: eventId,
    p_fixtures: fixtures as unknown as Json,
    p_format: format,
    p_game_minutes: gameMinutes,
    p_name: name,
    p_start_stage: startStage,
    p_team_ids: teamIds,
    p_tournament_id: tournamentId,
  });
  if (error) fail(eventId, null, error.message);
  await refresh(eventId, slug); redirect(path(eventId, tournamentId, { message: `${name} created with ${fixtures.length} games` }));
}

export async function deleteBasketballTournament(formData: FormData) {
  const eventId = text(formData, "event_id");
  const tournamentId = text(formData, "tournament_id");
  const confirm = text(formData, "confirm");
  if (!eventId || !tournamentId) redirect("/admin/events");
  if (confirm !== "DELETE") fail(eventId, tournamentId, "Type DELETE to remove a tournament");
  const { supabase, slug } = await requireAdmin(eventId);
  const { data: tournament } = await supabase
    .from("basketball_tournaments")
    .select("name")
    .eq("id", tournamentId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (!tournament) fail(eventId, null, "Tournament not found");
  const { error } = await supabase
    .from("basketball_tournaments")
    .delete()
    .eq("id", tournamentId)
    .eq("event_id", eventId);
  if (error) fail(eventId, tournamentId, error.message);
  await refresh(eventId, slug);
  redirect(path(eventId, null, { message: `${tournament.name} deleted` }));
}

export async function addBasketballMatch(formData: FormData) {
  const eventId = text(formData, "event_id");
  const tournamentId = text(formData, "tournament_id");
  const homeTeamId = text(formData, "home_team_id");
  const awayTeamId = text(formData, "away_team_id");
  const tipoffAt = text(formData, "kickoff_at_iso") || null;
  const court = text(formData, "court") || null;
  const requestedStage = text(formData, "stage") as BasketballStage;
  if (!eventId || !tournamentId) redirect("/admin/events");
  if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) fail(eventId, tournamentId, "Choose two different teams");
  const { supabase, slug } = await requireAdmin(eventId);
  const { data: tournament } = await supabase
    .from("basketball_tournaments")
    .select("format")
    .eq("id", tournamentId)
    .eq("event_id", eventId)
    .single();
  if (!tournament) fail(eventId, tournamentId, "Tournament not found");
  const { data: teamRows } = await supabase
    .from("basketball_tournament_teams")
    .select("team_id")
    .eq("tournament_id", tournamentId)
    .in("team_id", [homeTeamId, awayTeamId]);
  if (teamRows?.length !== 2) fail(eventId, tournamentId, "Both teams must be in this tournament");
  const { data: lastMatch } = await supabase
    .from("basketball_matches")
    .select("position")
    .eq("tournament_id", tournamentId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const allowedStages: BasketballStage[] = [
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
  const { error } = await supabase.from("basketball_matches").insert({
    tournament_id: tournamentId,
    event_id: eventId,
    home_team_id: homeTeamId,
    away_team_id: awayTeamId,
    stage,
    round_number: 1,
    position: (lastMatch?.position ?? 0) + 1,
    tipoff_at: tipoffAt,
    court,
  });
  if (error) fail(eventId, tournamentId, error.message);
  await refresh(eventId, slug);
  redirect(path(eventId, tournamentId, { message: "Game added" }));
}

async function managedMatch(formData: FormData) {
  const eventId = text(formData, "event_id"); const tournamentId = text(formData, "tournament_id"); const matchId = text(formData, "match_id");
  if (!eventId || !tournamentId || !matchId) redirect("/admin/events");
  const context = await requireAdmin(eventId);
  return { ...context, eventId, tournamentId, match: { id: matchId } };
}

function commandId(formData: FormData) {
  return text(formData, "command_id") || crypto.randomUUID();
}

function expectedVersion(formData: FormData) {
  const value = text(formData, "expected_version");
  const version = Number(value);
  return value && Number.isInteger(version) && version >= 0 ? version : null;
}

async function applyCommand(
  context: Awaited<ReturnType<typeof managedMatch>>,
  formData: FormData,
  command: string,
  payload: Record<string, string | number> = {},
) {
  return context.supabase.rpc("apply_basketball_match_command", {
    p_command: command,
    p_command_id: commandId(formData),
    p_expected_version: expectedVersion(formData),
    p_match_id: context.match.id,
    p_payload: payload,
  });
}

export async function adjustBasketballScore(formData: FormData) {
  const context = await managedMatch(formData); const side = text(formData, "side"); const points = Number(text(formData, "points"));
  const focused = text(formData, "focused") === "true";
  const failScore = (message: string): never => {
    if (focused) redirect(`/admin/events/${context.eventId}/basketball/matches/${context.match.id}?error=${encodeURIComponent(message)}`);
    fail(context.eventId, context.tournamentId, message);
  };
  if (!["home", "away"].includes(side) || ![-1, 1, 2, 3].includes(points)) failScore("Score change is invalid");
  formData.delete("expected_version");
  const { error } = await applyCommand(context, formData, "score_delta", {
    delta: points,
    device_id: text(formData, "device_id"),
    side,
  });
  if (error) failScore(error.message);
}

export async function setBasketballScore(formData: FormData) {
  const context = await managedMatch(formData);
  const homeScore = Number(text(formData, "home_score"));
  const awayScore = Number(text(formData, "away_score"));
  const focused = text(formData, "focused") === "true";
  const failScore = (message: string): never => {
    if (focused) redirect(`/admin/events/${context.eventId}/basketball/matches/${context.match.id}?error=${encodeURIComponent(message)}`);
    fail(context.eventId, context.tournamentId, message);
  };
  if (
    !Number.isInteger(homeScore) ||
    !Number.isInteger(awayScore) ||
    homeScore < 0 ||
    awayScore < 0
  ) {
    failScore("Scores must be whole numbers of zero or more");
  }
  const { error } = await applyCommand(context, formData, "set_score", {
    away_score: awayScore,
    device_id: text(formData, "device_id"),
    home_score: homeScore,
  });
  if (error) failScore(error.message);
  await refresh(context.eventId, context.slug);
  if (focused) redirect(`/admin/events/${context.eventId}/basketball/matches/${context.match.id}?message=Score%20corrected`);
  redirect(path(context.eventId, context.tournamentId, { message: "Score corrected" }));
}

export async function updateBasketballSchedule(formData: FormData) {
  const context = await managedMatch(formData);
  const tipoffAt = text(formData, "kickoff_at_iso") || null;
  const court = text(formData, "court") || null;
  const { error } = await applyCommand(context, formData, "schedule", {
    court: court ?? "",
    tipoff_at: tipoffAt ?? "",
  });
  if (error) fail(context.eventId, context.tournamentId, error.message);
  await refresh(context.eventId, context.slug);
  redirect(path(context.eventId, context.tournamentId, { message: "Game schedule updated" }));
}

export async function updateBasketballLifecycle(formData: FormData) {
  const context = await managedMatch(formData); const command = text(formData, "command"); const focused = text(formData, "focused") === "true";
  const failGame = (message: string): never => {
    if (focused) redirect(`/admin/events/${context.eventId}/basketball/matches/${context.match.id}?error=${encodeURIComponent(message)}`);
    fail(context.eventId, context.tournamentId, message);
  };
  const { error } = await applyCommand(context, formData, command, {
    device_id: text(formData, "device_id"),
  });
  if (error) failGame(error.message);
  await refresh(context.eventId, context.slug);
  const messages: Record<string, string> = {
    claim_control: "Game control claimed",
    finish: "Final score published",
    release_control: "Game control released",
    reopen: "Game reopened",
    start: "Game is live",
    take_control: "Game control taken over",
  };
  const message = messages[command] ?? "Game updated";
  if (focused) redirect(`/admin/events/${context.eventId}/basketball/matches/${context.match.id}?message=${encodeURIComponent(message)}`);
  redirect(path(context.eventId, context.tournamentId, { message }));
}
