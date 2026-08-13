"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createKnockoutFixtures, createRoundRobinFixtures } from "@/lib/football-fixtures";
import type { FootballKnockoutStage } from "@/lib/football-types";
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
  const startStage = text(formData, "start_stage") as FootballKnockoutStage;
  const gameMinutes = Number(text(formData, "game_minutes"));
  const teamIds = [...new Set(formData.getAll("team_ids").map(String).filter(Boolean))];
  if (!eventId) redirect("/admin/events");
  if (!name) fail(eventId, null, "Tournament name is required");
  if (!["league", "knockout"].includes(format)) fail(eventId, null, "Choose a format");
  if (!Number.isInteger(gameMinutes) || gameMinutes < 1 || gameMinutes > 60) fail(eventId, null, "Game length must be between 1 and 60 minutes");
  if (teamIds.length < 2) fail(eventId, null, "Choose at least two teams");
  const counts: Record<FootballKnockoutStage, number> = { quarter_final: 8, semi_final: 4, final: 2 };
  if (format === "knockout" && teamIds.length !== counts[startStage]) fail(eventId, null, `This knockout round needs exactly ${counts[startStage] ?? 2} teams`);
  const { supabase, userId, slug } = await requireAdmin(eventId);
  const { data: validTeams } = await supabase.from("teams").select("id").eq("event_id", eventId).in("id", teamIds);
  if (validTeams?.length !== teamIds.length) fail(eventId, null, "One or more teams are invalid");
  const tournamentId = crypto.randomUUID();
  const { error } = await supabase.from("basketball_tournaments").insert({ id: tournamentId, event_id: eventId, name, format, start_stage: format === "knockout" ? startStage : null, game_minutes: gameMinutes, created_by: userId });
  if (error) fail(eventId, null, error.message);
  const { error: memberError } = await supabase.from("basketball_tournament_teams").insert(teamIds.map((teamId, index) => ({ tournament_id: tournamentId, team_id: teamId, seed: index + 1 })));
  if (memberError) { await supabase.from("basketball_tournaments").delete().eq("id", tournamentId); fail(eventId, null, memberError.message); }
  const base = format === "league" ? createRoundRobinFixtures(tournamentId, eventId, teamIds) : createKnockoutFixtures(tournamentId, eventId, teamIds, startStage);
  const fixtures = base.map(({ id, tournament_id, event_id, home_team_id, away_team_id, stage, round_number, position, next_match_id, next_match_slot }) => ({ id, tournament_id, event_id, home_team_id, away_team_id, stage: stage === "round_of_16" ? "friendly" as const : stage, round_number, position, next_match_id, next_match_slot }));
  const { error: fixtureError } = await supabase.from("basketball_matches").insert(fixtures);
  if (fixtureError) { await supabase.from("basketball_tournaments").delete().eq("id", tournamentId); fail(eventId, null, fixtureError.message); }
  await refresh(eventId, slug); redirect(path(eventId, tournamentId, { message: `${name} created with ${fixtures.length} games` }));
}

async function managedMatch(formData: FormData) {
  const eventId = text(formData, "event_id"); const tournamentId = text(formData, "tournament_id"); const matchId = text(formData, "match_id");
  if (!eventId || !tournamentId || !matchId) redirect("/admin/events");
  const context = await requireAdmin(eventId);
  const { data: match, error } = await context.supabase.from("basketball_matches").select("*").eq("id", matchId).eq("tournament_id", tournamentId).eq("event_id", eventId).single();
  if (error || !match) fail(eventId, tournamentId, "Game not found");
  const { data: tournament } = await context.supabase.from("basketball_tournaments").select("format").eq("id", tournamentId).single();
  if (!tournament) fail(eventId, tournamentId, "Tournament not found");
  return { ...context, eventId, tournamentId, match };
}

export async function adjustBasketballScore(formData: FormData) {
  const context = await managedMatch(formData); const side = text(formData, "side"); const points = Number(text(formData, "points"));
  if (context.match.status !== "live") fail(context.eventId, context.tournamentId, "Start the game before scoring");
  if (!["home", "away"].includes(side) || ![-1, 1, 2, 3].includes(points)) fail(context.eventId, context.tournamentId, "Score change is invalid");
  const homeScore = side === "home" ? Math.max(0, context.match.home_score + points) : context.match.home_score;
  const awayScore = side === "away" ? Math.max(0, context.match.away_score + points) : context.match.away_score;
  const { error } = await context.supabase.from("basketball_matches").update({ home_score: homeScore, away_score: awayScore }).eq("id", context.match.id);
  if (error) fail(context.eventId, context.tournamentId, error.message);
  await refresh(context.eventId, context.slug);
}

