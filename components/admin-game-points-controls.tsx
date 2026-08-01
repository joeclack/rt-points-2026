"use client";

import {
  Minus,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

import {
  deleteTeam,
  updateTeam,
} from "@/app/admin/events/[eventId]/game-points/actions";
import { TeamBadge } from "@/components/team-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Team } from "@/lib/sample-data";
import { createClient } from "@/lib/supabase/client";

type AdminGamePointsControlsProps = {
  eventId: string;
  initialTeams: Team[];
};

type ScoreMode = "adjust" | "set";

export function AdminGamePointsControls({
  eventId,
  initialTeams,
}: AdminGamePointsControlsProps) {
  const [teams, setTeams] = useState(initialTeams);
  const [pendingTeamId, setPendingTeamId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rankedTeams = useMemo(
    () => [...teams].sort((a, b) => b.points - a.points),
    [teams],
  );
  const leadingTeam = rankedTeams.at(0);
  const totalPoints = teams.reduce((sum, team) => sum + team.points, 0);

  async function updateScore(teamId: string, mode: ScoreMode, value: number) {
    const currentTeam = teams.find((team) => team.id === teamId);

    if (!currentTeam || pendingTeamId) {
      return;
    }

    const currentPoints = currentTeam.points;
    const nextPoints =
      mode === "adjust" ? Math.max(0, currentPoints + value) : value;
    const pointsDelta = nextPoints - currentPoints;

    if (!Number.isInteger(nextPoints) || nextPoints < 0) {
      setError("Score must be zero or higher");
      return;
    }

    setPendingTeamId(teamId);
    setError(null);
    setNotice(null);
    setTeams((currentTeams) =>
      currentTeams.map((team) =>
        team.id === teamId ? { ...team, points: nextPoints } : team,
      ),
    );

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You need to log in again");
      }

      const { error: writeError } = await supabase
        .from("game_points_scores")
        .upsert({
          event_id: eventId,
          team_id: teamId,
          points: nextPoints,
        });

      if (writeError) {
        throw writeError;
      }

      const { error: auditError } = await supabase.from("score_events").insert({
        event_id: eventId,
        team_id: teamId,
        actor_id: user.id,
        points_delta: pointsDelta,
        points_after: nextPoints,
        reason: mode === "adjust" ? "Quick score change" : "Set exact score",
      });

      if (auditError) {
        throw auditError;
      }

      setNotice("Score updated");
    } catch (caughtError) {
      setTeams((currentTeams) =>
        currentTeams.map((team) =>
          team.id === teamId ? { ...team, points: currentPoints } : team,
        ),
      );
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update score",
      );
    } finally {
      setPendingTeamId(null);
    }
  }

  function handleSetScore(event: FormEvent<HTMLFormElement>, teamId: string) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const points = Number(String(formData.get("points") ?? ""));

    void updateScore(teamId, "set", points);
    event.currentTarget.reset();
  }

  return (
    <div className="min-w-0">
      {notice ? (
        <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-slate-600">Teams</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-slate-950">{teams.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-slate-600">
              Total points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-slate-950">{totalPoints}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-slate-600">Leader</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="truncate text-4xl font-bold text-slate-950">
              {leadingTeam?.name ?? "None"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {teams.length === 0 ? (
          <Card className="xl:col-span-2">
            <CardContent className="py-12 text-center">
              <p className="text-lg font-semibold text-slate-950">
                No teams yet
              </p>
              <p className="mt-2 text-slate-600">
                Add the first team to start tracking Game Points for this event.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {rankedTeams.map((team, index) => {
          const isPending = pendingTeamId === team.id;

          return (
            <Card key={team.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-xl">{team.name}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Rank {index + 1}
                  </p>
                </div>
                <TeamBadge
                  badge={team.badge}
                  badgeUrl={team.badgeUrl}
                  className="h-12 w-12 text-lg"
                  colour={team.colour}
                  name={team.name}
                />
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-md bg-slate-100 p-5 text-center">
                  <div className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Current score
                  </div>
                  <div className="mt-2 text-5xl font-bold text-slate-950">
                    {team.points}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <Button
                    disabled={isPending}
                    onClick={() => void updateScore(team.id, "adjust", -5)}
                    type="button"
                    variant="outline"
                  >
                    <Minus className="h-4 w-4" />5
                  </Button>
                  <Button
                    disabled={isPending}
                    onClick={() => void updateScore(team.id, "adjust", -1)}
                    type="button"
                    variant="outline"
                  >
                    <Minus className="h-4 w-4" />1
                  </Button>
                  <Button
                    disabled={isPending}
                    onClick={() => void updateScore(team.id, "adjust", 1)}
                    type="button"
                  >
                    <Plus className="h-4 w-4" />1
                  </Button>
                  <Button
                    disabled={isPending}
                    onClick={() => void updateScore(team.id, "adjust", 5)}
                    type="button"
                  >
                    <Plus className="h-4 w-4" />5
                  </Button>
                </div>

                <form
                  className="grid gap-2 sm:grid-cols-[1fr_auto]"
                  onSubmit={(event) => handleSetScore(event, team.id)}
                >
                  <Input
                    min={0}
                    name="points"
                    placeholder="Exact score"
                    type="number"
                  />
                  <Button disabled={isPending} type="submit" variant="outline">
                    <Save className="h-4 w-4" />
                    Set
                  </Button>
                </form>

                <details className="rounded-md border border-slate-200 bg-white">
                  <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700">
                    <Pencil className="h-4 w-4" />
                    Team settings
                  </summary>
                  <div className="space-y-4 border-t border-slate-200 p-4">
                    <form action={updateTeam} className="space-y-3">
                      <input name="event_id" type="hidden" value={eventId} />
                      <input name="team_id" type="hidden" value={team.id} />
                      <Input
                        name="name"
                        defaultValue={team.name}
                        aria-label="Team name"
                        required
                      />
                      <div className="grid grid-cols-[72px_1fr] gap-3">
                        <Input
                          className="h-10 p-1"
                          name="colour"
                          type="color"
                          defaultValue={team.colour}
                          aria-label="Team colour"
                        />
                        <Input
                          className="uppercase"
                          maxLength={3}
                          name="badge_text"
                          defaultValue={team.badge}
                          aria-label="Team badge"
                        />
                      </div>
                      <Input
                        name="badge_url"
                        defaultValue={team.badgeUrl ?? ""}
                        placeholder="Badge image URL"
                        type="url"
                        aria-label="Team badge image URL"
                      />
                      <Button className="w-full" type="submit" variant="outline">
                        <Save className="h-4 w-4" />
                        Save team
                      </Button>
                    </form>

                    <form action={deleteTeam} className="space-y-3">
                      <input name="event_id" type="hidden" value={eventId} />
                      <input name="team_id" type="hidden" value={team.id} />
                      <Input
                        name="confirm"
                        placeholder="Type DELETE"
                        aria-label="Type DELETE to confirm team deletion"
                      />
                      <Button className="w-full" type="submit" variant="secondary">
                        <Trash2 className="h-4 w-4" />
                        Delete team
                      </Button>
                    </form>
                  </div>
                </details>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
