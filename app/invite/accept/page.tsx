"use client";

import { LoaderCircle } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export default function AcceptInvitePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const queryParams = new URLSearchParams(window.location.search);
    const inviteError = hashParams.get("error_description");
    const tokenHash = queryParams.get("token_hash");

    if (inviteError) {
      setError(inviteError);
      setChecking(false);
      return;
    }

    async function establishSession() {
      if (tokenHash) {
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "invite",
        });

        setHasSession(Boolean(data.session));
        setError(
          verifyError?.message ??
            (data.session ? undefined : "This invitation link is invalid or has expired."),
        );
        window.history.replaceState({}, document.title, window.location.pathname);
        setChecking(false);
        return;
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      setHasSession(Boolean(data.session));
      setError(
        sessionError?.message ??
          (data.session ? undefined : "This invitation link is invalid or has expired."),
      );
      setChecking(false);
    }

    void establishSession();
  }, [supabase]);

  async function setPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("password_confirmation") ?? "");

    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }

    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setSaving(true);
    setError(undefined);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    window.history.replaceState({}, document.title, window.location.pathname);
    router.replace("/admin/events");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Accept admin invitation</CardTitle>
          <CardDescription>
            Choose a password to finish creating your tournament admin account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {checking ? (
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Checking invitation...
            </p>
          ) : hasSession ? (
            <form className="space-y-4" onSubmit={setPassword}>
              <Input
                autoComplete="new-password"
                minLength={8}
                name="password"
                placeholder="Password"
                required
                type="password"
              />
              <Input
                autoComplete="new-password"
                minLength={8}
                name="password_confirmation"
                placeholder="Confirm password"
                required
                type="password"
              />
              {error ? (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              ) : null}
              <Button className="w-full" disabled={saving} type="submit">
                {saving ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Saving password...
                  </>
                ) : (
                  "Create admin account"
                )}
              </Button>
            </form>
          ) : (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
