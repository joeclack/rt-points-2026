import { CalendarDays, ShieldCheck, Trophy } from "lucide-react";

import { StatusPill } from "@/components/status-pill";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const futureAreas = [
  {
    title: "Fixtures",
    description: "Create schedules and track upcoming, live, and full-time matches.",
    icon: CalendarDays,
  },
  {
    title: "Officials",
    description: "Assign score reporters and collect live match updates from the field.",
    icon: ShieldCheck,
  },
  {
    title: "Standings",
    description: "Turn match results into live tables for teams and spectators.",
    icon: Trophy,
  },
];

export default function FootballPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-10">
      <div className="mb-8 max-w-3xl">
        <StatusPill tone="planned">Future tracker</StatusPill>
        <h1 className="mt-4 text-4xl font-bold tracking-normal text-slate-950">
          Football match tracking is planned after the points MVC.
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          This route reserves space for fixtures, live scores, officials, match
          status, results, and standings.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {futureAreas.map((area) => (
          <Card key={area.title}>
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-slate-950 text-white">
                <area.icon className="h-6 w-6" />
              </div>
              <CardTitle>{area.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-slate-600">
              {area.description}
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
