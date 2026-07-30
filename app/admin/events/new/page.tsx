import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function NewEventPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Create event</CardTitle>
          <CardDescription>
            Static Phase 1 form for an event such as The Jesus Generation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input defaultValue="The Jesus Generation" placeholder="Event name" />
          <Input placeholder="Short description" />
          <Input placeholder="Date or date range" />
          <Input placeholder="Location" />
          <div className="rounded-md border border-border bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-950">
              Enabled trackers
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" defaultChecked />
                Game Points
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" defaultChecked />
                Football placeholder
              </label>
            </div>
          </div>
          <Button asChild className="w-full">
            <Link href="/admin/events/evt_jesus_generation">Create event</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
