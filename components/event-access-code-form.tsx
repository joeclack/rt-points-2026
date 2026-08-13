import { submitViewerAccessCode } from "@/app/events/[eventSlug]/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type EventAccessCodeFormProps = {
  eventName: string;
  eventSlug: string;
  error?: string;
  nextPath: string;
};

export function EventAccessCodeForm({
  eventName,
  eventSlug,
  error,
  nextPath,
}: EventAccessCodeFormProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>{eventName}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={submitViewerAccessCode} className="space-y-3">
            <input name="event_slug" type="hidden" value={eventSlug} />
            <input name="next" type="hidden" value={nextPath} />
            <Input
              name="access_code"
              placeholder="Access code"
              autoComplete="off"
              required
            />
            {error ? (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
            <PendingSubmitButton
              className="w-full"
              pendingLabel="Checking..."
              type="submit"
            >
              Continue
            </PendingSubmitButton>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
