import Link from "next/link";

import { signup } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Create admin account</CardTitle>
          <CardDescription>
            Admins will use Supabase Auth to create and manage events.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signup} className="space-y-4">
            <Input name="display_name" placeholder="Name" />
            <Input name="email" type="email" placeholder="Email address" required />
            <Input name="password" type="password" placeholder="Password" required />
            {error ? (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
            <Button className="w-full" type="submit">
              Create account
            </Button>
          </form>
          <p className="text-center text-sm text-slate-600">
            Already registered?{" "}
            <Link className="font-medium text-slate-950" href="/login">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
