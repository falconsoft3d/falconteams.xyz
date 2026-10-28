import "server-only";
import { connection } from "next/server";

/** Hora actual de la petición. connection() indica a Next que no debe prerenderizarse. */
export async function requestNow() {
  await connection();
  return new Date();
}
