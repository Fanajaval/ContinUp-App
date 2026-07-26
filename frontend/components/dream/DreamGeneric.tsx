"use client";

import { motion } from "framer-motion";
import { useId } from "react";
import type { TemplateType } from "@/lib/contracts";

/**
 * Rendu de repli pour villa / voiture / centre d'aide / générique.
 * Même contrat de calques que DreamHouse (8 étapes, mêmes `id`) : D peut
 * remplacer ce fichier par des déclinaisons dédiées sans toucher au reste.
 * Simple mais propre — jamais une page vide.
 */

type Props = {
  type: TemplateType;
  etapes: string[];
  candle?: boolean;
  gold?: boolean;
  className?: string;
  still?: boolean;
};

const PALETTE: Record<string, { corps: string; corps2: string; toit: string; sol: string }> = {
  villa: { corps: "#F4EDE2", corps2: "#DCD2C2", toit: "#5FA8D3", sol: "#D9C9A3" },
  voiture: { corps: "#9FB4D0", corps2: "#7387A8", toit: "#5B6B85", sol: "#3C4457" },
  centre_aide: { corps: "#EDE3F2", corps2: "#D3C4DC", toit: "#7C6BA8", sol: "#2F5F45" },
  generique: { corps: "#EBD9C0", corps2: "#CDB999", toit: "#8B5E4B", sol: "#2F5F45" },
};

