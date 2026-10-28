import { Suspense } from "react";
import { Loading } from "@/components/loading";
import { LoginForm } from "@/components/login-form";
import { LoginShell } from "@/components/login-shell";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale, getT } from "@/lib/locale";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Suspense fallback={<Loading />}>
      <Login searchParams={searchParams} />
    </Suspense>
  );
}

async function Login({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const [{ error }, locale, t] = await Promise.all([searchParams, getLocale(), getT()]);
  return (
    <LoginShell title="FalconTeams" subtitle={t("login.appSubtitle")}>
      {error === "sin-empresa" && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{t("login.noCompany")}</p>
      )}
      <LoginForm labels={DICTIONARIES[locale].login} />
    </LoginShell>
  );
}
