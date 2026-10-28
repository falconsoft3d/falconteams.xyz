// Variables de entorno que necesita la app. Las comprueban el proxy (antes de
// servir cualquier página) y el arranque del servidor (instrumentation.ts).
// Nunca se muestran sus valores, solo sus nombres.

type Rule = {
  name: string;
  required: boolean;
  /** Para qué sirve y cómo conseguirla. */
  hint: string;
  valid: (value: string) => boolean;
};

const RULES: Rule[] = [
  {
    name: "FDB_PROJECT",
    required: true,
    hint: "Ref del proyecto de falcondatabase (20 letras minúsculas). Está en la URL del proyecto en falcondatabase.com.",
    valid: (v) => /^[a-z]{20}$/.test(v),
  },
  {
    name: "FDB_ANON_KEY",
    required: true,
    hint: "Clave anon del proyecto (empieza por fdb_anon_). La muestra «npm run setup» o la pestaña API del proyecto.",
    valid: (v) => v.startsWith("fdb_anon_"),
  },
  {
    name: "FDB_AI_TOKEN",
    required: true,
    hint: "Token de servidor (empieza por fdb_ai_). Se genera en «Gestiona este proyecto con IA». Solo vive en el servidor.",
    valid: (v) => v.startsWith("fdb_ai_"),
  },
  {
    name: "APP_SECRET",
    required: true,
    hint: "Clave para cifrar las contraseñas guardadas (al menos 16 caracteres). Genérala con: openssl rand -base64 32. No la cambies una vez en uso.",
    valid: (v) => v.length >= 16,
  },
  {
    name: "FDB_URL",
    required: false,
    hint: "URL de falcondatabase (por defecto https://falcondatabase.com).",
    valid: (v) => /^https?:\/\/\S+$/.test(v),
  },
  {
    name: "APP_TIMEZONE",
    required: false,
    hint: "Zona horaria IANA, por ejemplo Europe/Madrid.",
    valid: (v) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: v });
        return true;
      } catch {
        return false;
      }
    },
  },
  {
    name: "OPENAI_BASE_URL",
    required: false,
    hint: "API compatible con OpenAI (por defecto https://api.openai.com/v1).",
    valid: (v) => /^https?:\/\/\S+$/.test(v),
  },
];

export type EnvProblem = { name: string; problem: "missing" | "invalid"; hint: string };

/** Variables obligatorias que faltan y variables (obligatorias u opcionales) con formato no válido. */
export function checkEnv(env: Record<string, string | undefined> = process.env): EnvProblem[] {
  const problems: EnvProblem[] = [];
  for (const rule of RULES) {
    const value = env[rule.name]?.trim();
    if (!value) {
      if (rule.required) problems.push({ name: rule.name, problem: "missing", hint: rule.hint });
    } else if (!rule.valid(value)) {
      problems.push({ name: rule.name, problem: "invalid", hint: rule.hint });
    }
  }
  return problems;
}
