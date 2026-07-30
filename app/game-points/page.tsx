import { Monitor, Settings } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function GamePointsPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">
          Game Points
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-normal text-slate-950">
          Choose how to use the live points tracker.
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-slate-950 text-white">
              <Settings className="h-6 w-6" />
            </div>
            <CardTitle>Admin Dashboard</CardTitle>
            <CardDescription>
              Manage teams, point changes, event settings, and final standings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/game-points/admin">Open admin</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-cyan-600 text-white">
              <Monitor className="h-6 w-6" />
            </div>
            <CardTitle>Audience Display</CardTitle>
            <CardDescription>
              Show a live, projector-friendly scoreboard for spectators.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/game-points/display">Open display</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
