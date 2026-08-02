import { notFound } from "next/navigation";

import type {
  FootballMatch,
  FootballTournament,
} from "@/lib/football-types";
import { isSupabaseConfigured } from "@/lib/auth";
import { getEventBySlug, sampleTeams } from "@/lib/sample-data";
import { createClient } from "@/lib/supabase/server";

type TournamentRow = {
  id: string;
  event_id: string;
  name: string;
  format: "league" | "knockout";
  start_stage: "quarter_final" | "semi_final" | "final" | null;
  status: "scheduled" | "live" | "completed";
  win_points: number;
  draw_points: number;
  loss_points: number;
};

type MatchRow = {
  id: string;
  tournament_id: string;
  event_id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  stage: FootballMatch["stage"];
  round_number: number;
  position: number;
  kickoff_at: string | null;
  venue: string | null;
  status: FootballMatch["status"];
  home_score: number;
  away_score: number;
  winner_team_id: string | null;
  next_match_id: string | null;
  next_match_slot: "home" | "away" | null;
  started_at: string | null;
  ended_at: string | null;
  updated_at: string;
};

type PublicFootballPayload = {
  tournaments: Array<
    TournamentRow & {
      team_ids: string[];
      matches: MatchRow[];
    }
  >;
};

function mapMatch(row: MatchRow): FootballMatch {
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    eventId: row.event_id,
    homeTeamId: row.home_team_id,
    awayTeamId: row.away_team_id,
    stage: row.stage,
    roundNumber: row.round_number,
    position: row.position,
    kickoffAt: row.kickoff_at,
    venue: row.venue,
    status: row.status,
    homeScore: row.home_score,
    awayScore: row.away_score,
    winnerTeamId: row.winner_team_id,
    nextMatchId: row.next_match_id,
    nextMatchSlot: row.next_match_slot,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    updatedAt: row.updated_at,
  };
}

function mapTournament(
  row: TournamentRow,
  teamIds: string[],
  matches: MatchRow[],
): FootballTournament {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    format: row.format,
    startStage: row.start_stage,
    status: row.status,
    winPoints: row.win_points,
    drawPoints: row.draw_points,
    lossPoints: row.loss_points,
    teamIds,
    matches: matches.map(mapMatch),
  };
}

const sampleTournament: FootballTournament = {
  id: "sample-summer-league",
  eventId: "evt_jesus_generation",
  name: "Summer Football League",
  format: "league",
  startStage: null,
  status: "live",
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
  teamIds: sampleTeams.map((team) => team.id),
  matches: [
    {
      id: "sample-match-1",
      tournamentId: "sample-summer-league",
      eventId: "evt_jesus_generation",
      homeTeamId: "zion",
      awayTeamId: "eden",
      stage: "league",
      roundNumber: 1,
      position: 1,
      kickoffAt: null,
      venue: "Main pitch",
      status: "live",
      homeScore: 2,
      awayScore: 1,
      winnerTeamId: null,
      nextMatchId: null,
      nextMatchSlot: null,
      startedAt: new Date().toISOString(),
      endedAt: null,
      updatedAt: new Date().toISOString(),
    },
    {
      id: "sample-match-2",
      tournamentId: "sample-summer-league",
      eventId: "evt_jesus_generation",
      homeTeamId: "judah",
      awayTeamId: "bethel",
      stage: "league",
      roundNumber: 1,
      position: 2,
      kickoffAt: null,
      venue: "Main pitch",
      status: "scheduled",
      homeScore: 0,
      awayScore: 0,
      winnerTeamId: null,
      nextMatchId: null,
      nextMatchSlot: null,
      startedAt: null,
      endedAt: null,
      updatedAt: new Date().toISOString(),
    },
  ],
};

export function getSampleFootballTournaments(eventId: string) {
  return eventId === sampleTournament.eventId ? [sampleTournament] : [];
}

export async function getAdminFootballTournaments(eventId: string) {
  if (!isSupabaseConfigured()) {
    return getSampleFootballTournaments(eventId);
  }

  const supabase = await createClient();
  const { data: tournaments, error } = await supabase
    .from("football_tournaments")
    .select(
      "id,event_id,name,format,start_stage,status,win_points,draw_points,loss_points",
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  if (!tournaments?.length) {
    return [];
  }

  const tournamentIds = tournaments.map((tournament) => tournament.id);
  const [{ data: tournamentTeams }, { data: matches, error: matchesError }] =
    await Promise.all([
      supabase
        .from("football_tournament_teams")
        .select("tournament_id,team_id,seed")
        .in("tournament_id", tournamentIds)
        .order("seed"),
      supabase
        .from("football_matches")
        .select(
          "id,tournament_id,event_id,home_team_id,away_team_id,stage,round_number,position,kickoff_at,venue,status,home_score,away_score,winner_team_id,next_match_id,next_match_slot,started_at,ended_at,updated_at",
        )
        .in("tournament_id", tournamentIds)
        .order("round_number")
        .order("position"),
    ]);

  if (matchesError) {
    throw new Error(matchesError.message);
  }

  return tournaments.map((tournament) =>
    mapTournament(
      tournament,
      (tournamentTeams ?? [])
        .filter((row) => row.tournament_id === tournament.id)
        .map((row) => row.team_id),
      (matches ?? []).filter(
        (match) => match.tournament_id === tournament.id,
      ),
    ),
  );
}

export async function getPublicFootballTournaments(
  eventSlug: string,
  accessCode = "",
) {
  if (!isSupabaseConfigured()) {
    return getSampleFootballTournaments(getEventBySlug(eventSlug).id);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "get_public_football_for_viewer",
    {
      event_slug: eventSlug,
      submitted_code: accessCode,
    },
  );

  if (error || !data) {
    notFound();
  }

  const payload = data as unknown as PublicFootballPayload;

  return payload.tournaments.map((tournament) =>
    mapTournament(tournament, tournament.team_ids, tournament.matches),
  );
}
