"use client";

import { useActionState, type ReactNode } from "react";
import type { FormState } from "@/lib/actions";

type Props = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  children: ReactNode;
  className?: string;
  /** Mostrar el mensaje de éxito devuelto por la acción. */
  showOk?: boolean;
};

/** Formulario que llama a una server action y muestra su error o confirmación. */
export function ActionForm({ action, children, className, showOk = true }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className} aria-busy={pending}>
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {state?.error && (
        <p role="alert" className="basis-full text-sm text-red-700">
          {state.error}
        </p>
      )}
      {showOk && state?.ok && (
        <p role="status" className="basis-full text-sm text-teal-700">
          {state.ok}
        </p>
      )}
    </form>
  );
}
