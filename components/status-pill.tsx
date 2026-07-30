import { cn } from "@/lib/utils";

type StatusPillProps = {
  children: React.ReactNode;
  tone?: "live" | "planned" | "neutral";
};

export function StatusPill({ children, tone = "neutral" }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em]",
        tone === "live" &&
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
        tone === "planned" &&
          "border-amber-500/30 bg-amber-500/10 text-amber-700",
        tone === "neutral" &&
          "border-slate-300 bg-slate-100 text-slate-700",
      )}
    >
      {children}
    </span>
  );
}
