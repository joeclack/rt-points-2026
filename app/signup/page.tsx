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

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Create admin account</CardTitle>
          <CardDescription>
            Admins will use Supabase Auth to create and manage events.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Name" />
          <Input type="email" placeholder="Email address" />
          <Input type="password" placeholder="Password" />
          <Button asChild className="w-full">
            <Link href="/admin/events">Create account</Link>
          </Button>
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
