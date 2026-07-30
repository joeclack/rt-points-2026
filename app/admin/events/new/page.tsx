import { createEvent } from "@/app/admin/events/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireAdminUser } from "@/lib/auth";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdminUser();
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Create event</CardTitle>
          <CardDescription>
            Create an event such as The Jesus Generation, then add trackers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createEvent} className="space-y-4">
            <Input
              defaultValue="The Jesus Generation"
              name="name"
              placeholder="Event name"
              required
            />
            <Input name="description" placeholder="Short description" />
            <Input name="date_label" placeholder="Date or date range" />
            <Input name="location" placeholder="Location" />
            <div className="rounded-md border border-border bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-950">
                Enabled trackers
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input name="game_points_enabled" type="checkbox" defaultChecked />
                  Game Points
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input name="football_enabled" type="checkbox" defaultChecked />
                  Football placeholder
                </label>
              </div>
            </div>
            {error ? (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
            <Button className="w-full" type="submit">
              Create event
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
