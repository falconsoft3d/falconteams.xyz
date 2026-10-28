"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PLANETS, type PlanetKey } from "@/lib/planets";

// Fondo animado de la cabecera de la landing: el sistema solar (los planetas
// giran, la Tierra tiene días, noches y eclipses), estrellas que giran y cometas
// que salen al mover el ratón. Con el ratón todo se desplaza a
// distintas profundidades (parallax). Respeta «reducir movimiento» del sistema.

// Animaciones propias del componente (no dependen de la hoja global).
const KEYFRAMES = `
@keyframes ft-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
@keyframes ft-orbit { to { transform: rotate(360deg); } }
@keyframes ft-twinkle { 0%, 100% { opacity: .25; } 50% { opacity: 1; } }
@keyframes ft-spin-twinkle {
  0% { transform: rotate(0deg) scale(.85); opacity: .55; }
  50% { transform: rotate(180deg) scale(1.15); opacity: 1; }
  100% { transform: rotate(360deg) scale(.85); opacity: .55; }
}
@keyframes ft-comet {
  0% { transform: translateX(0) scaleX(.3); opacity: 0; }
  12% { opacity: 1; }
  100% { transform: translateX(320px) scaleX(1); opacity: 0; }
}
/* Rotación de los planetas: la textura (dos copias) se desplaza media anchura. */
@keyframes ft-spin-x { to { transform: translateX(-50%); } }
@keyframes ft-spin-y { to { transform: translateY(-50%); } }
/* Eclipses, sincronizados con la órbita de la Luna (10 s; la Luna empieza arriba, del lado del Sol). */
@keyframes ft-solar-eclipse {
  0% { opacity: .75; transform: translateX(0); }
  7% { opacity: 0; transform: translateX(9px); }
  93% { opacity: 0; transform: translateX(-9px); }
  100% { opacity: .75; transform: translateX(0); }
}
@keyframes ft-lunar-eclipse {
  0%, 42%, 58%, 100% { filter: none; }
  47%, 53% { filter: brightness(.55) sepia(1) saturate(4) hue-rotate(-25deg); }
}
@media (prefers-reduced-motion: reduce) { .ft-anim { animation: none !important; } }`;

