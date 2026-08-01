"use client";

import {
  Minus,
  Pencil,
  Plus,
  Save,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Team } from "@/lib/sample-data";
import { createClient } from "@/lib/supabase/client";

type AdminGamePointsControlsProps = {
  eventId: string;
  initialTeams: Team[];
};

type ScoreMode = "adjust" | "set";
const defaultQuickAmounts = [1, 5];
const quickAmountsStorageKey = "rt-points.quickAmounts";
const customAmountStorageKey = "rt-points.customScoreAmount";

function parsePositiveInteger(value: string) {
  const parsedValue = Number(value);

  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

export function AdminGamePointsControls({
  eventId,
  initialTeams,
}: AdminGamePointsControlsProps) {
  const [teams, setTeams] = useState(initialTeams);
  const [pendingTeamId, setPendingTeamId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actorId, setActorId] = useState<string | null>(null);
  const [quickAmounts, setQuickAmounts] = useState(defaultQuickAmounts);
  const [quickAmountInputs, setQuickAmountInputs] = useState(
    defaultQuickAmounts.map(String),
  );
  const [customAmount, setCustomAmount] = useState("3");

  const rankedTeams = useMemo(
    () => [...teams].sort((a, b) => b.points - a.points),
    [teams],
  );
  const leadingTeam = rankedTeams.at(0);
  const totalPoints = teams.reduce((sum, team) => sum + team.points, 0);

  useEffect(() => {
    let isMounted = true;

    const storedQuickAmounts = window.localStorage.getItem(quickAmountsStorageKey);
    const parsedQuickAmounts = storedQuickAmounts
      ?.split(",")
      .map((value) => parsePositiveInteger(value.trim()))
      .filter((value): value is number => value !== null)
      .slice(0, 2);

    if (parsedQuickAmounts?.length === 2) {
      setQuickAmounts(parsedQuickAmounts);
      setQuickAmountInputs(parsedQuickAmounts.map(String));
    }

    const storedCustomAmount = window.localStorage.getItem(customAmountStorageKey);

    if (storedCustomAmount && parsePositiveInteger(storedCustomAmount)) {
      setCustomAmount(storedCustomAmount);
    }

    async function loadActorId() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (isMounted) {
        setActorId(user?.id ?? null);
      }
    }

    void loadActorId();

    return () => {
      isMounted = false;
    };
  }, []);

  function saveQuickAmounts() {
    const nextQuickAmounts = quickAmountInputs.map((value) =>
      parsePositiveInteger(value),
    );

    if (nextQuickAmounts.some((value) => value === null)) {
      setError("Quick action amounts must be whole numbers above zero");
      return;
    }

    const numericQuickAmounts = nextQuickAmounts as number[];

    setQuickAmounts(numericQuickAmounts);
    setError(null);
    window.localStorage.setItem(
      quickAmountsStorageKey,
      numericQuickAmounts.join(","),
    );
  }

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
    setTeams((currentTeams) =>
      currentTeams.map((team) =>
        team.id === teamId ? { ...team, points: nextPoints } : team,
      ),
    );

    try {
      const supabase = createClient();

      if (!actorId) {
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
        actor_id: actorId,
        points_delta: pointsDelta,
        points_after: nextPoints,
        reason: mode === "adjust" ? "Quick score change" : "Set exact score",
      });

      if (auditError) {
        throw auditError;
      }

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

  function applyCustomAmount(teamId: string, direction: 1 | -1) {
    const amount = parsePositiveInteger(customAmount);

    if (!amount) {
      setError("Custom amount must be a whole number above zero");
      return;
    }

    window.localStorage.setItem(customAmountStorageKey, customAmount);
    void updateScore(teamId, "adjust", amount * direction);
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

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="grid flex-1 gap-4 md:grid-cols-3">
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
        <Dialog>
          <DialogTrigger asChild>
            <Button className="lg:mt-1" type="button" variant="outline">
              <SlidersHorizontal className="h-4 w-4" />
              Quick actions
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Quick action amounts</DialogTitle>
              <DialogDescription>
                Choose the two amounts shown as add and subtract buttons on every
                team card.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {quickAmountInputs.map((amount, index) => (
                  <label
                    key={`quick-amount-${index + 1}`}
                    className="block text-sm font-medium text-slate-700"
                  >
                    Amount {index + 1}
                    <Input
                      className="mt-1"
                      min={1}
                      type="number"
                      value={amount}
                      onChange={(event) => {
                        const nextInputs = [...quickAmountInputs];
                        nextInputs[index] = event.target.value;
                        setQuickAmountInputs(nextInputs);
                      }}
                    />
                  </label>
                ))}
              </div>
              <Button className="w-full" type="button" onClick={saveQuickAmounts}>
                <Save className="h-4 w-4" />
                Save quick actions
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
                  {[...quickAmounts].reverse().map((amount) => (
                    <Button
                      disabled={isPending}
                      key={`subtract-${amount}`}
                      onClick={() => void updateScore(team.id, "adjust", -amount)}
                      type="button"
                      variant="outline"
                    >
                      <Minus className="h-4 w-4" />
                      {amount}
                    </Button>
                  ))}
                  {quickAmounts.map((amount) => (
                    <Button
                      disabled={isPending}
                      key={`add-${amount}`}
                      onClick={() => void updateScore(team.id, "adjust", amount)}
                      type="button"
                    >
                      <Plus className="h-4 w-4" />
                      {amount}
                    </Button>
                  ))}
                </div>

                <div className="grid gap-2 sm:grid-cols-[auto_1fr_auto]">
                  <Button
                    disabled={isPending}
                    onClick={() => applyCustomAmount(team.id, -1)}
                    type="button"
                    variant="outline"
                  >
                    <Minus className="h-4 w-4" />
                    Custom
                  </Button>
                  <Input
                    min={1}
                    type="number"
                    value={customAmount}
                    aria-label="Custom score amount"
                    onChange={(event) => setCustomAmount(event.target.value)}
                  />
                  <Button
                    disabled={isPending}
                    onClick={() => applyCustomAmount(team.id, 1)}
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                    Custom
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

                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full" type="button" variant="outline">
                      <Pencil className="h-4 w-4" />
                      Team settings
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{team.name} settings</DialogTitle>
                      <DialogDescription>
                        Update this team&apos;s display details or remove it from
                        the event.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-5">
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

                    <form
                      action={deleteTeam}
                      className="space-y-3 border-t border-slate-200 pt-5"
                    >
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
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
