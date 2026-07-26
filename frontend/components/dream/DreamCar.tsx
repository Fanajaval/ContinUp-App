"use client";

import { motion } from "framer-motion";
import { useId } from "react";

/**
 * 🚗 TEMPLATE VOITURE — mêmes 8 `id` d'étapes que la maison,
 * mais une silhouette de véhicule (un bâtiment n'aurait aucun sens).
 * terrain=châssis · fondations=moteur · murs=carrosserie · toit=pavillon
 * fenetres=vitres · porte=portières · jardin=roues+peinture · emmenagement=1er trajet
 */

type Props = {
  etapes: string[];
  candle?: boolean;
  gold?: boolean;
  className?: string;
  still?: boolean;
};

export default function DreamCar({
  etapes,
  candle = false,
  gold = false,
  className,
  still = false,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const has = (id: string) => etapes.includes(id);

  const Layer = ({
    show,
    children,
    from = 12,
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
    <svg viewBox="0 0 400 300" className={className} role="img" aria-label="Voiture en construction">
      <defs>
        <linearGradient id={`c-sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--sky-top)" />
          <stop offset="100%" stopColor="var(--sky-bottom)" />
        </linearGradient>
        <linearGradient id={`c-body-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5FA8D3" />
          <stop offset="55%" stopColor="#3E7FAC" />
          <stop offset="100%" stopColor="#2B5B7E" />
        </linearGradient>
        <radialGradient id={`c-glow-${uid}`}>
          <stop offset="0%" stopColor="#FFD277" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#F5B841" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="400" height="300" fill={`url(#c-sky-${uid})`} />
      {[[60, 46], [150, 30], [260, 58], [340, 44]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.3" fill="#EEF2FA" opacity="var(--star-opacity)" />
      ))}
      {gold && <circle cx="200" cy="180" r="140" fill={`url(#c-glow-${uid})`} opacity="0.4" />}

      {/* Sol d'atelier */}
      <rect y="238" width="400" height="62" fill="#232C42" />
      <line x1="0" y1="238" x2="400" y2="238" stroke="#2E3A55" strokeWidth="2" />

      {/* Terrain nu = atelier vide */}
      {!has("terrain") && (
        <g>
          {[262, 280].map((y) => (
            <line key={y} x1="30" y1={y} x2="370" y2={y} stroke="#2A3450" strokeWidth="1.5" />
          ))}
          <rect x="286" y="206" width="3" height="32" fill="#3E4A66" />
          <rect x="268" y="190" width="40" height="17" rx="2" fill="#232C42" stroke="#3E4A66" strokeWidth="1.5" />
        </g>
      )}

      {/* Veilleuse d'atelier 🕯️ */}
      {candle && !has("fenetres") && (
        <g>
          <circle cx="330" cy="212" r="52" fill={`url(#c-glow-${uid})`} className="animate-flicker" />
          <rect x="328" y="196" width="3" height="42" rx="1" fill="#6B4530" />
          <path d="M322 196 L338 196 L336 186 L324 186 Z" fill="#4A515D" />
          <rect x="323" y="198" width="14" height="15" rx="2.5" fill="#FFD277" className="animate-flicker" />
        </g>
      )}

      {/* 1 châssis */}
      <Ghost show={!has("terrain")}>
        <rect x="96" y="196" width="208" height="10" rx="4" fill="none" stroke="var(--ghost)" strokeWidth="2" strokeDasharray="7 7" />
      </Ghost>
      <Layer show={has("terrain")} from={0}>
        <rect x="96" y="196" width="208" height="10" rx="4" fill="#4A515D" />
        <rect x="112" y="206" width="10" height="14" fill="#3A4150" />
        <rect x="278" y="206" width="10" height="14" fill="#3A4150" />
      </Layer>

      {/* 2 moteur */}
      <Ghost show={has("terrain") && !has("fondations")}>
        <rect x="248" y="172" width="52" height="26" rx="4" fill="none" stroke="var(--ghost)" strokeWidth="2" strokeDasharray="6 6" />
      </Ghost>
      <Layer show={has("fondations")}>
        <rect x="248" y="172" width="52" height="26" rx="4" fill="#5C6472" />
        <rect x="254" y="166" width="12" height="8" rx="2" fill="#767F90" />
        <rect x="272" y="166" width="12" height="8" rx="2" fill="#767F90" />
      </Layer>

      {/* 3 carrosserie */}
      <Ghost show={has("fondations") && !has("murs")}>
        <path d="M92 196 L92 168 Q92 160 102 160 L298 160 Q308 160 308 168 L308 196 Z" fill="none" stroke="var(--ghost)" strokeWidth="2" strokeDasharray="7 7" />
      </Ghost>
      <Layer show={has("murs")} from={18}>
        <path d="M92 196 L92 168 Q92 158 104 158 L296 158 Q308 158 308 168 L308 196 Z" fill={`url(#c-body-${uid})`} />
        <path d="M92 178 L308 178" stroke="#2B5B7E" strokeWidth="1.5" opacity="0.5" />
      </Layer>

      {/* 4 pavillon (toit) */}
      <Ghost show={has("murs") && !has("toit")}>
        <path d="M136 158 L156 118 L250 118 L272 158 Z" fill="none" stroke="var(--ghost)" strokeWidth="2" strokeDasharray="7 7" />
      </Ghost>
      <Layer show={has("toit")} from={26}>
        <path d="M136 158 L156 118 Q158 114 164 114 L244 114 Q250 114 252 118 L272 158 Z" fill="#3E7FAC" />
        <path d="M136 158 L156 118 Q158 114 164 114 L244 114 Q250 114 252 118 L272 158" fill="none" stroke="#2B5B7E" strokeWidth="2" strokeLinejoin="round" />
      </Layer>

      {/* 5 vitres 🕯️ */}
      <Ghost show={has("toit") && !has("fenetres")}>
        <path d="M150 152 L166 124 L196 124 L196 152 Z" fill="none" stroke="var(--ghost)" strokeWidth="2" strokeDasharray="5 5" />
        <path d="M206 124 L240 124 L256 152 L206 152 Z" fill="none" stroke="var(--ghost)" strokeWidth="2" strokeDasharray="5 5" />
      </Ghost>
      <Layer show={has("fenetres")}>
        {candle && <circle cx="200" cy="140" r="56" fill={`url(#c-glow-${uid})`} className="animate-flicker" />}
        <path
          d="M150 152 L166 124 L196 124 L196 152 Z"
          fill={candle ? "#FFD277" : "#1E2A42"}
          stroke="#2B5B7E"
          strokeWidth="2"
          className={candle ? "animate-flicker" : undefined}
        />
        <path
          d="M206 124 L240 124 L256 152 L206 152 Z"
          fill={candle ? "#F5B841" : "#1E2A42"}
          stroke="#2B5B7E"
          strokeWidth="2"
          className={candle ? "animate-flicker" : undefined}
        />
      </Layer>

      {/* 6 portières */}
      <Ghost show={has("fenetres") && !has("porte")}>
        <rect x="150" y="158" width="52" height="38" fill="none" stroke="var(--ghost)" strokeWidth="2" strokeDasharray="5 5" />
      </Ghost>
      <Layer show={has("porte")}>
        <rect x="150" y="158" width="52" height="38" rx="2" fill="#4A8FBE" />
        <rect x="204" y="158" width="52" height="38" rx="2" fill="#4A8FBE" />
        <line x1="202" y1="158" x2="202" y2="196" stroke="#2B5B7E" strokeWidth="2" />
        <rect x="186" y="174" width="10" height="3" rx="1.5" fill="#C9D3E6" />
        <rect x="240" y="174" width="10" height="3" rx="1.5" fill="#C9D3E6" />
      </Layer>

      {/* 7 roues + peinture */}
      <Ghost show={has("porte") && !has("jardin")}>
        <circle cx="136" cy="212" r="22" fill="none" stroke="var(--ghost)" strokeWidth="2" strokeDasharray="6 6" />
        <circle cx="266" cy="212" r="22" fill="none" stroke="var(--ghost)" strokeWidth="2" strokeDasharray="6 6" />
      </Ghost>
      <Layer show={has("jardin")} from={8}>
        {[136, 266].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy="212" r="23" fill="#1E2532" />
            <circle cx={cx} cy="212" r="22" fill="#2A3140" stroke="#161C28" strokeWidth="2" />
            <circle cx={cx} cy="212" r="10" fill="#8FA6C4" />
            <circle cx={cx} cy="212" r="4" fill="#C9D3E6" />
          </g>
        ))}
        {/* liseré de peinture */}
        <rect x="92" y="184" width="216" height="3" fill="#FFD277" opacity="0.55" />
      </Layer>

      {/* 8 premier trajet */}
      <Layer show={has("emmenagement")} from={0}>
        {/* phares allumés */}
        <ellipse cx="88" cy="176" rx="7" ry="5" fill="#FFF3D6" className="animate-flicker" />
        <path d="M82 176 L18 158 L18 196 Z" fill="#FFD277" opacity="0.16" />
        <ellipse cx="312" cy="176" rx="6" ry="4" fill="#E8863C" opacity="0.9" />
        {/* poussière de route */}
        {[0, 2, 4].map((d, i) => (
          <circle
            key={i}
            cx={324 + i * 12}
            cy={228 - i * 2}
            r={5 + i * 2}
            fill="#C9D3E6"
            opacity="var(--star-opacity)"
            className="animate-drift"
            style={{ animationDelay: `${d}s` }}
          />
        ))}
      </Layer>
    </svg>
  );
}
