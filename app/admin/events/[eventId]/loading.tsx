import { StatusPill } from "@/components/status-pill";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminEventLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="mb-8 border-b border-slate-200 pb-6">
        <StatusPill tone="live">Tournament admin</StatusPill>
        <div className="mt-4 h-9 w-72 animate-pulse rounded-md bg-slate-200" />
        <div className="mt-3 h-5 w-full max-w-xl animate-pulse rounded-md bg-slate-200" />
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1].map((item) => (
          <Card key={item}>
            <CardHeader>
              <div className="mb-4 h-12 w-12 animate-pulse rounded-md bg-slate-200" />
              <CardTitle>
                <span className="block h-6 w-36 animate-pulse rounded-md bg-slate-200" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-10 w-full animate-pulse rounded-md bg-slate-200" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
