import { cn } from "@/lib/utils";

type TeamBadgeProps = {
  badge: string;
  badgeUrl?: string | null;
  className?: string;
  colour: string;
  name: string;
};

export function TeamBadge({
  badge,
  badgeUrl,
  className,
  colour,
  name,
}: TeamBadgeProps) {
  return (
    <span
      aria-label={`${name} badge`}
      className={cn(
        "flex items-center justify-center rounded-md bg-cover bg-center font-bold text-white",
        className,
      )}
      style={{
        backgroundColor: colour,
        backgroundImage: badgeUrl ? `url("${badgeUrl}")` : undefined,
      }}
    >
      {badgeUrl ? <span className="sr-only">{badge}</span> : badge}
    </span>
  );
}
