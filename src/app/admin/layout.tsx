import { Suspense } from "react";
import { AppFrame, UserBar, type FrameLink } from "@/components/app-header";
import { Loading } from "@/components/loading";
import { requireAdmin } from "@/lib/session";

const LINKS: FrameLink[] = [
  { href: "/admin", label: "nav.dashboard" },
  { href: "/admin/companies", label: "nav.companies" },
  { href: "/admin/employees", label: "nav.employees" },
  { href: "/admin/invoices", label: "nav.invoices" },
  { href: "/admin/recruitment", label: "nav.recruitment" },
  { href: "/admin/map", label: "nav.map" },
  { href: "/admin/mail", label: "nav.mail" },
  { href: "/admin/messages", label: "nav.messages" },
  { href: "/admin/me", label: "nav.myHours" },
];

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  // El marco depende del usuario y del idioma de la petición: se resuelve en streaming.
  return (
    <Suspense fallback={<Loading />}>
      <AdminFrame>{children}</AdminFrame>
    </Suspense>
  );
}

async function AdminFrame({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <AppFrame title="FalconTeams · Admin" links={LINKS} topbar={<UserBar user={admin} />}>
      {children}
    </AppFrame>
  );
}
