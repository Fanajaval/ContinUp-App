import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formate un délai SANS jamais parler de retard (M4.7). */
export function depuis(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return "à l'instant";
  if (h < 24) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  if (j === 1) return "hier";
  if (j < 7) return `il y a ${j} jours`;
  const s = Math.floor(j / 7);
  return s === 1 ? "il y a une semaine" : `il y a ${s} semaines`;
}

export function heuresDepuis(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}
