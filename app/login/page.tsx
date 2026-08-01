import Link from "next/link";

import { login } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    email?: string;
    error?: string;
    message?: string;
    next?: string;
  }>;
}) {
  const { email, error, message, next } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Admin login</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={login} className="space-y-4">
            <input name="next" type="hidden" value={next ?? "/admin/events"} />
            <Input
              defaultValue={email}
              name="email"
              type="email"
              placeholder="Email address"
              required
            />
            <Input name="password" type="password" placeholder="Password" required />
            {message ? (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                {message}
              </p>
            ) : null}
            {error ? (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
            <Button className="w-full" type="submit">
              Log in
            </Button>
          </form>
          <Button asChild className="mt-3 w-full" type="button" variant="outline">
            <Link href="/signup">Create account</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
