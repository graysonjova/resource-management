import { PeopleInformaticsClient } from "@/components/informatics/PeopleInformaticsClient";
import { getConsultants } from "@/lib/data";

export const dynamic = "force-dynamic";

export default function PeopleInformaticsPage() {
  const people = getConsultants().map((c) => ({
    id: c.id,
    name: c.name,
    rank: c.rankAndGrade,
    skills: c.skills,
    tools: c.skillsetTools,
    secondarySkill: c.secondarySkill,
    previousRoles: c.previousRoles,
    aspiringRoles: c.aspiringRoles,
    currentEngagement: c.currentEngagement,
    resumeSlideNumber: c.resumeSlideNumber,
    cvSections: c.cvSections,
  }));

  return <PeopleInformaticsClient people={people} />;
}
