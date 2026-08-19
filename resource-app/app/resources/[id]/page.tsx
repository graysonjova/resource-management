import { notFound } from "next/navigation";

import { ProfileClient } from "@/components/resources/ProfileClient";
import { getConsultantById } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const consultant = getConsultantById(id);
  if (!consultant) notFound();

  return <ProfileClient consultant={consultant} />;
}