/** Cometa en (x, y) que sale en la dirección del ratón y se desvanece. */
function spawnComet(layer: HTMLElement, x: number, y: number, angle: number) {
  const wrap = document.createElement("div");
  wrap.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:0;height:0;transform:rotate(${angle}rad);pointer-events:none;`;
  const comet = document.createElement("div");
  const hue = ["#5eead4", "#fcd34d", "#c4b5fd", "#7dd3fc"][Math.floor(Math.random() * 4)];
  const length = 70 + Math.random() * 70;
  comet.style.cssText =
    `position:absolute;right:0;top:-1.5px;width:${length}px;height:3px;border-radius:999px;` +
    `background:linear-gradient(90deg, transparent, ${hue}aa 70%, #ffffff);` +
    `box-shadow:0 0 8px ${hue};transform-origin:right center;` +
    `animation:ft-comet ${0.8 + Math.random() * 0.5}s cubic-bezier(.2,.7,.3,1) forwards;`;
  // Cabeza brillante del cometa.
  const head = document.createElement("div");
  head.style.cssText = `position:absolute;right:-3px;top:-2.5px;width:8px;height:8px;border-radius:50%;background:#fff;box-shadow:0 0 10px 3px ${hue};`;
  comet.appendChild(head);
  wrap.appendChild(comet);
  layer.appendChild(wrap);
  comet.addEventListener("animationend", () => wrap.remove(), { once: true });
}

type Body = {
  key: PlanetKey;
  /** Posición y tamaño en % / px dentro de la cabecera. */
  style: React.CSSProperties;
  /** Cuánto se mueve con el ratón (px a cada lado). */
  depth: number;
  float: string;
  children: React.ReactNode;
};

const planet = (gradient: string, shadow: string) => ({
  background: gradient,
  boxShadow: `inset -12px -14px 30px ${shadow}, 0 20px 40px -20px ${shadow}`,
});

const ring = (w: number, h: number, border: string, rotate: number, back = false) => (
  <div
    className="absolute left-1/2 top-1/2 rounded-[50%]"
    style={{
      width: w,
      height: h,
      border,
      transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
      // La mitad trasera del anillo va detrás del planeta y la delantera, delante.
      clipPath: back ? "polygon(0 0, 100% 0, 100% 50%, 0 50%)" : "polygon(0 50%, 100% 50%, 100% 100%, 0 100%)",
      zIndex: back ? 0 : 2,
    }}
  />
);

/** Iluminación fija: el Sol está arriba a la izquierda (brillo y lado oscuro). */
const LIGHT =
  "radial-gradient(circle at 30% 25%, rgba(255,255,255,.35), transparent 42%), radial-gradient(circle at 32% 28%, transparent 50%, rgba(2,6,23,.6) 80%)";
/** En la Tierra el Sol queda casi encima: el día arriba y la noche abajo. */
const EARTH_LIGHT = "radial-gradient(circle at 45% 12%, rgba(255,255,255,.3), transparent 40%), linear-gradient(172deg, transparent 48%, rgba(2,6,23,.85) 64%)";

/**
 * Planeta que gira: la textura se desplaza dentro del círculo (dos copias para
 * que el bucle no tenga saltos) y la iluminación queda fija encima.
 */
function Globe({ surface, base, period, reverse = false, vertical = false, shadow, light = LIGHT, children }: {
  /** Capas de background-image de la textura (una vuelta del planeta). */
  surface: string;
  base: string;
  /** Segundos por vuelta. */
  period: number;
  reverse?: boolean;
  /** Urano gira «tumbado»: la textura se mueve en vertical. */
  vertical?: boolean;
  shadow: string;
  light?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-[1] overflow-hidden rounded-full" style={{ boxShadow: `0 20px 40px -20px ${shadow}` }}>
      <div
        className={`ft-anim absolute ${vertical ? "inset-x-0 top-0 h-[200%]" : "inset-y-0 left-0 w-[200%]"}`}
        style={{
          backgroundColor: base,
          backgroundImage: surface,
          backgroundSize: vertical ? "100% 50%" : "50% 100%",
          backgroundRepeat: vertical ? "repeat-y" : "repeat-x",
          animation: `${vertical ? "ft-spin-y" : "ft-spin-x"} ${period}s linear infinite${reverse ? " reverse" : ""}`,
        }}
      />
      {children}
      <div className="absolute inset-0 rounded-full" style={{ background: light }} />
    </div>
  );
}

const blob = (w: number, h: number, x: number, y: number, color: string, edge = 60) =>
  `radial-gradient(ellipse ${w}% ${h}% at ${x}% ${y}%, ${color} 0 ${edge}%, transparent ${edge + 4}%)`;

// Texturas (una vuelta): continentes, manchas, bandas y cráteres.
const EARTH_SURFACE = [
  "linear-gradient(180deg, rgba(255,255,255,.85) 0 7%, transparent 10%, transparent 90%, rgba(255,255,255,.85) 93%)",
  blob(20, 5, 35, 22, "rgba(255,255,255,.7)"),
  blob(16, 4, 75, 74, "rgba(255,255,255,.65)"),
  blob(16, 24, 18, 40, "#22c55e"),
  blob(10, 18, 26, 70, "#16a34a"),
  blob(22, 15, 58, 32, "#4ade80"),
  blob(9, 20, 66, 62, "#15803d"),
  blob(12, 8, 86, 46, "#a3e635"),
].join(", ");
// Luces de las ciudades: solo se ven en el lado nocturno (ver la máscara).
const CITY_LIGHTS = [
  [16, 36], [21, 46], [27, 68], [55, 28], [61, 35], [64, 60], [68, 66], [85, 44],
].map(([x, y]) => `radial-gradient(circle at ${x}% ${y}%, #fde047 0 1.6%, transparent 3%)`).join(", ");
const MARS_SURFACE = [
  "linear-gradient(180deg, rgba(255,255,255,.8) 0 6%, transparent 9%)",
  blob(34, 6, 30, 58, "#7c2d12"),
  blob(18, 5, 78, 42, "#9a3412"),
  blob(10, 4, 55, 30, "rgba(124,45,18,.7)"),
].join(", ");
const MERCURY_SURFACE = [[20, 30], [45, 65], [70, 25], [82, 70], [35, 82], [58, 45]]
  .map(([x, y], i) => `radial-gradient(circle at ${x}% ${y}%, #78716c 0 ${6 + (i % 3) * 2}%, transparent ${9 + (i % 3) * 2}%)`)
  .join(", ");
const VENUS_SURFACE = [blob(32, 9, 28, 38, "rgba(255,251,235,.75)"), blob(26, 8, 72, 62, "rgba(255,251,235,.65)"), blob(20, 7, 50, 82, "rgba(217,119,6,.35)")].join(", ");
const JUPITER_SURFACE = [
  blob(13, 8, 60, 64, "#b45309"),
  blob(6, 3, 25, 40, "rgba(255,255,255,.75)"),
  blob(5, 3, 82, 30, "rgba(255,255,255,.7)"),
  "repeating-linear-gradient(180deg, #fde4c3 0 9%, #e7b98a 9% 15%, #f5d0a9 15% 22%, #c98d5a 22% 26%)",
].join(", ");
const SATURN_SURFACE = [blob(10, 4, 35, 40, "rgba(255,255,255,.5)"), "repeating-linear-gradient(180deg, #fef3c7 0 12%, #f5d999 12% 20%, #e9c46a 20% 26%)"].join(", ");
const URANUS_SURFACE = [blob(40, 14, 50, 25, "rgba(236,254,255,.55)"), blob(30, 10, 50, 70, "rgba(14,116,144,.35)")].join(", ");
const NEPTUNE_SURFACE = [
  "repeating-linear-gradient(180deg, transparent 0 18%, rgba(30,58,138,.25) 18% 22%)",
  blob(11, 7, 30, 62, "#1e3a8a"),
  blob(26, 3, 70, 26, "rgba(255,255,255,.75)"),
].join(", ");
const SUN_SPOTS = [[22, 58], [64, 66], [80, 52]].map(([x, y]) => `radial-gradient(circle at ${x}% ${y}%, rgba(194,65,12,.3) 0 1.6%, transparent 3%)`).join(", ");

// Sistema solar alrededor del texto de la cabecera (sin taparlo).
const BODIES: Body[] = [
  {
    // Sol, con manchas solares que giran despacio
    key: "sun",
    style: { left: "-5%", top: "-22%", width: 230, height: 230 },
    depth: 10,
    float: "ft-float 14s ease-in-out infinite",
    children: (
      <div
        className="absolute inset-0 overflow-hidden rounded-full"
        style={{
          background: "radial-gradient(circle at 45% 45%, #fff7ae, #fcd34d 35%, #f59e0b 65%, #ea580c)",
          boxShadow: "0 0 60px 20px rgba(251,191,36,.45), 0 0 120px 50px rgba(251,146,60,.25)",
        }}
      >
        <div
          className="ft-anim absolute inset-y-0 left-0 w-[200%]"
          style={{ backgroundImage: SUN_SPOTS, backgroundSize: "50% 100%", backgroundRepeat: "repeat-x", animation: "ft-spin-x 60s linear infinite" }}
        />
      </div>
    ),
  },
  {
    // Mercurio
    key: "mercury",
    style: { left: "15%", top: "10%", width: 16, height: 16 },
    depth: 48,
    float: "ft-float 6s ease-in-out infinite",
    children: <Globe surface={MERCURY_SURFACE} base="#a8a29e" period={30} shadow="rgba(68,64,60,.5)" />,
  },
  {
    // Venus (rotación retrógrada: gira al revés)
    key: "venus",
    style: { left: "21%", top: "26%", width: 26, height: 26 },
    depth: 44,
    float: "ft-float 8s ease-in-out infinite",
    children: <Globe surface={VENUS_SURFACE} base="#fcd34d" period={28} reverse shadow="rgba(180,83,9,.45)" />,
  },
  {
    // Tierra: días y noches al girar, luces de ciudades, y la Luna con sus eclipses
    key: "earth",
    style: { left: "7%", bottom: "14%", width: 58, height: 58 },
    depth: 34,
    float: "ft-float 9s ease-in-out infinite",
    children: (
      <>
        <Globe surface={EARTH_SURFACE} base="#2563eb" period={12} shadow="rgba(30,58,138,.5)" light={EARTH_LIGHT}>
          {/* Luces de las ciudades, visibles solo en el lado de noche */}
          <div
            className="ft-anim absolute inset-y-0 left-0 w-[200%]"
            style={{
              backgroundImage: CITY_LIGHTS,
              backgroundSize: "50% 100%",
              backgroundRepeat: "repeat-x",
              animation: "ft-spin-x 12s linear infinite",
              maskImage: "linear-gradient(172deg, transparent 54%, black 66%)",
              WebkitMaskImage: "linear-gradient(172deg, transparent 54%, black 66%)",
              zIndex: 2,
            }}
          />
          {/* Sombra de la Luna: eclipse solar cuando la Luna pasa entre el Sol y la Tierra */}
          <div
            className="ft-anim absolute left-[32%] top-[2%] z-[3] size-[36%] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(2,6,23,.9), rgba(2,6,23,.4) 55%, transparent 72%)", animation: "ft-solar-eclipse 10s linear infinite" }}
          />
        </Globe>
        {/* Órbita de la Luna (10 s, sentido horario, empieza arriba) */}
        <div className="ft-anim absolute inset-[-26px] z-[2]" style={{ animation: "ft-orbit 10s linear infinite" }}>
          <div
            className="ft-anim absolute left-1/2 top-0 size-3.5 -translate-x-1/2 rounded-full"
            style={{ ...planet("radial-gradient(circle at 35% 30%, #f8fafc, #94a3b8)", "rgba(71,85,105,.5)"), animation: "ft-lunar-eclipse 10s linear infinite" }}
          />
        </div>
      </>
    ),
  },
  {
    // Marte
    key: "mars",
    style: { left: "24%", bottom: "6%", width: 32, height: 32 },
    depth: 40,
    float: "ft-float 7s ease-in-out infinite",
    children: <Globe surface={MARS_SURFACE} base="#ea580c" period={13} shadow="rgba(124,45,18,.5)" />,
  },
  {
    // Júpiter: rota deprisa y la Gran Mancha Roja da la vuelta
    key: "jupiter",
    style: { right: "3%", top: "8%", width: 130, height: 130 },
    depth: 18,
    float: "ft-float 12s ease-in-out infinite",
    children: <Globe surface={JUPITER_SURFACE} base="#e7b98a" period={7} shadow="rgba(120,53,15,.5)" />,
  },
  {
    // Saturno con anillos
    key: "saturn",
    style: { right: "20%", bottom: "8%", width: 84, height: 84 },
    depth: 26,
    float: "ft-float 11s ease-in-out infinite",
    children: (
      <>
        {ring(190, 46, "7px solid rgba(214,182,128,.75)", -16, true)}
        <Globe surface={SATURN_SURFACE} base="#f5d999" period={8} shadow="rgba(146,104,30,.5)" />
        {ring(190, 46, "7px solid rgba(214,182,128,.85)", -16)}
      </>
    ),
  },
  {
    // Urano, «tumbado»: gira en vertical, con su anillo casi vertical
    key: "uranus",
    style: { right: "4%", bottom: "30%", width: 46, height: 46 },
    depth: 38,
    float: "ft-float 9.5s ease-in-out infinite",
    children: (
      <>
        {ring(18, 84, "2px solid rgba(165,243,252,.8)", 8, true)}
        <Globe surface={URANUS_SURFACE} base="#67e8f9" period={14} vertical shadow="rgba(14,116,144,.5)" />
        {ring(18, 84, "2px solid rgba(165,243,252,.9)", 8)}
      </>
    ),
  },
  {
    // Neptuno, con la Gran Mancha Oscura y nubes blancas
    key: "neptune",
    style: { right: "32%", top: "4%", width: 40, height: 40 },
    depth: 50,
    float: "ft-float 8.5s ease-in-out infinite",
    children: <Globe surface={NEPTUNE_SURFACE} base="#3b82f6" period={10} shadow="rgba(30,58,138,.55)" />,
  },
];

