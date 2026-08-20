"use client";

import { LoaderCircle } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

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

const inviteTokenStorageKey = "rt-points-admin-invite-token";

export default function AcceptInvitePage() {
  const supabase = useMemo(() => createClient(), []);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState<string>();
  const [tokenHash, setTokenHash] = useState<string>();
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const queryParams = new URLSearchParams(window.location.search);
    const inviteError = hashParams.get("error_description");
    const inviteTokenHash =
      queryParams.get("token_hash") ??
      window.sessionStorage.getItem(inviteTokenStorageKey) ??
      undefined;

    if (inviteError) {
      setError(inviteError);
      setChecking(false);
      return;
    }

    async function establishSession() {
      if (inviteTokenHash) {
        window.sessionStorage.setItem(inviteTokenStorageKey, inviteTokenHash);
        setTokenHash(inviteTokenHash);
        window.history.replaceState(
          window.history.state,
          document.title,
          window.location.pathname,
        );
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

  async function verifyInvite() {
    if (!tokenHash) {
      setError("This invitation link is invalid or has expired.");
      return;
    }

    setVerifying(true);
    setError(undefined);

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "invite",
    });

    const verified = Boolean(data.session);
    setHasSession(verified);
    setError(
      verifyError?.message ??
        (verified ? undefined : "This invitation link is invalid or has expired."),
    );

    if (verified) {
      window.sessionStorage.removeItem(inviteTokenStorageKey);
      setTokenHash(undefined);
    }

    setVerifying(false);
  }

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
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      setError(
        sessionError?.message ??
          "Your invitation session has expired. Open a fresh invite link and try again.",
      );
      setSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/invite/accept-password", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setError(result.error ?? "The password could not be saved. Try again.");
        setSaving(false);
        return;
      }

      window.location.replace("/admin/events");
    } catch {
      setError("The password could not be saved. Check your connection and try again.");
      setSaving(false);
    }
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
          ) : tokenHash ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Press continue to verify your invitation and choose a password.
              </p>
              {error ? (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              ) : null}
              <Button className="w-full" disabled={verifying} onClick={verifyInvite}>
                {verifying ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Verifying invitation...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </div>
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
