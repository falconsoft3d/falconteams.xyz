"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { clockIn, clockOut } from "@/lib/actions";
import { AllocationRows } from "./allocation-rows";
import { input } from "./ui";
import type { ProjectOption } from "@/lib/data";
import { DICTIONARIES } from "@/lib/i18n";

type Labels = (typeof DICTIONARIES)["es"]["clock"];
type AllocLabels = (typeof DICTIONARIES)["es"]["alloc"];


/**
 * Formulario de entrada/salida. Si "geo" está activo, pide la ubicación al
 * navegador y la envía junto al fichaje (lat, lng, accuracy).
 */
export function ClockForm({ open, geo, slug, projects = [], labels = DICTIONARIES.es.clock, allocLabels = DICTIONARIES.es.alloc }: {
  /** Hay un fichaje abierto: el formulario registra la salida. */
  open: boolean;
  geo: boolean;
  slug?: string;
  /** Proyectos para repartir las horas al registrar la salida. */
  projects?: ProjectOption[];
  labels?: Labels;
  allocLabels?: AllocLabels;
}) {
  const geoErrors: Record<number, string> = { 1: labels.geoDenied, 2: labels.geoUnavailable, 3: labels.geoTimeout };
  const [state, formAction, pending] = useActionState(open ? clockOut : clockIn, undefined);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setGeoError(null);
    if (!geo) {
      startTransition(() => formAction(formData));
      return;
    }
    if (!navigator.geolocation) {
      setGeoError(labels.geoUnsupported);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        formData.set("lat", String(pos.coords.latitude));
        formData.set("lng", String(pos.coords.longitude));
        formData.set("accuracy", String(pos.coords.accuracy));
        startTransition(() => formAction(formData));
      },
      (err) => {
        setLocating(false);
        setGeoError(geoErrors[err.code] ?? geoErrors[2]);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  const busy = pending || locating;
  const error = geoError ?? state?.error;
  return (
    // action sirve sin JavaScript; con JavaScript, onSubmit toma el control para pedir la ubicación.
    <form action={formAction} onSubmit={onSubmit} className="flex flex-col items-stretch gap-2 sm:w-80 sm:items-end" aria-busy={busy}>
      <fieldset disabled={busy} className="contents">
        {slug && <input type="hidden" name="company" value={slug} />}
        {open && (
          <textarea
            name="notes"
            rows={3}
            maxLength={2000}
            placeholder={labels.notes}
            aria-label={labels.notes}
            className={`${input} resize-y`}
          />
        )}
        {open && projects.length > 0 && <AllocationRows projects={projects} labels={allocLabels} />}
        <button
          className={`rounded-2xl px-8 py-5 text-lg font-bold text-white shadow-sm transition disabled:opacity-60 ${
            open ? "bg-rose-600 hover:bg-rose-700" : "bg-teal-700 hover:bg-teal-800"
          }`}
        >
          {locating ? labels.locating : open ? labels.clockOut : labels.clockIn}
        </button>
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {!error && state?.ok && <p role="status" className="text-sm text-teal-700">{state.ok}</p>}
      {geo && !error && <p className="text-xs text-slate-500">{labels.geoNotice}</p>}
    </form>
  );
}