// Posiciones fijas (deterministas: iguales en servidor y cliente).
const DUST = Array.from({ length: 60 }, (_, i) => ({
  left: `${(i * 37 + 7) % 100}%`,
  top: `${(i * 53 + 11) % 100}%`,
  size: 1.5 + (i % 3),
  delay: `${(i % 9) * 0.45}s`,
}));
// Las estrellas grandes van en los laterales (0-24 % y 76-96 %) para no tapar el texto.
const SPARKLES = Array.from({ length: 14 }, (_, i) => ({
  left: `${i % 2 ? 76 + ((i * 7) % 20) : (i * 11) % 24}%`,
  top: `${(i * 41 + 7) % 92}%`,
  size: 10 + ((i * 7) % 14),
  spin: `${6 + (i % 5) * 2}s`,
  delay: `${(i % 6) * 0.7}s`,
  color: ["#0d9488", "#f59e0b", "#8b5cf6", "#0ea5e9"][i % 4],
  reverse: i % 2 === 1,
}));

/** Estrella de cuatro puntas. */
function Sparkle({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-full" style={{ filter: `drop-shadow(0 0 4px ${color}88)` }}>
      <path d="M12 0c.6 5.6 1.9 9.9 12 12-10.1 2.1-11.4 6.4-12 12-.6-5.6-1.9-9.9-12-12C10.1 9.9 11.4 5.6 12 0Z" fill={color} />
    </svg>
  );
}

