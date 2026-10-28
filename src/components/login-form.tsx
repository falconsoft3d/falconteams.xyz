"use client";

import { useActionState } from "react";
import { login } from "@/lib/actions";
import type { DICTIONARIES } from "@/lib/i18n";
import { btnPrimary, input, label } from "./ui";

export function LoginForm({ companySlug, labels }: { companySlug?: string; labels: (typeof DICTIONARIES)["es"]["login"] }) {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4">
      {companySlug && <input type="hidden" name="company" value={companySlug} />}
      <div>
        <label htmlFor="email" className={label}>{labels.email}</label>
        <input id="email" name="email" type="email" autoComplete="email" required className={input} />
      </div>
      <div>
        <label htmlFor="password" className={label}>{labels.password}</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={input} />
      </div>
      {state?.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
        {pending ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
