"use client";

import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";

function isoToLocalInputValue(iso: string | null) {
  if (!iso) {
    return "";
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function KickoffInput({
  defaultIso = null,
  disabled = false,
  id,
  required = false,
}: {
  defaultIso?: string | null;
  disabled?: boolean;
  id: string;
  required?: boolean;
}) {
  const defaultValue = useMemo(
    () => isoToLocalInputValue(defaultIso),
    [defaultIso],
  );
  const [localValue, setLocalValue] = useState(defaultValue);
  const isoValue = localValue ? new Date(localValue).toISOString() : "";

  return (
    <>
      <Input
        disabled={disabled}
        id={id}
        onChange={(event) => setLocalValue(event.target.value)}
        required={required}
        type="datetime-local"
        value={localValue}
      />
      <input name="kickoff_at_iso" type="hidden" value={isoValue} />
    </>
  );
}

