// Iconos de línea (estilo Lucide) para la documentación: carpetas con su color
// y ficheros según su tipo.

const svg = (children: React.ReactNode, className: string, style?: React.CSSProperties) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`} style={style} aria-hidden>
    {children}
  </svg>
);

export function FolderIcon({ color, className = "size-5" }: { color?: string | null; className?: string }) {
  const c = color || "#0f766e";
  return svg(
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" fill={`${c}22`} />,
    className,
    { color: c },
  );
}

export function FileIcon({ type, className = "size-5 text-slate-500" }: { type: string | null; className?: string }) {
  const t = type ?? "";
  if (t.startsWith("image/")) {
    return svg(<><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21" /></>, className);
  }
  if (t.includes("sheet") || t.includes("excel") || t.includes("csv")) {
    return svg(<><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4M8 13h8M8 17h8M12 13v4" /></>, className);
  }
  if (t.includes("presentation") || t.includes("powerpoint")) {
    return svg(<><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M12 17v4M8 21h8" /></>, className);
  }
  if (t.includes("zip") || t.includes("compressed")) {
    return svg(<><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M10 6h1M10 10h1M10 14h1M13 8h1M13 12h1" /></>, className);
  }
  return svg(<><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8" /></>, className);
}
