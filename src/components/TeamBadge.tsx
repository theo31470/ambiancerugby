/* eslint-disable @next/next/no-img-element */
import type { TeamLite } from "@/lib/types";

const SIZES = { xs: "w-5 h-5 text-[9px]", sm: "w-7 h-7 text-[10px]", md: "w-10 h-10 text-xs", lg: "w-16 h-16 text-base", xl: "w-24 h-24 text-xl" };

function initials(t: TeamLite) {
  if (t.abbreviation) return t.abbreviation.slice(0, 4);
  return (t.short_name || t.name).split(/[\s-]+/).map((w) => w[0]).join("").slice(0, 3).toUpperCase();
}

export default function TeamBadge({ team, size = "sm" }: { team: TeamLite; size?: keyof typeof SIZES }) {
  if (team.logo_url) {
    return <img src={team.logo_url} alt="" loading="lazy" className={`${SIZES[size]} shrink-0 object-contain`} />;
  }
  return (
    <span
      aria-hidden
      className={`${SIZES[size]} shrink-0 rounded-full grid place-items-center font-bold text-white titre tracking-tight`}
      style={{ background: team.color ?? "var(--vin)" }}
    >
      {initials(team)}
    </span>
  );
}
