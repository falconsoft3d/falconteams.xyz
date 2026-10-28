import type { ReactNode } from "react";
import { AppFrame, UserBar, type FrameLink } from "./app-header";
import type { Company } from "@/lib/data";
import type { CurrentUser } from "@/lib/session";

/** Menú dentro de una empresa: el del empleado, o el del admin que la visita. */
export function companyLinks(slug: string, isAdmin: boolean, invoiced = true): FrameLink[] {
  const shared: FrameLink[] = [
    { href: `/${slug}/chat`, label: "nav.chat" },
    { href: `/${slug}/projects`, label: "nav.projects" },
    { href: `/${slug}/links`, label: "nav.links" },
    { href: `/${slug}/docs`, label: "nav.docs" },
  ];
  if (isAdmin) {
    return [
      { href: `/${slug}`, label: "nav.dashboard" },
      { href: `/${slug}/inbox`, label: "nav.mail" },
      ...shared,
      { href: `/${slug}/recruitment`, label: "nav.recruitment" },
      { href: "/admin", label: "nav.administration" },
    ];
  }
  return [
    { href: `/${slug}`, label: "nav.dashboard" },
    { href: `/${slug}/goals`, label: "nav.goals" },
    { href: `/${slug}/inbox`, label: "nav.mail" },
    ...shared,
    { href: `/${slug}/equipment`, label: "nav.equipment" },
    ...(invoiced ? [{ href: `/${slug}/billing`, label: "nav.billing" } as FrameLink] : []),
    { href: `/${slug}/profile`, label: "nav.profile" },
  ];
}

/** Marco de las páginas dentro de una empresa: menú lateral según el rol. */
export function EmployeeShell({ user, company, children }: { user: CurrentUser; company: Company; children: ReactNode }) {
  return (
    <AppFrame
      title={company.name}
      links={companyLinks(company.slug, user.role === "admin", user.invoiced)}
      topbar={<UserBar user={user} companySlug={company.slug} />}
      chatCompany={company.slug}
    >
      {children}
    </AppFrame>
  );
}
