import { Suspense } from "react";
import { Loading } from "@/components/loading";
import { ProfileSettings } from "@/components/profile-settings";
import { pageTitle } from "@/components/ui";
import { requireAdmin } from "@/lib/session";

export default function AdminProfilePage() {
  return (
    <div className="space-y-6">
      <h1 className={pageTitle}>Mi perfil</h1>
      <Suspense fallback={<Loading />}>
        <AdminProfile />
      </Suspense>
    </div>
  );
}

async function AdminProfile() {
  return <ProfileSettings user={await requireAdmin()} />;
}