const LABELS = {
  es: { diameter: "Diámetro", sun: "Distancia al Sol", earth: "Distancia a la Tierra", temp: "Temperatura media", surface: "Temperatura de la superficie", moons: "Lunas", gravity: "Gravedad", discovered: "Descubrimiento", planets: "8 planetas", here: "Estás aquí", mkm: "millones de km" },
  en: { diameter: "Diameter", sun: "Distance to the Sun", earth: "Distance to Earth", temp: "Average temperature", surface: "Surface temperature", moons: "Moons", gravity: "Gravity", discovered: "Discovery", planets: "8 planets", here: "You are here", mkm: "million km" },
};

const CARD_W = 264;
const CARD_H = 250;

/**
 * Ficha con los datos del planeta bajo el ratón. Se pinta en document.body con
 * posición fija, por encima de todo, y se ajusta para no salirse de la pantalla.
 */
function PlanetCard({ planet, locale, anchor }: { planet: PlanetKey; locale: "es" | "en"; anchor: DOMRect }) {
  const info = PLANETS[planet];
  const t = LABELS[locale];
  const num = (n: number, digits = 0) => new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-GB", { maximumFractionDigits: digits }).format(n);
  const rows: [string, string][] = [
    [t.diameter, `${num(info.diameterKm)} km`],
    [t.sun, info.sunDistanceMkm === null ? "—" : `${num(info.sunDistanceMkm, 1)} ${t.mkm}`],
    [t.earth, info.earthDistanceMkm === null ? t.here : `${num(info.earthDistanceMkm[0], 1)} – ${num(info.earthDistanceMkm[1], 1)} ${t.mkm}`],
    [planet === "sun" ? t.surface : t.temp, `${num(info.tempC)} °C`],
    [t.moons, info.moons ?? t.planets],
    [t.gravity, `${num(info.gravity, 2)} m/s²`],
    [t.discovered, info.discovered[locale]],
  ];
  // A la derecha del planeta si cabe; si no, a la izquierda. Centrada en vertical y dentro de la ventana.
  const gap = 12;
  const left = anchor.right + gap + CARD_W <= window.innerWidth - 8 ? anchor.right + gap : Math.max(8, anchor.left - gap - CARD_W);
  const top = Math.min(Math.max(8, anchor.top + anchor.height / 2 - CARD_H / 2), window.innerHeight - CARD_H - 8);
  return createPortal(
    <div
      role="tooltip"
      style={{ position: "fixed", left, top, width: CARD_W, zIndex: 100 }}
      className="pointer-events-none rounded-xl border border-slate-200 bg-white/95 p-3 text-left text-xs shadow-2xl backdrop-blur"
    >
      <p className="mb-2 text-sm font-bold text-slate-900">{info.name[locale]}</p>
      <dl className="space-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-slate-500">{label}</dt>
            <dd className="text-right font-medium text-slate-800">{value}</dd>
          </div>
        ))}
      </dl>
    </div>,
    document.body,
  );
}

