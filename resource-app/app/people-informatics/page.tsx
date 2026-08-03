import { PeopleInformaticsClient } from "@/components/informatics/PeopleInformaticsClient";
import { getConsultants } from "@/lib/data";

export const dynamic = "force-dynamic";

export default function PeopleInformaticsPage() {
  const people = getConsultants().map((c) => ({
    id: c.id,
    name: c.name,
    rank: c.rankAndGrade,
    skillset: c.skillsetCategory,
    tools: c.skillsetTools,
    secondarySkill: c.secondarySkill,
    previousRoles: c.previousRoles,
    shortCv: c.experienceCV.replace(/\s+/g, " ").trim().slice(0, 700),
    currentEngagement: c.currentEngagement,
  }));

  return <PeopleInformaticsClient people={people} />;
}
