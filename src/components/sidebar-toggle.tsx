"use client";

/** Contrae o expande el menú lateral; la preferencia se guarda en el navegador. */
export function SidebarToggle({ label }: { label: string }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={() => {
        const root = document.documentElement;
        const collapsed = root.dataset.sidebar !== "collapsed";
        if (collapsed) root.dataset.sidebar = "collapsed";
        else delete root.dataset.sidebar;
        try {
          localStorage.setItem("ft-sidebar", collapsed ? "collapsed" : "expanded");
        } catch {}
      }}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900 collapsed:justify-center collapsed:px-0"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="size-[18px] shrink-0 transition-transform collapsed:rotate-180" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 3v18M16 15l-3-3 3-3" />
      </svg>
      <span className="truncate collapsed:sr-only">{label}</span>
    </button>
  );
}
