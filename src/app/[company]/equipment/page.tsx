import { Suspense } from "react";
import { EmployeeShell } from "@/components/employee-shell";
import { EquipmentList } from "@/components/equipment-list";
import { Loading } from "@/components/loading";
import { pageTitle } from "@/components/ui";
import { equipmentImageIds, listEquipment } from "@/lib/data";
import { requireCompanyEmployee } from "@/lib/session";

export default function EquipmentPage(props: PageProps<"/[company]/equipment">) {
  return (
    <Suspense fallback={<Loading />}>
      <MyEquipment {...props} />
    </Suspense>
  );
}

async function MyEquipment({ params }: PageProps<"/[company]/equipment">) {
  const { company: slug } = await params;
  const { user, company } = await requireCompanyEmployee(slug);
  const items = await listEquipment(user.userId);
  const images = await equipmentImageIds(items.map((i) => i.id));
  return (
    <EmployeeShell user={user} company={company}>
      <div>
        <h1 className={pageTitle}>Mi equipo</h1>
        <p className="mt-1 text-slate-500">Equipos y herramientas que te ha entregado {company.name}.</p>
      </div>
      <EquipmentList items={items} images={images} />
    </EmployeeShell>
  );
}
