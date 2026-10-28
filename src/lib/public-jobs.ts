import "server-only";
import { listCompanies, type Company } from "./data";
import { listOpenOffers, type JobOffer } from "./recruitment";

/** Ofertas abiertas de empresas activas, agrupadas por empresa. */
export async function openOffersByCompany() {
  const [offers, companies] = await Promise.all([listOpenOffers(), listCompanies()]);
  const groups: { company: Company; offers: JobOffer[] }[] = [];
  for (const company of companies.filter((c) => c.active)) {
    const mine = offers.filter((o) => o.company_id === company.id);
    if (mine.length) groups.push({ company, offers: mine });
  }
  return groups;
}
