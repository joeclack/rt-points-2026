import { Minus, Plus, RotateCcw, Settings } from "lucide-react";

import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getEventById } from "@/lib/sample-data";

export default async function AdminEventGamePointsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = getEventById(eventId);

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto w-full max-w-7xl px-6 py-8">
        <header className="mb-8 flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end">
          <div>
            <StatusPill tone="live">Game Points Admin</StatusPill>
            <h1 className="mt-4 text-3xl font-bold tracking-normal text-slate-950">
              {event.name}
            </h1>
            <p className="mt-2 text-slate-600">
              Static event-scoped control panel. Supabase Auth and database
              writes arrive in Phase 2.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline">
              <Settings className="h-4 w-4" />
              Team settings
            </Button>
            <Button variant="secondary">
              <RotateCcw className="h-4 w-4" />
              Reset scores
            </Button>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          {event.teams.map((team) => (
            <Card key={team.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-xl">{team.name}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Event team controls
                  </p>
                </div>
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-md text-lg font-bold text-white"
                  style={{ backgroundColor: team.colour }}
                >
                  {team.badge}
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-5 rounded-md bg-slate-100 p-5 text-center">
                  <div className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Current score
                  </div>
                  <div className="mt-2 text-5xl font-bold text-slate-950">
                    {team.points}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" size="lg">
                    <Minus className="h-4 w-4" />
                    1
                  </Button>
                  <Button variant="outline" size="lg">
                    Set
                  </Button>
                  <Button size="lg">
                    <Plus className="h-4 w-4" />
                    1
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
