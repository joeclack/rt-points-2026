import { createEvent } from "@/app/admin/events/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
          <CardTitle>Create tournament</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createEvent} className="space-y-4">
            <Input
              defaultValue="The Jesus Generation"
              name="name"
              placeholder="Tournament name"
              required
            />
            <Input name="description" placeholder="Short description" />
            <Input name="date_label" placeholder="Date or date range" />
            <Input name="location" placeholder="Location" />
            {error ? (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
            <Button className="w-full" type="submit">
              Create tournament
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
