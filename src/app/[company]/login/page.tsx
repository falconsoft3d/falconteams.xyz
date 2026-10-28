import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Loading } from "@/components/loading";
import { LoginForm } from "@/components/login-form";
import { LoginShell } from "@/components/login-shell";
import { getCompanyBySlug } from "@/lib/data";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale, getT } from "@/lib/locale";

export default function CompanyLoginPage({ params }: PageProps<"/[company]/login">) {
  return (
    <Suspense fallback={<Loading />}>
      <CompanyLogin params={params} />
    </Suspense>
  );
}

async function CompanyLogin({ params }: Pick<PageProps<"/[company]/login">, "params">) {
  const { company: slug } = await params;
  const [company, locale, t] = await Promise.all([getCompanyBySlug(slug), getLocale(), getT()]);
  if (!company) notFound();
  return (
    <LoginShell title={company.name} subtitle={t("login.companySubtitle")}>
      {company.active ? (
        <LoginForm companySlug={company.slug} labels={DICTIONARIES[locale].login} />
      ) : (
        <p className="text-center text-sm text-slate-600">{t("login.companyDisabled")}</p>
      )}
    </LoginShell>
  );
}
