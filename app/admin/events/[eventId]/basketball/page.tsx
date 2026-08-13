import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminBasketballMatchCard } from "@/components/admin-basketball-match-card";
import { AdminBasketballTournamentForm } from "@/components/admin-basketball-tournament-form";
import { BasketballStandings } from "@/components/basketball-standings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminUser } from "@/lib/auth";
import { getAdminBasketballTournaments } from "@/lib/basketball";
import { getAdminEventById } from "@/lib/events";

export default async function AdminBasketballPage({ params, searchParams }: { params: Promise<{ eventId: string }>; searchParams: Promise<{ error?: string; message?: string; tournament?: string }> }) {
  const user = await requireAdminUser(); const { eventId } = await params; const query = await searchParams;
  const [event, tournaments] = await Promise.all([getAdminEventById(eventId, user?.id), getAdminBasketballTournaments(eventId)]);
  if (event.sport !== "basketball") redirect(`/admin/events/${event.id}/football`);
  const selected = tournaments.find((item) => item.id === query.tournament) ?? tournaments[0];
  const matches = selected ? [...selected.matches].sort((a, b) => Number(b.status === "live") - Number(a.status === "live") || a.roundNumber - b.roundNumber || a.position - b.position) : [];
  return (
    <div className="mx-auto w-full max-w-5xl">
      <header className="mb-6 flex items-end justify-between gap-4 border-b border-slate-200 pb-5"><div><h1 className="text-2xl font-semibold">Basketball</h1><p className="mt-1 text-sm text-slate-500">Timed games, live point scoring and bracket progression.</p></div><Button asChild variant="outline"><Link href={`/events/${event.slug}/basketball`}><ExternalLink className="h-4 w-4" />Public centre</Link></Button></header>
      {query.message ? <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{query.message}</p> : null}
      {query.error ? <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{query.error}</p> : null}
      {event.teams.length < 2 ? <Card><CardHeader><CardTitle className="text-lg">Add teams first</CardTitle></CardHeader><CardContent><p className="mb-4 text-sm text-slate-600">Basketball needs at least two approved teams.</p><Button asChild variant="outline"><Link href={`/admin/events/${event.id}/teams`}>Manage teams</Link></Button></CardContent></Card> : <>
        <Card className="mb-6"><CardHeader><CardTitle className="text-lg">Create tournament</CardTitle></CardHeader><CardContent><AdminBasketballTournamentForm eventId={event.id} teams={event.teams} /></CardContent></Card>
        {tournaments.length ? <div className="mb-6 flex gap-2 overflow-x-auto">{tournaments.map((item) => <Button asChild key={item.id} variant={item.id === selected?.id ? "default" : "outline"}><Link href={`/admin/events/${event.id}/basketball?tournament=${item.id}`}>{item.name}</Link></Button>)}</div> : null}
        {selected ? <><section className="mb-6 border-b border-slate-200 pb-4"><h2 className="text-xl font-semibold">{selected.name}</h2><p className="mt-1 text-sm text-slate-500">{selected.gameMinutes}-minute games / {selected.format === "league" ? "round robin" : "knockout"}</p></section>{selected.format === "league" ? <div className="mb-6"><BasketballStandings teams={event.teams} tournament={selected} /></div> : null}<h2 className="mb-3 text-lg font-semibold">Game control</h2><div className="grid gap-4 lg:grid-cols-2">{matches.map((match) => <AdminBasketballMatchCard eventId={event.id} key={match.id} match={match} teams={event.teams} />)}</div></> : null}
      </>}
    </div>
  );
}
