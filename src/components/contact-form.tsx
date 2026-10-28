"use client";

import { useActionState } from "react";
import { sendContactMessage } from "@/lib/actions";
import type { DICTIONARIES } from "@/lib/i18n";
import { btnPrimary, input, label } from "./ui";

export function ContactForm({ labels }: { labels: (typeof DICTIONARIES)["es"]["contact"] }) {
  const [state, action, pending] = useActionState(sendContactMessage, undefined);
  if (state?.ok) return <p className="rounded-xl bg-teal-50 px-4 py-6 text-center text-teal-900">✓ {state.ok}</p>;
  return (
    <form action={action} className="space-y-3" aria-busy={pending}>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <fieldset disabled={pending} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="c-name" className={label}>{labels.name}</label>
            <input id="c-name" name="name" required maxLength={120} autoComplete="name" className={input} />
          </div>
          <div>
            <label htmlFor="c-email" className={label}>{labels.email}</label>
            <input id="c-email" name="email" type="email" required autoComplete="email" className={input} />
          </div>
        </div>
        <div>
          <label htmlFor="c-company" className={label}>{labels.company}</label>
          <input id="c-company" name="company" maxLength={200} autoComplete="organization" className={input} />
        </div>
        <div>
          <label htmlFor="c-message" className={label}>{labels.message}</label>
          <textarea id="c-message" name="message" required rows={6} maxLength={5000} className={input} />
        </div>
      </fieldset>
      {state?.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <button disabled={pending} className={`${btnPrimary} w-full`}>{pending ? labels.sending : labels.send}</button>
      <p className="text-xs text-slate-500">{labels.privacy}</p>
    </form>
  );
}