export default function DreamGeneric({
  type,
  etapes,
  candle = false,
  gold = false,
  className,
  still = false,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const has = (id: string) => etapes.includes(id);
  const p = PALETTE[type] ?? PALETTE.generique;

  const Layer = ({
    show,
    children,
    from = 14,
  }: {
    show: boolean;
    children: React.ReactNode;
    from?: number;
  }) => {
    if (!show) return null;
    if (still) return <g>{children}</g>;
    return (
      <motion.g
        initial={{ opacity: 0, y: -from }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 160, damping: 18 }}
      >
        {children}
      </motion.g>
    );
  };

  const Ghost = ({ show, children }: { show: boolean; children: React.ReactNode }) =>
    show ? <g opacity="var(--ghost-opacity)">{children}</g> : null;

  return (
    <svg viewBox="0 0 400 300" className={className} role="img" aria-label="Rêve en construction">
      <defs>
        <linearGradient id={`g-sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--sky-top)" />
          <stop offset="100%" stopColor="var(--sky-bottom)" />
        </linearGradient>
        <radialGradient id={`g-glow-${uid}`}>
          <stop offset="0%" stopColor="#FFD277" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#F5B841" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="400" height="300" fill={`url(#g-sky-${uid})`} />
      {[[60, 46], [140, 30], [250, 62], [330, 40], [300, 100]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.3" fill="#EEF2FA" opacity="var(--star-opacity)" />
      ))}
      {gold && <circle cx="200" cy="170" r="140" fill={`url(#g-glow-${uid})`} opacity="0.35" />}

      {/* 0 terrain nu — jamais d'écran noir à 0 % */}
      {!has("terrain") && (
        <g>
          <path d="M0 240 L400 240 L400 300 L0 300 Z" fill="#1A2338" />
          <line x1="0" y1="240" x2="400" y2="240" stroke="#2E3A55" strokeWidth="2" />
          {[258, 274].map((y) => (
            <line key={y} x1="24" y1={y} x2="376" y2={y} stroke="#2A3450" strokeWidth="1.5" />
          ))}
          <rect x="292" y="216" width="3" height="24" fill="#3E4A66" />
          <rect x="274" y="200" width="40" height="17" rx="2" fill="#232C42" stroke="#3E4A66" strokeWidth="1.5" />
          <line x1="280" y1="206" x2="308" y2="206" stroke="#5A6480" strokeWidth="1.5" />
        </g>
      )}

      {/* 1 terrain */}
      <Ghost show={!has("terrain")}>
        <rect x="100" y="226" width="200" height="18" fill="none" stroke="var(--ghost)" strokeWidth="2" strokeDasharray="7 7" />
      </Ghost>
      <Layer show={has("terrain")} from={0}>
        <path d="M0 240 L400 240 L400 300 L0 300 Z" fill={p.sol} opacity="0.85" />
      </Layer>

      {/* 2 fondations */}
      <Ghost show={has("terrain") && !has("fondations")}>
        <rect x="100" y="226" width="200" height="18" fill="none" stroke="var(--ghost)" strokeWidth="2" strokeDasharray="7 7" />
      </Ghost>
      <Layer show={has("fondations")}>
        <rect x="100" y="226" width="200" height="18" rx="2" fill="#5C6472" />
      </Layer>

      {/* 3 structure — silhouette étagée, jamais un bloc plat */}
      <Ghost show={has("fondations") && !has("murs")}>
        <rect x="118" y="150" width="164" height="76" fill="none" stroke="var(--ghost)" strokeWidth="2" strokeDasharray="7 7" />
      </Ghost>
      <Layer show={has("murs")} from={20}>
        {/* volume principal */}
        <rect x="118" y="150" width="164" height="76" fill={p.corps} />
        {/* aile basse décalée : casse la monotonie du rectangle */}
        <rect x="94" y="182" width="34" height="44" fill={p.corps2} />
        <rect x="94" y="182" width="34" height="44" fill="#000" opacity="0.08" />
        {/* refend vertical + ombre de gauche pour donner du relief */}
        <rect x="118" y="150" width="14" height="76" fill="#000" opacity="0.07" />
        <rect x="118" y="150" width="164" height="76" fill="none" stroke={p.corps2} strokeWidth="2" />
        <line x1="118" y1="188" x2="282" y2="188" stroke={p.corps2} strokeWidth="1.2" opacity="0.55" />
      </Layer>

      {/* 4 toit-terrasse avec débord et garde-corps */}
      <Ghost show={has("murs") && !has("toit")}>
        <rect x="108" y="132" width="184" height="20" fill="none" stroke="var(--ghost)" strokeWidth="2" strokeDasharray="7 7" />
      </Ghost>
      <Layer show={has("toit")} from={30}>
        <rect x="88" y="140" width="212" height="12" rx="3" fill={p.toit} />
        <rect x="88" y="140" width="212" height="4" rx="2" fill="#FFFFFF" opacity="0.18" />
        {/* garde-corps de terrasse */}
        {[104, 124, 144, 164, 184, 204, 224, 244, 264, 284].map((x) => (
          <rect key={x} x={x} y="128" width="2.5" height="12" fill={p.toit} opacity="0.85" />
        ))}
        <rect x="98" y="125" width="196" height="3" rx="1.5" fill={p.toit} />
      </Layer>

      {/* Veilleuse de chantier 🕯️ — cf. DreamHouse : toujours une lumière */}
      {candle && !has("fenetres") && (
        <g>
          <circle cx="318" cy="220" r="54" fill={`url(#g-glow-${uid})`} className="animate-flicker" />
          <rect x="316" y="202" width="3" height="32" rx="1" fill="#6B4530" />
          <path d="M310 202 L326 202 L324 192 L312 192 Z" fill="#4A515D" />
          <rect x="311" y="204" width="13" height="15" rx="2.5" fill="#FFD277" className="animate-flicker" />
          <rect x="311" y="204" width="13" height="15" rx="2.5" fill="none" stroke="#8B5E4B" strokeWidth="1.5" />
          <ellipse cx="318" cy="236" rx="24" ry="5" fill="#F5B841" opacity="0.15" />
        </g>
      )}

      {/* 5 ouvertures 🕯️ */}
      <Ghost show={has("toit") && !has("fenetres")}>
        <rect x="140" y="170" width="38" height="32" fill="none" stroke="var(--ghost)" strokeWidth="2" strokeDasharray="6 6" />
        <rect x="222" y="170" width="38" height="32" fill="none" stroke="var(--ghost)" strokeWidth="2" strokeDasharray="6 6" />
      </Ghost>
      <Layer show={has("fenetres")}>
        {candle && <circle cx="159" cy="186" r="46" fill={`url(#g-glow-${uid})`} className="animate-flicker" />}
        {[140, 222].map((x) => (
          <rect
            key={x}
            x={x}
            y="170"
            width="38"
            height="32"
            fill={candle ? "#FFD277" : "#26334D"}
            stroke={p.corps2}
            strokeWidth="2.5"
            className={candle ? "animate-flicker" : undefined}
          />
        ))}
      </Layer>

      {/* 6 entrée */}
      <Ghost show={has("fenetres") && !has("porte")}>
        <rect x="184" y="182" width="32" height="44" fill="none" stroke="var(--ghost)" strokeWidth="2" strokeDasharray="6 6" />
      </Ghost>
      <Layer show={has("porte")}>
        <rect x="184" y="182" width="32" height="44" rx="3" fill={p.toit} />
        <circle cx="209" cy="204" r="2.5" fill="#F5B841" />
      </Layer>

      {/* 7 abords */}
      <Ghost show={has("porte") && !has("jardin")}>
        <circle cx="330" cy="212" r="20" fill="none" stroke="var(--ghost)" strokeWidth="2" strokeDasharray="6 6" />
      </Ghost>
      <Layer show={has("jardin")} from={10}>
        <rect x="326" y="216" width="8" height="26" fill="#6B4530" />
        <circle cx="330" cy="208" r="20" fill="#3E7A55" />
        <circle cx="70" cy="228" r="14" fill="#3E7A55" />
      </Layer>

      {/* 8 inauguration */}
      <Layer show={has("emmenagement")} from={0}>
        {[0, 2, 4].map((d, i) => (
          <circle
            key={i}
            cx={250 + i * 4}
            cy="112"
            r={6 + i * 2}
            fill="#C9D3E6"
            opacity="0.28"
            className="animate-drift"
            style={{ animationDelay: `${d}s` }}
          />
        ))}
        <circle cx="200" cy="160" r="3" fill="#FFD277" className="animate-flicker" />
      </Layer>
    </svg>
  );
}
