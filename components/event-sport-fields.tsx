"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";

export function EventSportFields() {
  const [sport, setSport] = useState<"football" | "basketball">("football");
  const [teamSize, setTeamSize] = useState(5);

  function selectSport(value: "football" | "basketball") {
    setSport(value);
    setTeamSize(value === "basketball" ? 2 : 5);
  }

  return (
    <div className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-slate-700">Sport</span>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          name="sport"
          onChange={(event) =>
            selectSport(event.target.value as "football" | "basketball")
          }
          value={sport}
        >
          <option value="football">Football</option>
          <option value="basketball">Basketball</option>
        </select>
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-slate-700">
          Players per team
        </span>
        <Input
          max={20}
          min={2}
          name="team_size"
          onChange={(event) => setTeamSize(Number(event.target.value))}
          required
          type="number"
          value={teamSize}
        />
        <p className="text-xs text-slate-500">
          {sport === "basketball"
            ? "2 players is the recommended basketball format."
            : "5 players is the recommended football format."}
        </p>
      </label>
    </div>
  );
}
