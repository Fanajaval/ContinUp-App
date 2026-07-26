"use client";

import DreamProgress from "@/components/dream/DreamProgress";
import { MAISON } from "@/lib/templates";
import type { TemplateType } from "@/lib/contracts";

/**
 * PAGE DE CONTRÔLE VISUEL (interne, non liée dans la nav).
 * Sert à vérifier d'un coup d'œil les 8 calques × les états.
 * À supprimer avant la démo si besoin — ou à garder, ça impressionne.
 */

const IDS = MAISON.etapes.map((e) => e.id);

export default function Lab() {
  const steps = Array.from({ length: 9 }, (_, i) => IDS.slice(0, i));
  const autres: TemplateType[] = ["villa", "voiture", "centre_aide", "generique"];

  return (
    <div className="min-h-screen p-8">
      <h1 className="mb-1 font-display text-2xl font-bold">Lab visuel</h1>
      <p className="mb-6 text-sm text-muted">
        Les 8 calques, puis les états spéciaux.
      </p>

      <h2 className="mb-3 label-xs">Maison — progression calque par calque</h2>
      <div className="mb-10 grid grid-cols-3 gap-3 lg:grid-cols-5">
        {steps.map((s, i) => (
          <div key={i} className="panel overflow-hidden">
            <DreamProgress type="maison" etapesDone={s} still className="w-full" />
            <p className="px-2 py-1.5 text-[11px] text-muted">
              {i}/8 {i > 0 && `· ${MAISON.etapes[i - 1].label}`}
            </p>
          </div>
        ))}
      </div>

      <h2 className="mb-3 label-xs">
        États spéciaux — 🕯️ silencieux (avec et sans fenêtres) · 🏆 achevé
      </h2>
      <div className="mb-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="panel overflow-hidden">
          <DreamProgress type="maison" etapesDone={IDS.slice(0, 3)} candle still className="w-full" />
          <p className="px-2 py-1.5 text-[11px] text-candle">🕯️ silencieux · sans fenêtres</p>
        </div>
        <div className="panel overflow-hidden">
          <DreamProgress type="maison" etapesDone={IDS.slice(0, 6)} candle still className="w-full" />
          <p className="px-2 py-1.5 text-[11px] text-candle">🕯️ silencieux · fenêtres allumées</p>
        </div>
        <div className="panel overflow-hidden">
          <DreamProgress type="maison" etapesDone={IDS} gold still className="w-full" />
          <p className="px-2 py-1.5 text-[11px] text-gold">🏆 achevé</p>
        </div>
        <div className="panel overflow-hidden">
          <DreamProgress type="maison" etapesDone={[]} still className="w-full" />
          <p className="px-2 py-1.5 text-[11px] text-mist">🌱 vide (terrain nu)</p>
        </div>
      </div>

      <h2 className="mb-3 label-xs">Autres templates (repli générique)</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {autres.map((t) => (
          <div key={t} className="panel overflow-hidden">
            <DreamProgress type={t} etapesDone={IDS.slice(0, 5)} candle={t === "villa"} still className="w-full" />
            <p className="px-2 py-1.5 text-[11px] text-muted">{t}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
