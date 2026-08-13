import { createBasketballTournament } from "@/app/admin/events/[eventId]/basketball/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Input } from "@/components/ui/input";
import type { Team } from "@/lib/sample-data";

export function AdminBasketballTournamentForm({ eventId, teams }: { eventId: string; teams: Team[] }) {
  return (
    <form action={createBasketballTournament} className="space-y-5">
      <input name="event_id" type="hidden" value={eventId} />
      <label className="block space-y-1.5"><span className="text-sm font-medium">Tournament name</span><Input name="name" required /></label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="space-y-1.5"><span className="text-sm font-medium">Format</span><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" name="format"><option value="league">Round robin</option><option value="knockout">Knockout</option></select></label>
        <label className="space-y-1.5"><span className="text-sm font-medium">Opening knockout round</span><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" name="start_stage"><option value="quarter_final">Quarter-finals (8)</option><option value="semi_final">Semi-finals (4)</option><option value="final">Final (2)</option></select></label>
        <label className="space-y-1.5"><span className="text-sm font-medium">Game length</span><div className="flex items-center gap-2"><Input defaultValue={8} max={60} min={1} name="game_minutes" required type="number" /><span className="text-sm text-slate-500">min</span></div></label>
      </div>
      <fieldset><legend className="mb-2 text-sm font-medium">Teams</legend><div className="grid gap-2 sm:grid-cols-2">{teams.map((team) => <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm" key={team.id}><input defaultChecked name="team_ids" type="checkbox" value={team.id} /><span className="h-3 w-3 rounded-full" style={{ backgroundColor: team.colour }} />{team.name}</label>)}</div></fieldset>
      <PendingSubmitButton pendingLabel="Creating games..." type="submit">Create basketball tournament</PendingSubmitButton>
    </form>
  );
}
