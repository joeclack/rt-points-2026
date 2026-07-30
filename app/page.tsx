import { ArrowRight, ShieldCheck, Trophy } from "lucide-react";
import Link from "next/link";

import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const trackers = [
  {
    title: "Game Points",
    description:
      "Run live team events with rankings, points controls, audience display, and a final winner view.",
    href: "/game-points",
    status: "MVC tracker",
    tone: "live" as const,
  },
  {
    title: "Football",
    description:
      "Plan fixtures, officials, live scores, match status, results, and standings for a future release.",
    href: "/football",
    status: "Future tracker",
    tone: "planned" as const,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-10">
        <div className="mb-10 max-w-3xl">
          <StatusPill tone="neutral">rt-points-2026</StatusPill>
          <h1 className="mt-5 text-4xl font-bold tracking-normal text-slate-950 sm:text-6xl">
            Live scoring for events, games, and football.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Choose a tracker to manage scores, publish live displays, and build
            toward a broader competition platform.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {trackers.map((tracker) => (
            <Card key={tracker.title} className="overflow-hidden">
              <CardHeader>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-950 text-white">
                    {tracker.title === "Game Points" ? (
                      <Trophy className="h-6 w-6" />
                    ) : (
                      <ShieldCheck className="h-6 w-6" />
                    )}
                  </div>
                  <StatusPill tone={tracker.tone}>{tracker.status}</StatusPill>
                </div>
                <CardTitle>{tracker.title}</CardTitle>
                <CardDescription>{tracker.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href={tracker.href}>
                    Open tracker
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
