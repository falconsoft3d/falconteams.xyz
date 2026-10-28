"use client";

import { btnPrimary } from "./ui";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={btnPrimary}>
      Imprimir / Guardar PDF
    </button>
  );
}
