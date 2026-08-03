import { ResourcesClient } from "@/components/resources/ResourcesClient";
import { getConsultants } from "@/lib/data";
import { filtersFromParams } from "@/lib/filters";

export const dynamic = "force-dynamic";

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const consultants = getConsultants();
  const sp = await searchParams;

  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") usp.set(k, v);
    else if (Array.isArray(v) && v[0]) usp.set(k, v[0]);
  }
  const initialFilters = filtersFromParams(usp);

  return (
    <ResourcesClient consultants={consultants} initialFilters={initialFilters} />
  );
}