// Constelaciones (posiciones aproximadas de sus estrellas principales).
type Constellation = { name: { es: string; en: string }; size: [number, number]; stars: [number, number, number][]; lines: [number, number][] };
const URSA_MAJOR: Constellation = {
  name: { es: "Osa Mayor", en: "Ursa Major" },
  size: [170, 100],
  // Dubhe, Merak, Phecda, Megrez (el cazo) y Alioth, Mizar, Alkaid (el mango)
  stars: [[8, 20, 2.6], [14, 52, 2.4], [52, 58, 2], [56, 30, 1.7], [88, 26, 2.4], [118, 28, 2.3], [150, 50, 2.3]],
  lines: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]],
};
const URSA_MINOR: Constellation = {
  name: { es: "Osa Menor", en: "Ursa Minor" },
  size: [112, 96],
  // Polaris, Yildun, Épsilon, Zeta, Eta, Pherkad, Kochab
  stars: [[8, 12, 3], [30, 22, 1.5], [48, 36, 1.6], [64, 54, 1.7], [90, 50, 1.5], [98, 78, 2], [72, 84, 2.4]],
  lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]],
};

/** Constelación con líneas tenues y estrellas que parpadean. */
function ConstellationSvg({ c, locale }: { c: Constellation; locale: "es" | "en" }) {
  const [w, h] = c.size;
  return (
    <svg viewBox={`0 0 ${w} ${h + 14}`} width={w} height={h + 14} className="overflow-visible">
      {c.lines.map(([a, b], i) => (
        <line key={i} x1={c.stars[a][0]} y1={c.stars[a][1]} x2={c.stars[b][0]} y2={c.stars[b][1]} className="stroke-slate-400/60" strokeWidth={0.8} strokeDasharray="2 3" />
      ))}
      {c.stars.map(([x, y, r], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={r}
          className="ft-anim fill-slate-700"
          style={{ animation: `ft-twinkle ${2.5 + (i % 4) * 0.7}s ease-in-out infinite`, animationDelay: `${i * 0.35}s`, filter: "drop-shadow(0 0 3px rgba(94,234,212,.9))" }}
        />
      ))}
      <text x={w / 2} y={h + 12} textAnchor="middle" className="fill-slate-400" style={{ fontSize: 9, letterSpacing: ".08em" }}>
        {c.name[locale].toUpperCase()}
      </text>
    </svg>
  );
}

