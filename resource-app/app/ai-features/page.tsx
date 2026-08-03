import type { ReactNode } from "react";

import { RosterSearch } from "@/components/ai/RosterSearch";
import { GrowthClient } from "@/components/growth/GrowthClient";
import { InsightsClient } from "@/components/insights/InsightsClient";
import { weeksUntil } from "@/lib/availability";
import { getConsultants } from "@/lib/data";

export const dynamic = "force-dynamic";

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-display text-sm font-bold uppercase tracking-[0.18em] text-ey-black">
      {children}
    </h2>
  );
}

export default function AiFeaturesPage() {
  const consultants = getConsultants();

  const people = consultants.map((c) => ({
    id: c.id,
    name: c.name,
    rank: c.rankAndGrade,
    skillset: c.skillsetCategory,
  }));

  const rollingOff = consultants
    .map((c) => ({ c, w: weeksUntil(c.endDate) }))
    .filter(({ c, w }) => w != null && w >= 0 && w <= 16 && c.currentAllocation > 0)
    .sort((a, b) => (a.w ?? 0) - (b.w ?? 0))
    .map(({ c, w }) => ({
      id: c.id,
      name: c.name,
      rank: c.rankAndGrade,
      skillset: c.skillsetCategory,
      endDate: c.endDate,
      weeksLeft: w ?? 0,
      freeNowPct: Math.round(c.availableNow * 100),
      currentEngagement: c.currentEngagement,
    }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ey-black">
          AI features
        </h1>
        <p className="mt-1 text-sm text-ey-gray">
          Every AI capability in one place - plain-English roster search, growth &amp;
          upskilling, and forward-looking insights. All powered by DeepSeek via OpenRouter.
        </p>
      </div>

      <section className="space-y-3">
        <SectionTitle>Natural-language roster search</SectionTitle>
        <RosterSearch />
      </section>

      <section className="space-y-3">
        <SectionTitle>Growth &amp; upskilling</SectionTitle>
        <GrowthClient people={people} embedded />
      </section>

      <section className="space-y-3">
        <SectionTitle>Insights &amp; foresight</SectionTitle>
        <InsightsClient rollingOff={rollingOff} embedded />
      </section>
    </div>
  );
}
