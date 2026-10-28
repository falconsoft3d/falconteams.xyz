import { FdbError, signIn } from "@/lib/fdb";
import { json, preflight } from "@/lib/ext-api";
import { getCompanyBySlug } from "@/lib/data";
import { userForToken } from "@/lib/session";

export const OPTIONS = preflight;

// POST { email, password, company? } → { token, expiresIn, user }
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const slug = String(body.company ?? "").trim();
  if (!email || !password) return json({ error: "Introduce tu email y contraseña." }, 400);

  let session;
  try {
    session = await signIn(email, password);
  } catch (err) {
    const wrong = err instanceof FdbError && err.status === 401;
    return json({ error: wrong ? "Email o contraseña incorrectos." : "No se pudo iniciar sesión." }, wrong ? 401 : 502);
  }
  const user = await userForToken(session.token);
  if (!user) return json({ error: "Tu usuario no tiene acceso a esta aplicación." }, 403);
  if (slug && user.role !== "admin") {
    const company = await getCompanyBySlug(slug);
    if (!company || user.company?.id !== company.id) return json({ error: "Tu usuario no pertenece a esta empresa." }, 403);
  }
  return json({
    token: session.token,
    expiresIn: session.expires_in,
    user: { name: user.name, role: user.role, company: user.company ? { name: user.company.name, slug: user.company.slug } : null },
  });
}
