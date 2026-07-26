"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Flame, LayoutGrid, Trophy } from "lucide-react";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Mes chantiers", icon: LayoutGrid },
  { href: "/signaux", label: "Signaux", icon: Bell },
  { href: "/classement", label: "Classement", icon: Trophy },
];

export default function TopBar({
  pseudo,
  xp,
  nonLus = 0,
}: {
  pseudo: string;
  xp: number;
  nonLus?: number;
}) {
  const path = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-night/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-lg">🕯️</span>
          <span className="font-display text-[15px] font-bold tracking-tight">
            Le Quatrième Jour
          </span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 sm:flex">
          {NAV.map((n) => {
            const on = path.startsWith(n.href);
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                  on ? "bg-surface text-ink" : "text-muted hover:text-ink"
                )}
              >
                <Icon size={14} />
                {n.label}
                {n.href === "/signaux" && nonLus > 0 && (
                  <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-candle px-1 text-[10px] font-bold text-night">
                    {nonLus}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-full border border-grow/25 bg-grow/[0.08] px-2.5 py-1">
            <Flame size={12} className="text-grow" strokeWidth={2.5} />
            <span className="text-[12px] font-semibold tabular-nums text-grow">
              {xp} XP
            </span>
          </div>
          <ThemeToggle />
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-candle to-ember text-[12px] font-bold text-night">
            {pseudo.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
