import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Cifrado AES-256-GCM para secretos guardados en la base de datos
// (contraseñas de los enlaces de empresa). La clave sale de APP_SECRET.

function key() {
  const secret = process.env.APP_SECRET;
  if (!secret) throw new Error("Falta APP_SECRET en la configuración del servidor.");
  return createHash("sha256").update(secret).digest();
}

export function encrypt(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), data].map((p) => (typeof p === "string" ? p : p.toString("base64"))).join(":");
}

export function decrypt(value: string) {
  const [version, iv, tag, data] = value.split(":");
  if (version !== "v1") throw new Error("Formato cifrado desconocido.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}
