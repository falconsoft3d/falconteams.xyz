// Datos de referencia del Sol y los planetas (fuente: NASA Planetary Fact Sheet).
// Las lunas de los gigantes gaseosos siguen descubriéndose: se indica el mínimo conocido.

export type PlanetKey = "sun" | "mercury" | "venus" | "earth" | "mars" | "jupiter" | "saturn" | "uranus" | "neptune";

export type PlanetInfo = {
  name: { es: string; en: string };
  diameterKm: number;
  /** Distancia media al Sol en millones de km (null para el Sol). */
  sunDistanceMkm: number | null;
  /** Distancia a la Tierra en millones de km: mínima y máxima (null para la Tierra). */
  earthDistanceMkm: [number, number] | null;
  /** Temperatura media (en el Sol, de la superficie) en °C. */
  tempC: number;
  moons: string | null;
  gravity: number;
  discovered: { es: string; en: string };
};

export const PLANETS: Record<PlanetKey, PlanetInfo> = {
  sun: {
    name: { es: "Sol", en: "Sun" },
    diameterKm: 1_392_700,
    sunDistanceMkm: null,
    earthDistanceMkm: [147.1, 152.1],
    tempC: 5500,
    moons: null,
    gravity: 274,
    discovered: { es: "Conocido desde la Antigüedad", en: "Known since antiquity" },
  },
  mercury: {
    name: { es: "Mercurio", en: "Mercury" },
    diameterKm: 4_879,
    sunDistanceMkm: 57.9,
    earthDistanceMkm: [77, 222],
    tempC: 167,
    moons: "0",
    gravity: 3.7,
    discovered: { es: "Conocido desde la Antigüedad (visible a simple vista)", en: "Known since antiquity (visible to the naked eye)" },
  },
  venus: {
    name: { es: "Venus", en: "Venus" },
    diameterKm: 12_104,
    sunDistanceMkm: 108.2,
    earthDistanceMkm: [38, 261],
    tempC: 464,
    moons: "0",
    gravity: 8.87,
    discovered: { es: "Conocido desde la Antigüedad (visible a simple vista)", en: "Known since antiquity (visible to the naked eye)" },
  },
  earth: {
    name: { es: "Tierra", en: "Earth" },
    diameterKm: 12_756,
    sunDistanceMkm: 149.6,
    earthDistanceMkm: null,
    tempC: 15,
    moons: "1",
    gravity: 9.81,
    discovered: { es: "Nuestro hogar", en: "Our home" },
  },
  mars: {
    name: { es: "Marte", en: "Mars" },
    diameterKm: 6_792,
    sunDistanceMkm: 227.9,
    earthDistanceMkm: [54.6, 401],
    tempC: -65,
    moons: "2",
    gravity: 3.71,
    discovered: { es: "Conocido desde la Antigüedad (visible a simple vista)", en: "Known since antiquity (visible to the naked eye)" },
  },
  jupiter: {
    name: { es: "Júpiter", en: "Jupiter" },
    diameterKm: 142_984,
    sunDistanceMkm: 778.5,
    earthDistanceMkm: [588, 968],
    tempC: -110,
    moons: "95+",
    gravity: 24.79,
    discovered: { es: "Conocido desde la Antigüedad; Galileo descubrió sus 4 grandes lunas en 1610", en: "Known since antiquity; Galileo found its 4 large moons in 1610" },
  },
  saturn: {
    name: { es: "Saturno", en: "Saturn" },
    diameterKm: 120_536,
    sunDistanceMkm: 1_432,
    earthDistanceMkm: [1_200, 1_660],
    tempC: -140,
    moons: "274+",
    gravity: 10.44,
    discovered: { es: "Conocido desde la Antigüedad; Galileo observó sus anillos en 1610", en: "Known since antiquity; Galileo observed its rings in 1610" },
  },
  uranus: {
    name: { es: "Urano", en: "Uranus" },
    diameterKm: 51_118,
    sunDistanceMkm: 2_867,
    earthDistanceMkm: [2_580, 3_160],
    tempC: -195,
    moons: "28+",
    gravity: 8.69,
    discovered: { es: "William Herschel, 1781", en: "William Herschel, 1781" },
  },
  neptune: {
    name: { es: "Neptuno", en: "Neptune" },
    diameterKm: 49_528,
    sunDistanceMkm: 4_515,
    earthDistanceMkm: [4_300, 4_700],
    tempC: -200,
    moons: "16",
    gravity: 11.15,
    discovered: { es: "Johann Galle, 1846 (predicho por Le Verrier y Adams)", en: "Johann Galle, 1846 (predicted by Le Verrier and Adams)" },
  },
};
