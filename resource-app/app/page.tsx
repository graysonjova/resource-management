import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { getConsultants } from "@/lib/data";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const consultants = getConsultants();
  return <DashboardClient consultants={consultants} />;
}
