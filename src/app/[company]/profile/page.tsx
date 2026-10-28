import { Suspense } from "react";
import { EmployeeShell } from "@/components/employee-shell";
import { Loading } from "@/components/loading";
import { ProfileSettings } from "@/components/profile-settings";
import { pageTitle } from "@/components/ui";
import { requireCompanyEmployee } from "@/lib/session";

export default function ProfilePage(props: PageProps<"/[company]/profile">) {
  return (
    <Suspense fallback={<Loading />}>
      <Profile {...props} />
    </Suspense>
  );
}

async function Profile({ params }: PageProps<"/[company]/profile">) {
  const { company: slug } = await params;
  const { user, company } = await requireCompanyEmployee(slug);
  return (
    <EmployeeShell user={user} company={company}>
      <h1 className={pageTitle}>Mi perfil</h1>
      <ProfileSettings user={user} />
    </EmployeeShell>
  );
}
