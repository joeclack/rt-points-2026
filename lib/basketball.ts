import type { BasketballMatch, BasketballTournament } from "@/lib/basketball-types";
import { isSupabaseConfigured } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type TournamentRow = { id: string; event_id: string; name: string; format: "league" | "knockout"; start_stage: "quarter_final" | "semi_final" | "final" | null; status: "scheduled" | "live" | "completed"; game_minutes: number };
type MatchRow = { id: string; tournament_id: string; event_id: string; home_team_id: string | null; away_team_id: string | null; stage: BasketballMatch["stage"]; round_number: number; position: number; tipoff_at: string | null; court: string | null; status: BasketballMatch["status"]; home_score: number; away_score: number; winner_team_id: string | null; next_match_id: string | null; next_match_slot: "home" | "away" | null; started_at: string | null; ended_at: string | null; updated_at: string };
type Payload = { tournaments: Array<TournamentRow & { team_ids: string[]; matches: MatchRow[] }> };
type AdminTournamentRow = TournamentRow & { tournament_teams: Array<{ team_id: string; seed: number }>; matches: MatchRow[] };

function mapMatch(row: MatchRow): BasketballMatch {
  return { id: row.id, tournamentId: row.tournament_id, eventId: row.event_id, homeTeamId: row.home_team_id, awayTeamId: row.away_team_id, stage: row.stage, roundNumber: row.round_number, position: row.position, tipoffAt: row.tipoff_at, court: row.court, status: row.status, homeScore: row.home_score, awayScore: row.away_score, winnerTeamId: row.winner_team_id, nextMatchId: row.next_match_id, nextMatchSlot: row.next_match_slot, startedAt: row.started_at, endedAt: row.ended_at, updatedAt: row.updated_at };
}

function mapTournament(row: TournamentRow, teamIds: string[], matches: MatchRow[]): BasketballTournament {
  return { id: row.id, eventId: row.event_id, name: row.name, format: row.format, startStage: row.start_stage, status: row.status, gameMinutes: row.game_minutes, teamIds, matches: matches.map(mapMatch) };
}

export async function getAdminBasketballTournaments(eventId: string) {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data: tournaments, error } = await supabase.from("basketball_tournaments").select("id,event_id,name,format,start_stage,status,game_minutes,tournament_teams:basketball_tournament_teams(team_id,seed),matches:basketball_matches(id,tournament_id,event_id,home_team_id,away_team_id,stage,round_number,position,tipoff_at,court,status,home_score,away_score,winner_team_id,next_match_id,next_match_slot,started_at,ended_at,updated_at)").eq("event_id", eventId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (tournaments as unknown as AdminTournamentRow[]).map((row) => mapTournament(row, [...row.tournament_teams].sort((a, b) => a.seed - b.seed).map((item) => item.team_id), [...row.matches].sort((a, b) => a.round_number - b.round_number || a.position - b.position)));
}

export async function getPublicBasketballTournaments(eventSlug: string, accessCode = "") {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_basketball_for_viewer", { event_slug: eventSlug, submitted_code: accessCode });
  if (error || !data) return null;
  const payload = data as unknown as Payload;
  return payload.tournaments.map((row) => mapTournament(row, row.team_ids, row.matches));
}
