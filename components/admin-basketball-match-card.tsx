"use client";

import { Flag, Play, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

import {
  adjustBasketballScore,
  updateBasketballLifecycle,
  updateBasketballSchedule,
} from "@/app/admin/events/[eventId]/basketball/actions";
import { KickoffInput } from "@/components/kickoff-input";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { TeamBadge } from "@/components/team-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  basketballStageLabels,
  type BasketballMatch,
} from "@/lib/basketball-types";
import type { Team } from "@/lib/sample-data";

function Hidden({
  eventId,
  match,
}: {
  eventId: string;
  match: BasketballMatch;
}) {
  return (
    <>
      <input name="event_id" type="hidden" value={eventId} />
      <input name="tournament_id" type="hidden" value={match.tournamentId} />
      <input name="match_id" type="hidden" value={match.id} />
    </>
  );
}

export function AdminBasketballMatchCard({
  eventId,
  match,
  teams,
}: {
  eventId: string;
  match: BasketballMatch;
  teams: Team[];
}) {
  const home = teams.find((team) => team.id === match.homeTeamId);
  const away = teams.find((team) => team.id === match.awayTeamId);
  const [scores, setScores] = useState({
    away: match.awayScore,
    home: match.homeScore,
  });
  const [scorePending, setScorePending] = useState(false);

  useEffect(() => {
    setScores({ away: match.awayScore, home: match.homeScore });
  }, [match.awayScore, match.homeScore]);

  async function adjustScore(formData: FormData) {
    if (scorePending) return;

    const side = String(formData.get("side")) as "home" | "away";
    const points = Number(formData.get("points"));
    const previousScores = scores;

    setScores((current) => ({
      ...current,
      [side]: Math.max(0, current[side] + points),
    }));
    setScorePending(true);

    try {
      await adjustBasketballScore(formData);
    } catch (error) {
      setScores(previousScores);
      throw error;
    } finally {
      setScorePending(false);
    }
  }

  const scoreTeams = [
    { score: scores.home, side: "home" as const, team: home },
    { score: scores.away, side: "away" as const, team: away },
  ];

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex justify-between border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs">
        <span>{basketballStageLabels[match.stage]}</span>
        <span
          className={
            match.status === "live"
              ? "font-semibold text-orange-700"
              : "text-slate-500"
          }
        >
          {match.status === "full_time" ? "FINAL" : match.status.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 px-4 py-5">
        {scoreTeams.map(({ team, side, score }, index) => (
          <div
            className={index ? "col-start-3 row-start-1 text-center" : "text-center"}
            key={side}
          >
            {team ? (
              <TeamBadge
                badge={team.badge}
                badgeUrl={team.badgeUrl}
                className="mx-auto h-10 w-10"
                colour={team.colour}
                name={team.name}
              />
            ) : null}
            <p className="mt-2 truncate text-sm font-medium">
              {team?.name ?? "TBD"}
            </p>
            <p className="mt-2 text-4xl font-bold tabular-nums">{score}</p>

            {match.status === "live" ? (
              <div className="mt-3 flex justify-center gap-1">
                {[-1, 1, 2, 3].map((points) => (
                  <form action={adjustScore} key={points}>
                    <Hidden eventId={eventId} match={match} />
                    <input name="side" type="hidden" value={side} />
                    <input name="points" type="hidden" value={points} />
                    <Button
                      aria-label={`${points > 0 ? "Add" : "Remove"} ${Math.abs(points)} point`}
                      className="h-8 min-w-8 px-2"
                      disabled={scorePending || (points < 0 && score === 0)}
                      size="sm"
                      type="submit"
                      variant={points > 0 ? "default" : "outline"}
                    >
                      {points > 0 ? `+${points}` : points}
                    </Button>
                  </form>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        <span className="col-start-2 row-start-1 pt-16 text-slate-300">-</span>
      </div>

      <div className="border-t border-slate-100 p-4">
        {match.status === "scheduled" ? (
          <div className="space-y-3">
            <form
              action={updateBasketballSchedule}
              className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
            >
              <Hidden eventId={eventId} match={match} />
              <KickoffInput
                defaultIso={match.tipoffAt}
                id={`tipoff-${match.id}`}
              />
              <Input
                defaultValue={match.court ?? ""}
                name="court"
                placeholder="Court"
              />
              <PendingSubmitButton
                pendingLabel="Saving..."
                type="submit"
                variant="outline"
              >
                Save
              </PendingSubmitButton>
            </form>
            <form action={updateBasketballLifecycle}>
              <Hidden eventId={eventId} match={match} />
              <input name="command" type="hidden" value="start" />
              <PendingSubmitButton
                className="w-full"
                disabled={!home || !away}
                pendingLabel="Starting..."
                type="submit"
              >
                <Play className="h-4 w-4" />
                Start game
              </PendingSubmitButton>
            </form>
          </div>
        ) : null}

        {match.status === "live" ? (
          <form action={updateBasketballLifecycle}>
            <Hidden eventId={eventId} match={match} />
            <input name="command" type="hidden" value="finish" />
            <PendingSubmitButton
              className="w-full"
              pendingLabel="Publishing..."
              type="submit"
            >
              <Flag className="h-4 w-4" />
              Publish final score
            </PendingSubmitButton>
          </form>
        ) : null}

        {match.status === "full_time" ? (
          <form action={updateBasketballLifecycle}>
            <Hidden eventId={eventId} match={match} />
            <input name="command" type="hidden" value="reopen" />
            <PendingSubmitButton
              className="w-full"
              pendingLabel="Reopening..."
              type="submit"
              variant="outline"
            >
              <RotateCcw className="h-4 w-4" />
              Reopen game
            </PendingSubmitButton>
          </form>
        ) : null}
      </div>
    </article>
  );
}
