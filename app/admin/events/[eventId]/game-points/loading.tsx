import { StatusPill } from "@/components/status-pill";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminGamePointsLoading() {
  return (
    <>
      <header className="mb-6 border-b border-slate-200 pb-6">
        <StatusPill tone="live">Game Points Admin</StatusPill>
        <div className="mt-4 h-9 w-72 animate-pulse rounded-md bg-slate-200" />
        <div className="mt-3 h-5 w-full max-w-xl animate-pulse rounded-md bg-slate-200" />
      </header>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <Card key={item}>
            <CardHeader>
              <CardTitle>
                <span className="block h-5 w-24 animate-pulse rounded-md bg-slate-200" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-10 w-20 animate-pulse rounded-md bg-slate-200" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <Card key={item}>
            <CardHeader>
              <div className="h-6 w-32 animate-pulse rounded-md bg-slate-200" />
            </CardHeader>
            <CardContent>
              <div className="h-28 animate-pulse rounded-md bg-slate-200" />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
