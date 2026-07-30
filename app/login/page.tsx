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

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Admin login</CardTitle>
          <CardDescription>
            Static Supabase Auth shell. Real authentication is added in Phase 2.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input type="email" placeholder="Email address" />
          <Input type="password" placeholder="Password" />
          <Button asChild className="w-full">
            <Link href="/admin/events">Log in</Link>
          </Button>
          <p className="text-center text-sm text-slate-600">
            Need an account?{" "}
            <Link className="font-medium text-slate-950" href="/signup">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
