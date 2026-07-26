"use client";

import { motion } from "framer-motion";
import { useId } from "react";

/**
 * 🏠 LE TEMPLATE MAISON EN 8 CALQUES — l'asset joyau (Fiche B, H2-H5)
 *
 * Chaque calque est un <g> piloté par `etapes_done`.
 * Les calques non acquis sont dessinés en FANTÔME (pointillés très discrets) :
 * c'est la zone de révélation — on montre le manque sans jamais le reprocher.
 *
 * `candle` = état silencieux 🕯️ : la fenêtre s'allume. Le projet n'est pas mort,
 * quelqu'un veille à l'intérieur. C'est le geste signature du produit.
 */

type Props = {
  etapes: string[];
  /** Allume la fenêtre (état silencieux). */
  candle?: boolean;
  /** Halo doré + rayons (état achevé). */
  gold?: boolean;
  className?: string;
  /** Désactive les animations d'entrée (utile pour les miniatures de cards). */
  still?: boolean;
};

const spring = { type: "spring" as const, stiffness: 160, damping: 18 };

export default function DreamHouse({
  etapes,
  candle = false,
  gold = false,
  className,
  still = false,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const has = (id: string) => etapes.includes(id);

  /** Calque : animation de "pose" (tombe et s'installe). */
  const Layer = ({
    show,
    children,
    from = 14,
    delay = 0,
  }: {
    show: boolean;
    children: React.ReactNode;
    from?: number;
    delay?: number;
  }) => {
    if (!show) return null;
    if (still) return <g>{children}</g>;
    return (
      <motion.g
        initial={{ opacity: 0, y: -from }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay }}
      >
        {children}
      </motion.g>
    );
  };

  /** Fantôme : ce qui n'existe pas encore, en pointillés très doux. */
  const Ghost = ({
    show,
    children,
  }: {
    show: boolean;
    children: React.ReactNode;
  }) => (show ? <g opacity="var(--ghost-opacity)">{children}</g> : null);

  return (
    <svg
      viewBox="0 0 400 300"
      className={className}
      role="img"
      aria-label="Maison en construction"
    >
      <defs>
        <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--sky-top)" />
          <stop offset="60%" stopColor="var(--sky-mid)" />
          <stop offset="100%" stopColor="var(--sky-bottom)" />
        </linearGradient>
        <linearGradient id={`wall-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#F2E2C9" />
          <stop offset="55%" stopColor="#EBD9C0" />
          <stop offset="100%" stopColor="#CDB999" />
        </linearGradient>
        <linearGradient id={`roof-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A86B52" />
          <stop offset="100%" stopColor="#7A4B39" />
        </linearGradient>
        <linearGradient id={`ground-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2F5F45" />
          <stop offset="100%" stopColor="#1E3D2E" />
        </linearGradient>
        <radialGradient id={`glow-${uid}`}>
          <stop offset="0%" stopColor="#FFD277" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#F5B841" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#F5B841" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`gold-${uid}`}>
          <stop offset="0%" stopColor="#FFD277" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#FFD277" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ── Ciel ───────────────────────────────────────────────── */}
      <rect width="400" height="300" fill={`url(#sky-${uid})`} />
      <circle cx="330" cy="52" r="15" fill="#E8EEFB" opacity="0.14" />
      {[
        [48, 40],
        [96, 68],
        [150, 34],
        [260, 58],
        [300, 92],
        [368, 120],
        [22, 96],
        [206, 46],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.3" fill="#EEF2FA" opacity="var(--star-opacity)" />
      ))}

      {/* Halo doré — achèvement 🏆 */}
      {gold && (
        <motion.circle
          cx="200"
          cy="170"
          r="150"
          fill={`url(#gold-${uid})`}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1 }}
        />
      )}

      {/* ══ CALQUE 0 — LE TERRAIN NU (état « vide ») ════════════
          Jamais un écran noir : même à 0 %, on voit la parcelle qui
          attend, avec son panneau. Le vide doit donner envie, pas
          ressembler à une erreur de chargement.                     */}
      {!has("terrain") && (
        <g>
          <path d="M0 236 Q 200 216 400 236 L400 300 L0 300 Z" fill="#1A2338" />
          <path d="M0 236 Q 200 216 400 236" fill="none" stroke="#2E3A55" strokeWidth="2" />
          {/* sillons de terre en attente */}
          {[254, 268, 282].map((y, i) => (
            <path
              key={y}
              d={`M${20 + i * 8} ${y} Q 200 ${y - 8} ${380 - i * 8} ${y}`}
              fill="none"
              stroke="#2A3450"
              strokeWidth="1.5"
              opacity="0.8"
            />
          ))}
          {/* panneau « à bâtir » */}
          <rect x="292" y="212" width="3" height="26" fill="#3E4A66" />
          <rect x="272" y="196" width="44" height="18" rx="2" fill="#232C42" stroke="#3E4A66" strokeWidth="1.5" />
          <line x1="279" y1="203" x2="309" y2="203" stroke="#5A6480" strokeWidth="1.5" />
          <line x1="279" y1="208" x2="301" y2="208" stroke="#5A6480" strokeWidth="1.5" />
        </g>
      )}

      {/* ══ CALQUE 1 — TERRAIN ═════════════════════════════════ */}
      <Ghost show={!has("terrain")}>
        <rect
          x="98"
          y="222"
          width="204"
          height="20"
          fill="none"
          stroke="var(--ghost)"
          strokeWidth="2"
          strokeDasharray="7 7"
          rx="2"
        />
      </Ghost>
      <Layer show={has("terrain")} from={0}>
        <path
          d="M0 236 Q 200 216 400 236 L400 300 L0 300 Z"
          fill={`url(#ground-${uid})`}
        />
        <path
          d="M0 236 Q 200 216 400 236"
          fill="none"
          stroke="#4A8560"
          strokeWidth="2"
          opacity="0.6"
        />
        {/* sentier vers la porte */}
        <path
          d="M196 300 L188 262 L212 262 L206 300 Z"
          fill="#5B6274"
          opacity="0.55"
        />
      </Layer>

      {/* ══ CALQUE 2 — FONDATIONS ══════════════════════════════ */}
      <Ghost show={has("terrain") && !has("fondations")}>
        <rect
          x="98"
          y="222"
          width="204"
          height="20"
          fill="none"
          stroke="var(--ghost)"
          strokeWidth="2"
          strokeDasharray="7 7"
          rx="2"
        />
      </Ghost>
      <Layer show={has("fondations")}>
        <rect x="98" y="222" width="204" height="20" rx="2" fill="#5C6472" />
        <rect x="98" y="222" width="204" height="5" rx="2" fill="#767F90" />
        {[112, 140, 168, 196, 224, 252, 280].map((x) => (
          <rect key={x} x={x} y="229" width="10" height="9" fill="#4A515D" opacity="0.5" />
        ))}
      </Layer>

      {/* ══ CALQUE 3 — MURS ════════════════════════════════════ */}
      <Ghost show={has("fondations") && !has("murs")}>
        <rect
          x="112"
          y="140"
          width="176"
          height="82"
          fill="none"
          stroke="var(--ghost)"
          strokeWidth="2"
          strokeDasharray="7 7"
        />
      </Ghost>
      <Layer show={has("murs")} from={20}>
        <rect x="112" y="140" width="176" height="82" fill={`url(#wall-${uid})`} />
        <rect x="112" y="140" width="176" height="82" fill="none" stroke="#B9A587" strokeWidth="1.5" />
        {/* rangs de briques */}
        {[156, 172, 188, 204].map((y, i) => (
          <line
            key={y}
            x1="112"
            y1={y}
            x2="288"
            y2={y}
            stroke="#C9B597"
            strokeWidth="1"
            opacity={0.45 - i * 0.05}
          />
        ))}
        {/* ombre portée intérieure */}
        <rect x="112" y="140" width="176" height="82" fill="#000" opacity="0.06" />
      </Layer>

      {/* ══ CALQUE 4 — TOIT ════════════════════════════════════ */}
      <Ghost show={has("murs") && !has("toit")}>
        <path
          d="M100 142 L200 82 L300 142 Z"
          fill="none"
          stroke="var(--ghost)"
          strokeWidth="2"
          strokeDasharray="7 7"
        />
      </Ghost>
      <Layer show={has("toit")} from={34}>
        <path d="M100 142 L200 82 L300 142 Z" fill={`url(#roof-${uid})`} />
        <path
          d="M100 142 L200 82 L300 142"
          fill="none"
          stroke="#633D2E"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path d="M200 82 L200 142" stroke="#8B5540" strokeWidth="1.5" opacity="0.5" />
        {/* cheminée */}
        <rect x="248" y="96" width="17" height="30" fill="#8B5E4B" />
        <rect x="245" y="92" width="23" height="7" rx="1.5" fill="#A06E58" />
      </Layer>

      {/* ══ VEILLEUSE DE CHANTIER 🕯️ ═══════════════════════════
          RÈGLE PRODUIT : un projet silencieux montre TOUJOURS une
          lumière, même s'il n'a pas encore de fenêtres. Sans ça, le
          geste signature ne marcherait que pour les projets avancés —
          alors que ce sont les chantiers à peine commencés qui ont le
          plus besoin qu'on veille dessus.
          Fenêtres construites → ce sont elles qui s'allument (calque 5).
          Sinon → lampe-tempête posée sur le chantier.                */}
      {candle && !has("fenetres") && (
        <g>
          <circle
            cx="316"
            cy="216"
            r="60"
            fill={`url(#glow-${uid})`}
            className="animate-flicker"
          />
          {/* piquet + lampe-tempête */}
          <rect x="314" y="196" width="3" height="34" rx="1" fill="#6B4530" />
          <path d="M308 196 L324 196 L322 186 L310 186 Z" fill="#4A515D" />
          <rect x="309" y="198" width="14" height="16" rx="2.5" fill="#FFD277" className="animate-flicker" />
          <rect x="309" y="198" width="14" height="16" rx="2.5" fill="none" stroke="#8B5E4B" strokeWidth="1.6" />
          <circle cx="316" cy="206" r="3" fill="#FFF3D6" className="animate-flicker" />
          <ellipse cx="316" cy="232" rx="26" ry="5" fill="#F5B841" opacity="0.16" />
        </g>
      )}

      {/* ══ CALQUE 5 — FENÊTRES 🕯️ ════════════════════════════ */}
      <Ghost show={has("toit") && !has("fenetres")}>
        <rect x="134" y="162" width="40" height="36" fill="none" stroke="var(--ghost)" strokeWidth="2" strokeDasharray="6 6" />
        <rect x="226" y="162" width="40" height="36" fill="none" stroke="var(--ghost)" strokeWidth="2" strokeDasharray="6 6" />
      </Ghost>
      <Layer show={has("fenetres")}>
        {/* Halo de bougie — état silencieux : quelqu'un veille */}
        {candle && (
          <>
            <circle cx="154" cy="180" r="52" fill={`url(#glow-${uid})`} className="animate-flicker" />
            <circle cx="246" cy="180" r="34" fill={`url(#glow-${uid})`} opacity="0.5" className="animate-flicker" />
          </>
        )}
        {[134, 226].map((x, i) => (
          <g key={x}>
            <rect
              x={x}
              y="162"
              width="40"
              height="36"
              fill={candle ? (i === 0 ? "#FFD277" : "#F5B841") : "#26334D"}
              opacity={candle ? 0.95 : 1}
              className={candle ? "animate-flicker" : undefined}
            />
            <rect x={x} y="162" width="40" height="36" fill="none" stroke="#8B5E4B" strokeWidth="3" />
            <line x1={x + 20} y1="162" x2={x + 20} y2="198" stroke="#8B5E4B" strokeWidth="2.5" />
            <line x1={x} y1="180" x2={x + 40} y2="180" stroke="#8B5E4B" strokeWidth="2.5" />
            <rect x={x - 3} y="198" width="46" height="4" rx="1" fill="#A06E58" />
          </g>
        ))}
      </Layer>

      {/* ══ CALQUE 6 — PORTE ═══════════════════════════════════ */}
      <Ghost show={has("fenetres") && !has("porte")}>
        <rect x="182" y="174" width="36" height="48" fill="none" stroke="var(--ghost)" strokeWidth="2" strokeDasharray="6 6" />
      </Ghost>
      <Layer show={has("porte")}>
        <rect x="182" y="174" width="36" height="48" rx="3" fill="#7A4B39" />
        <rect x="186" y="179" width="28" height="43" rx="2" fill="#8B5E4B" />
        <line x1="200" y1="179" x2="200" y2="222" stroke="#6B4030" strokeWidth="1.2" opacity="0.6" />
        <circle cx="209" cy="199" r="2.6" fill="#F5B841" />
        {candle && <ellipse cx="200" cy="226" rx="30" ry="6" fill="#F5B841" opacity="0.18" />}
      </Layer>

      {/* ══ CALQUE 7 — JARDIN ══════════════════════════════════ */}
      <Ghost show={has("porte") && !has("jardin")}>
        <circle cx="330" cy="206" r="24" fill="none" stroke="var(--ghost)" strokeWidth="2" strokeDasharray="6 6" />
        <circle cx="68" cy="216" r="16" fill="none" stroke="var(--ghost)" strokeWidth="2" strokeDasharray="6 6" />
      </Ghost>
      <Layer show={has("jardin")} from={10}>
        {/* grand arbre */}
        <rect x="326" y="208" width="8" height="30" rx="2" fill="#6B4530" />
        <circle cx="330" cy="200" r="24" fill="#3E7A55" />
        <circle cx="317" cy="209" r="15" fill="#478A61" />
        <circle cx="343" cy="207" r="14" fill="#356B4A" />
        {/* buissons */}
        <circle cx="68" cy="222" r="15" fill="#3E7A55" />
        <circle cx="82" cy="228" r="10" fill="#478A61" />
        <circle cx="300" cy="234" r="8" fill="#356B4A" />
        {/* fleurs le long du sentier */}
        {[
          [176, 250],
          [224, 256],
          [170, 268],
          [230, 274],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3" fill={i % 2 ? "#F5B841" : "#E8863C"} opacity="0.9" />
        ))}
      </Layer>

      {/* ══ CALQUE 8 — EMMÉNAGEMENT ════════════════════════════ */}
      <Ghost show={has("jardin") && !has("emmenagement")}>
        <circle cx="256" cy="72" r="9" fill="none" stroke="var(--ghost)" strokeWidth="2" strokeDasharray="5 5" />
        <circle cx="256" cy="54" r="12" fill="none" stroke="var(--ghost)" strokeWidth="2" strokeDasharray="5 5" />
      </Ghost>
      <Layer show={has("emmenagement")} from={0}>
        {/* fumée qui monte de la cheminée : la maison est habitée */}
        {[0, 2.2, 4.4].map((d, i) => (
          <circle
            key={i}
            cx={256 + i * 3}
            cy="84"
            r={7 + i * 2}
            fill="#C9D3E6"
            opacity="0.3"
            className="animate-drift"
            style={{ animationDelay: `${d}s` }}
          />
        ))}
        {/* boîte aux lettres */}
        <rect x="128" y="236" width="4" height="22" fill="#6B4530" />
        <rect x="120" y="226" width="20" height="13" rx="3" fill="#4ADE9B" />
        {/* paillasson */}
        <rect x="186" y="222" width="28" height="6" rx="2" fill="#A06E58" />
        {/* guirlande de fenêtre */}
        <circle cx="200" cy="150" r="3" fill="#FFD277" className="animate-flicker" />
      </Layer>

      {/* Rayons dorés — achèvement */}
      {gold &&
        [0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <motion.line
            key={a}
            x1="200"
            y1="160"
            x2={200 + Math.cos((a * Math.PI) / 180) * 175}
            y2={160 + Math.sin((a * Math.PI) / 180) * 175}
            stroke="#FFD277"
            strokeWidth="1.5"
            opacity="0.16"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.4, delay: 0.3 }}
          />
        ))}
    </svg>
  );
}