/** Agujero negro lejano: disco de acreción que gira, anillo de luz curvada y horizonte de sucesos. */
function BlackHole() {
  return (
    <div className="relative size-full">
      {/* Disco de acreción, visto casi de canto */}
      <div className="absolute inset-[-30%]" style={{ transform: "rotate(-18deg) scaleY(.32)" }}>
        <div
          className="ft-anim absolute inset-0 rounded-full"
          style={{
            background: "conic-gradient(from 0deg, transparent, #fb923c, #fde68a 18%, #f97316 30%, transparent 48%, #fdba74 66%, #fef3c7 78%, transparent)",
            filter: "blur(1.2px)",
            maskImage: "radial-gradient(circle, transparent 28%, black 33%, black 60%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(circle, transparent 28%, black 33%, black 60%, transparent 70%)",
            animation: "ft-orbit 5s linear infinite",
          }}
        />
      </div>
      {/* Luz del disco curvada por la gravedad, por encima y por debajo */}
      <div className="absolute inset-[18%] rounded-full" style={{ border: "2px solid rgba(253,186,116,.55)", filter: "blur(.8px)" }} />
      {/* Horizonte de sucesos con su anillo de fotones */}
      {/* Negro fijo: la paleta de Tailwind se invierte en modo oscuro y «black» pasaría a blanco. */}
      <div className="absolute inset-[30%] rounded-full" style={{ background: "#000", boxShadow: "0 0 0 1.5px rgba(254,215,170,.95), 0 0 14px 5px rgba(251,146,60,.55)" }} />
    </div>
  );
}

