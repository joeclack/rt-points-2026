import type { BasketballMatch, BasketballTournament } from "@/lib/basketball-types";
import { isSupabaseConfigured } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type TournamentRow = { id: string; event_id: string; name: string; format: "league" | "knockout"; start_stage: "quarter_final" | "semi_final" | "final" | null; status: "scheduled" | "live" | "completed"; game_minutes: number };
type MatchRow = { id: string; tournament_id: string; event_id: string; home_team_id: string | null; away_team_id: string | null; stage: BasketballMatch["stage"]; round_number: number; position: number; tipoff_at: string | null; court: string | null; status: BasketballMatch["status"]; home_score: number; away_score: number; winner_team_id: string | null; next_match_id: string | null; next_match_slot: "home" | "away" | null; started_at: string | null; ended_at: string | null; control_version?: number; controller_device_id?: string | null; controller_claimed_at?: string | null; updated_at: string };
type Payload = { tournaments: Array<TournamentRow & { team_ids: string[]; matches: MatchRow[] }> };
type AdminTournamentRow = TournamentRow & { tournament_teams: Array<{ team_id: string; seed: number }>; matches: MatchRow[] };
type FocusedMatchEventRow = {
  role: "owner" | "admin";
  events: {
    id: string;
    sport: "football" | "basketball";
    teams: Array<{
      id: string;
      name: string;
      colour: string;
      badge_text: string | null;
      badge_url: string | null;
    }>;
  } | null;
};
type FocusedMatchRow = MatchRow & { tournament: { name: string; game_minutes: number } | null };

function mapMatch(row: MatchRow): BasketballMatch {
  return { id: row.id, tournamentId: row.tournament_id, eventId: row.event_id, homeTeamId: row.home_team_id, awayTeamId: row.away_team_id, stage: row.stage, roundNumber: row.round_number, position: row.position, tipoffAt: row.tipoff_at, court: row.court, status: row.status, homeScore: row.home_score, awayScore: row.away_score, winnerTeamId: row.winner_team_id, nextMatchId: row.next_match_id, nextMatchSlot: row.next_match_slot, startedAt: row.started_at, endedAt: row.ended_at, controlVersion: row.control_version ?? 0, controllerDeviceId: row.controller_device_id ?? null, controllerClaimedAt: row.controller_claimed_at ?? null, updatedAt: row.updated_at };
}

function mapTournament(row: TournamentRow, teamIds: string[], matches: MatchRow[]): BasketballTournament {
  return { id: row.id, eventId: row.event_id, name: row.name, format: row.format, startStage: row.start_stage, status: row.status, gameMinutes: row.game_minutes, teamIds, matches: matches.map(mapMatch) };
}

export async function getAdminBasketballTournaments(eventId: string) {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data: tournaments, error } = await supabase.from("basketball_tournaments").select("id,event_id,name,format,start_stage,status,game_minutes,tournament_teams:basketball_tournament_teams(team_id,seed),matches:basketball_matches(id,tournament_id,event_id,home_team_id,away_team_id,stage,round_number,position,tipoff_at,court,status,home_score,away_score,winner_team_id,next_match_id,next_match_slot,started_at,ended_at,control_version,controller_device_id,controller_claimed_at,updated_at)").eq("event_id", eventId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (tournaments as unknown as AdminTournamentRow[]).map((row) => mapTournament(row, [...row.tournament_teams].sort((a, b) => a.seed - b.seed).map((item) => item.team_id), [...row.matches].sort((a, b) => a.round_number - b.round_number || a.position - b.position)));
}

export async function getAdminBasketballFocusedMatch(
  eventId: string,
  matchId: string,
  userId?: string,
) {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  let adminUserId = userId;

  if (!adminUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    adminUserId = user?.id;
  }

  if (!adminUserId) return null;

  const [{ data: membership }, { data: match, error: matchError }] =
    await Promise.all([
      supabase
        .from("event_admins")
        .select(
          "role,events!inner(id,sport,teams(id,name,colour,badge_text,badge_url))",
        )
        .eq("event_id", eventId)
        .eq("user_id", adminUserId)
        .single(),
      supabase
        .from("basketball_matches")
        .select(
          "id,tournament_id,event_id,home_team_id,away_team_id,stage,round_number,position,tipoff_at,court,status,home_score,away_score,winner_team_id,next_match_id,next_match_slot,started_at,ended_at,control_version,controller_device_id,controller_claimed_at,updated_at,tournament:basketball_tournaments!inner(name,game_minutes)",
        )
        .eq("id", matchId)
        .eq("event_id", eventId)
        .single(),
    ]);

  const event = (membership as unknown as FocusedMatchEventRow | null)?.events;
  const focusedMatch = match as unknown as FocusedMatchRow | null;

  if (!event || event.sport !== "basketball" || matchError || !focusedMatch) {
    return null;
  }

  return {
    event: {
      id: event.id,
      teams: event.teams.map((team) => ({
        id: team.id,
        name: team.name,
        colour: team.colour,
        badge: team.badge_text ?? team.name.charAt(0).toUpperCase(),
        badgeUrl: team.badge_url,
        players: [],
      })),
    },
    match: mapMatch(focusedMatch),
    gameMinutes: focusedMatch.tournament?.game_minutes ?? 10,
    tournamentName: focusedMatch.tournament?.name ?? "Basketball",
  };
}

export async function getPublicBasketballTournaments(eventSlug: string, accessCode = "") {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_basketball_for_viewer", { event_slug: eventSlug, submitted_code: accessCode });
  if (error || !data) return null;
  const payload = data as unknown as Payload;
  return payload.tournaments.map((row) => mapTournament(row, row.team_ids, row.matches));
}
