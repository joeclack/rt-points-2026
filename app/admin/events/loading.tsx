import { StatusPill } from "@/components/status-pill";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminEventsLoading() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto w-full max-w-6xl px-6 py-8">
        <header className="mb-8 border-b border-slate-200 pb-6">
          <StatusPill tone="neutral">Admin</StatusPill>
          <div className="mt-4 h-9 w-52 animate-pulse rounded-md bg-slate-200" />
          <div className="mt-3 h-5 w-full max-w-md animate-pulse rounded-md bg-slate-200" />
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((item) => (
            <Card key={item}>
              <CardHeader>
                <CardTitle>
                  <span className="block h-6 w-48 animate-pulse rounded-md bg-slate-200" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-20 animate-pulse rounded-md bg-slate-200" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