export function PlanetsHero({ locale = "es" }: { locale?: "es" | "en" }) {
  const [active, setActive] = useState<{ key: PlanetKey; rect: DOMRect } | null>(null);

  // Al hacer scroll la ficha quedaría desplazada: se cierra.
  useEffect(() => {
    if (!active) return;
    const close = () => setActive(null);
    window.addEventListener("scroll", close, { passive: true });
    return () => window.removeEventListener("scroll", close);
  }, [active]);
  const ref = useRef<HTMLDivElement>(null);
  const comets = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = ref.current;
    const host = layer?.parentElement;
    if (!layer || !host || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let last: { x: number; y: number; t: number } | null = null;
    const onMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      // Un cometa cada vez que el ratón recorre una distancia (como mucho ~8 por segundo).
      const now = performance.now();
      if (last) {
        const dx = px - last.x;
        const dy = py - last.y;
        if (Math.hypot(dx, dy) > 60 && now - last.t > 120) {
          spawnComet(comets.current!, px, py, Math.atan2(dy, dx));
          last = { x: px, y: py, t: now };
        }
      } else {
        last = { x: px, y: py, t: now };
      }
      const x = px / rect.width - 0.5;
      const y = py / rect.height - 0.5;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        layer.style.setProperty("--mx", x.toFixed(3));
        layer.style.setProperty("--my", y.toFixed(3));
      });
    };
    const onLeave = () => {
      last = null;
      layer.style.setProperty("--mx", "0");
      layer.style.setProperty("--my", "0");
    };
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden [--mx:0] [--my:0]">
      <style>{KEYFRAMES}</style>
      {/* Capa de los cometas (se añaden y quitan directamente en el DOM). */}
      <div ref={comets} className="absolute inset-0 z-[5]" />
      {/* Polvo de estrellas: una capa grande que gira despacio alrededor del centro. */}
      <div
        className="absolute left-1/2 top-1/2 size-[180vmax] -translate-x-1/2 -translate-y-1/2 transition-transform duration-500 ease-out"
        style={{ translate: "calc(-50% + var(--mx) * -16px) calc(-50% + var(--my) * -16px)" }}
      >
        <div className="relative size-full motion-safe:animate-[ft-orbit_240s_linear_infinite]">
          {DUST.map((d, i) => (
            <span
              key={i}
              className="absolute rounded-full bg-slate-500/50 motion-safe:animate-[ft-twinkle_3.5s_ease-in-out_infinite]"
              style={{ left: d.left, top: d.top, width: d.size, height: d.size, animationDelay: d.delay }}
            />
          ))}
        </div>
      </div>
      {/* Estrellas de cuatro puntas que giran sobre sí mismas y parpadean. */}
      {/* A lo lejos: un agujero negro y las constelaciones de la Osa Mayor y la Osa Menor (casi no se mueven con el ratón). */}
      <div
        className="absolute left-[39%] top-[3%] size-14 opacity-90 transition-transform duration-700 ease-out"
        style={{ transform: "translate3d(calc(var(--mx) * -6px), calc(var(--my) * -6px), 0)" }}
      >
        <BlackHole />
      </div>
      <div className="absolute right-[13%] top-[36%] opacity-80 transition-transform duration-700 ease-out" style={{ transform: "translate3d(calc(var(--mx) * -8px), calc(var(--my) * -8px), 0)" }}>
        <ConstellationSvg c={URSA_MAJOR} locale={locale} />
      </div>
      <div className="absolute left-[2%] top-[30%] opacity-80 transition-transform duration-700 ease-out" style={{ transform: "translate3d(calc(var(--mx) * -8px), calc(var(--my) * -8px), 0)" }}>
        <ConstellationSvg c={URSA_MINOR} locale={locale} />
      </div>
      {SPARKLES.map((s, i) => (
        <div
          key={i}
          className="absolute transition-transform duration-500 ease-out"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            transform: `translate3d(calc(var(--mx) * ${-20 - (i % 4) * 8}px), calc(var(--my) * ${-20 - (i % 4) * 8}px), 0)`,
          }}
        >
          <div
            className="size-full motion-safe:animate-[ft-spin-twinkle_var(--spin)_linear_infinite]"
            style={{ "--spin": s.spin, animationDelay: s.delay, animationDirection: s.reverse ? "reverse" : "normal" } as React.CSSProperties}
          >
            <Sparkle color={s.color} />
          </div>
        </div>
      ))}
      {BODIES.map((b) => (
        <div
          key={b.key}
          // Los planetas sí reciben el ratón (para su ficha); el resto de la capa no.
          className="pointer-events-auto absolute cursor-help transition-transform duration-500 ease-out"
          style={{ ...b.style, transform: `translate3d(calc(var(--mx) * ${b.depth * 2}px), calc(var(--my) * ${b.depth * 2}px), 0)` }}
          onPointerEnter={(e) => setActive({ key: b.key, rect: e.currentTarget.getBoundingClientRect() })}
          onPointerLeave={() => setActive((a) => (a?.key === b.key ? null : a))}
        >
          {active?.key === b.key && <PlanetCard planet={b.key} locale={locale} anchor={active.rect} />}
          <div className="relative size-full motion-safe:animate-[var(--float)]" style={{ "--float": b.float } as React.CSSProperties}>
            {b.children}
          </div>
        </div>
      ))}
    </div>
  );
}
