import { ComposeForm } from "./mail";
import { getMessage, type MailAccount } from "@/lib/mail";

/** Formulario de redacción; si es respuesta, rellena destinatario, asunto y cita. */
export async function ComposeFromQuery({ account, reply, folder }: { account: MailAccount; reply?: number; folder: string }) {
  if (!reply) return <ComposeForm />;
  const original = await getMessage(account, folder, reply, false).catch(() => null);
  if (!original) return <ComposeForm />;
  const quote = (original.text ?? "").split("\n").map((l) => `> ${l}`).join("\n");
  const subject = /^re:/i.test(original.subject) ? original.subject : `Re: ${original.subject}`;
  return <ComposeForm to={original.from} subject={subject} quote={`El ${original.date ?? ""}, ${original.from} escribió:\n${quote}`} />;
}
