"use client";

import type { TemplateType } from "@/lib/contracts";
import { etapesVisibles } from "@/lib/templates";
import DreamHouse from "./DreamHouse";
import DreamCar from "./DreamCar";
import DreamGeneric from "./DreamGeneric";

/**
 * <DreamProgress> — le composant demandé par la fiche B (H2-H5).
 * Affiche les calques du template selon les étapes acquises.
 *
 * C'est le SEUL point d'entrée visuel du rêve : cards, page projet et
 * achèvement l'utilisent tous. Si A/C changent le mapping, rien d'autre
 * ne bouge dans le front.
 */

type Props = {
  type: TemplateType;
  /** `project.etapes_done` — brut, l'ordre est verrouillé ici. */
  etapesDone: string[];
  candle?: boolean;
  gold?: boolean;
  className?: string;
  still?: boolean;
};

export default function DreamProgress({
  type,
  etapesDone,
  candle,
  gold,
  className,
  still,
}: Props) {
  // M3.4 — pas de toit volant même si le mapping IA déraille.
  const etapes = etapesVisibles(type, etapesDone);
  const common = { etapes, candle, gold, className, still };

  if (type === "maison") return <DreamHouse {...common} />;
  if (type === "voiture") return <DreamCar {...common} />;
  return <DreamGeneric type={type} {...common} />;
}
