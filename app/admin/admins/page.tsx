import { ShieldCheck } from "lucide-react";

import { inviteAppAdmin } from "@/app/admin/admins/actions";
import { AdminEventNav } from "@/components/admin-event-nav";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { RemoveAppAdminButton } from "@/components/remove-app-admin-button";
import { StatusPill } from "@/components/status-pill";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireAppOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AppAdminsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const owner = await requireAppOwner();
  const { error: queryError, message } = await searchParams;
  const supabase = await createClient();
  const { data: admins, error } = await supabase.rpc("get_app_admin_members");

  return (
    <main className="min-h-screen bg-brand-cream">
      <section className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 md:py-8">
        <AdminEventNav appRole={owner.role} />

        <header className="mb-7">
          <h1 className="text-4xl uppercase leading-none text-brand-charcoal">
            Admin access
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Invite trusted people to create an admin account. An invited admin can
            create tournaments and can be granted access to existing tournaments.
          </p>
        </header>

        {message ? (
          <p className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            {message}
          </p>
        ) : null}
        {queryError || error ? (
          <p className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {queryError ?? error?.message}
          </p>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Card>
            <CardHeader>
              <CardTitle>Administrators</CardTitle>
              <CardDescription>
                Only accounts in this list can enter the admin area.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-200">
                {(admins ?? []).map((admin) => (
                  <div
                    className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                    key={admin.user_id}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-950">
                        {admin.display_name}
                      </p>
                      <p className="truncate text-sm text-slate-500">{admin.email}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusPill
                        tone={
                          admin.role === "owner"
                            ? "live"
                            : admin.invitation_pending
                              ? "planned"
                              : "neutral"
                        }
                      >
                        {admin.role === "admin" && admin.invitation_pending
                          ? "invited"
                          : admin.role}
                      </StatusPill>
                      {admin.role === "admin" ? (
                        <RemoveAppAdminButton
                          displayName={admin.display_name}
                          email={admin.email}
                          invitationPending={admin.invitation_pending}
                          userId={admin.user_id}
                        />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ShieldCheck className="h-5 w-5" />
                Invite admin
              </CardTitle>
              <CardDescription>
                Supabase will email a secure link so they can choose a password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={inviteAppAdmin} className="space-y-4">
                <Input name="display_name" placeholder="Name" />
                <Input
                  autoComplete="email"
                  name="email"
                  placeholder="Email address"
                  required
                  type="email"
                />
                <PendingSubmitButton
                  className="w-full"
                  pendingLabel="Sending invitation..."
                  type="submit"
                >
                  Send invitation
                </PendingSubmitButton>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
