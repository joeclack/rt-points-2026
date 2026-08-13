import { Search, UserMinus, UserPlus, Users } from "lucide-react";

import {
  grantEventAdmin,
  revokeEventAdmin,
  updateViewerAccessCode,
} from "@/app/admin/events/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireAdminUser } from "@/lib/auth";
import {
  getAdminEventById,
  getEventAdminMembers,
  searchEventAdminCandidates,
} from "@/lib/events";

export default async function AdminEventAccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string; message?: string; q?: string }>;
}) {
  const user = await requireAdminUser();
  const { eventId } = await params;
  const { error, message, q = "" } = await searchParams;
  const event = await getAdminEventById(eventId, user?.id);
  const isOwner = event.adminRole === "owner";
  const [members, candidates] = await Promise.all([
    getEventAdminMembers(event.id),
    isOwner && q.trim().length >= 2
      ? searchEventAdminCandidates(event.id, q)
      : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <header className="mb-6 border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-semibold text-slate-950">Access</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage public access and tournament administrators.
        </p>
      </header>

      {message ? <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</p> : null}
      {error ? <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Viewer access code</CardTitle></CardHeader>
          <CardContent>
            <form action={updateViewerAccessCode} className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <input name="event_id" type="hidden" value={event.id} />
              <Input name="access_code" defaultValue={event.viewerAccessCode ?? ""} placeholder="Leave blank for public access" />
              <PendingSubmitButton pendingLabel="Saving..." type="submit">Save code</PendingSubmitButton>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5" />Administrators</CardTitle>
            <StatusPill tone="neutral">{members.length} admin{members.length === 1 ? "" : "s"}</StatusPill>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="divide-y divide-slate-200 rounded-md border border-slate-200">
              {members.map((member) => (
                <div className="flex items-center justify-between gap-3 px-3 py-2.5" key={member.user_id}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-950">{member.display_name}</p>
                    <p className="truncate text-xs text-slate-500">{member.email}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusPill tone={member.role === "owner" ? "live" : "neutral"}>{member.role}</StatusPill>
                    {isOwner && member.role === "admin" ? (
                      <form action={revokeEventAdmin}>
                        <input name="event_id" type="hidden" value={event.id} />
                        <input name="user_id" type="hidden" value={member.user_id} />
                        <Button aria-label={`Remove ${member.display_name}`} size="icon" type="submit" variant="ghost"><UserMinus className="h-4 w-4" /></Button>
                      </form>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            {isOwner ? (
              <>
                <form className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Input defaultValue={q} minLength={2} name="q" placeholder="Search by name or email" required />
                  <Button type="submit" variant="outline"><Search className="h-4 w-4" />Search</Button>
                </form>
                {q.trim().length >= 2 ? (
                  <div className="divide-y divide-slate-200 rounded-md border border-slate-200">
                    {candidates.length > 0 ? candidates.map((candidate) => (
                      <div className="flex items-center justify-between gap-3 px-3 py-2.5" key={candidate.user_id}>
                        <div className="min-w-0"><p className="truncate text-sm font-medium text-slate-950">{candidate.display_name}</p><p className="truncate text-xs text-slate-500">{candidate.email}</p></div>
                        {candidate.has_access ? <Button disabled size="sm" variant="outline">Granted</Button> : (
                          <form action={grantEventAdmin}>
                            <input name="event_id" type="hidden" value={event.id} />
                            <input name="user_id" type="hidden" value={candidate.user_id} />
                            <Button size="sm" type="submit"><UserPlus className="h-4 w-4" />Grant access</Button>
                          </form>
                        )}
                      </div>
                    )) : <p className="px-3 py-4 text-sm text-slate-500">No admins found.</p>}
                  </div>
                ) : null}
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