export async function updateBasketballSchedule(formData: FormData) {
  const context = await managedMatch(formData);
  const tipoffAt = text(formData, "kickoff_at_iso") || null;
  const court = text(formData, "court") || null;
  if (!['scheduled', 'postponed'].includes(context.match.status)) fail(context.eventId, context.tournamentId, "Tip-off can only be changed before a game");
  const { error } = await context.supabase.from("basketball_matches").update({ tipoff_at: tipoffAt, court }).eq("id", context.match.id);
  if (error) fail(context.eventId, context.tournamentId, error.message);
  await refresh(context.eventId, context.slug);
  redirect(path(context.eventId, context.tournamentId, { message: "Game schedule updated" }));
}

export async function updateBasketballLifecycle(formData: FormData) {
  const context = await managedMatch(formData); const command = text(formData, "command"); const focused = text(formData, "focused") === "true"; const now = new Date().toISOString();
  const failGame = (message: string): never => {
    if (focused) redirect(`/admin/events/${context.eventId}/basketball/matches/${context.match.id}?error=${encodeURIComponent(message)}`);
    fail(context.eventId, context.tournamentId, message);
  };
  if (command === "start") {
    if (context.match.status !== "scheduled" || !context.match.home_team_id || !context.match.away_team_id) failGame("This game is not ready to start");
    const { error } = await context.supabase.from("basketball_matches").update({ status: "live", started_at: now, ended_at: null }).eq("id", context.match.id);
    if (error) failGame(error.message);
    await context.supabase.from("basketball_tournaments").update({ status: "live" }).eq("id", context.tournamentId);
  } else if (command === "finish") {
    if (context.match.status !== "live") failGame("Only a live game can finish");
    if (context.match.home_score === context.match.away_score) failGame("Basketball games need a winner. Play next basket wins.");
    const winnerId = context.match.home_score > context.match.away_score ? context.match.home_team_id : context.match.away_team_id;
    const { error } = await context.supabase.from("basketball_matches").update({ status: "full_time", winner_team_id: winnerId, ended_at: now }).eq("id", context.match.id);
    if (error) failGame(error.message);
    if (winnerId && context.match.next_match_id && context.match.next_match_slot) {
      const query = context.match.next_match_slot === "home" ? context.supabase.from("basketball_matches").update({ home_team_id: winnerId }) : context.supabase.from("basketball_matches").update({ away_team_id: winnerId });
      const { error: advanceError } = await query.eq("id", context.match.next_match_id).eq("status", "scheduled");
      if (advanceError) failGame(advanceError.message);
    }
    const { data: remaining } = await context.supabase.from("basketball_matches").select("id").eq("tournament_id", context.tournamentId).not("status", "in", '(full_time,cancelled)').limit(1);
    await context.supabase.from("basketball_tournaments").update({ status: remaining?.length ? "live" : "completed" }).eq("id", context.tournamentId);
  } else if (command === "reopen") {
    if (context.match.status !== "full_time") failGame("Only a finished game can be reopened");
    if (context.match.next_match_id && context.match.next_match_slot) {
      const { data: next } = await context.supabase.from("basketball_matches").select("status,home_team_id,away_team_id").eq("id", context.match.next_match_id).single();
      if (next && next.status !== "scheduled") failGame("The next knockout game has started, so this result cannot be reopened");
      if (next && context.match.winner_team_id) {
        const slotTeam = context.match.next_match_slot === "home" ? next.home_team_id : next.away_team_id;
        if (slotTeam === context.match.winner_team_id) {
          const clear = context.match.next_match_slot === "home" ? context.supabase.from("basketball_matches").update({ home_team_id: null }) : context.supabase.from("basketball_matches").update({ away_team_id: null });
          const { error: clearError } = await clear.eq("id", context.match.next_match_id);
          if (clearError) failGame(clearError.message);
        }
      }
    }
    const { error } = await context.supabase.from("basketball_matches").update({ status: "live", winner_team_id: null, ended_at: null }).eq("id", context.match.id);
    if (error) failGame(error.message);
    await context.supabase.from("basketball_tournaments").update({ status: "live" }).eq("id", context.tournamentId);
  } else failGame("Game action is invalid");
  await refresh(context.eventId, context.slug);
  const message = command === "start" ? "Game is live" : command === "finish" ? "Final score published" : "Game reopened";
  if (focused) redirect(`/admin/events/${context.eventId}/basketball/matches/${context.match.id}?message=${encodeURIComponent(message)}`);
  redirect(path(context.eventId, context.tournamentId, { message }));
}
