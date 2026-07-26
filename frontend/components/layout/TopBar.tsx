"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Flame, LayoutGrid, Trophy, ChevronDown, LogOut, User } from "lucide-react";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { logout } from "@/lib/auth";
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
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileOpen]);

  const handleLogout = () => {
    logout();
    setProfileOpen(false);
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-night/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-lg">🕯️</span>
          <span className="font-display text-[15px] font-bold tracking-tight">
            ContinUp
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
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen((value) => !value)}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-line/70 bg-surface px-1 text-sm font-medium text-ink transition hover:border-ink/30"
              aria-expanded={profileOpen}
              aria-haspopup="true"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-candle to-ember text-[12px] font-bold text-night">
                {pseudo.charAt(0).toUpperCase()}
              </span>
              <span className="hidden sm:inline">{pseudo}</span>
              <ChevronDown size={16} className={profileOpen ? "rotate-180 transition" : "transition"} />
            </button>

            <div
              className={cn(
                "absolute right-0 z-20 mt-2 w-screen max-w-xs overflow-visible bg-transparent px-3 transition-all duration-150",
                profileOpen ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-95"
              )}
            >
              <div className="overflow-hidden rounded-3xl bg-night/95 ring-1 ring-white/10 shadow-2xl">
                <div className="border-b border-white/10 px-4 py-4 text-sm text-muted">
                  {pseudo}
                </div>
                <Link
                  href="/account"
                  className="group relative flex items-center gap-3 px-4 py-4 text-sm text-ink transition hover:bg-white/5"
                  onClick={() => setProfileOpen(false)}
                >
                  <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-white/5 text-gray-400 transition group-hover:bg-white/10 group-hover:text-white">
                    <User size={18} />
                  </span>
                  <span className="font-semibold">Voir mon compte</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="group relative flex w-full items-center gap-3 px-4 py-4 text-left text-sm text-red-500 transition hover:bg-red-500/10"
                >
                  <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-red-500/10 text-red-400 transition group-hover:bg-red-500/20 group-hover:text-red-600">
                    <LogOut size={18} />
                  </span>
                  <span className="font-semibold transition group-hover:text-red-600">
                    Déconnexion
                  </span>
                </button>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="hidden rounded-lg p-1.5 text-faint transition-colors hover:bg-surface hover:text-ink sm:inline-flex"
            title="Se déconnecter"
            aria-label="Se déconnecter"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}
