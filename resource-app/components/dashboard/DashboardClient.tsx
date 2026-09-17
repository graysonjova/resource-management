"use client";

import {
  Users,
  BatteryLow,
  Zap,
  Clock,
  Gauge,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { ChartBar, ChartDonut, type Datum } from "@/components/charts/ChartKit";
import { Panel, PanelTitle, StatCard } from "@/components/ui/kit";
import {
  isOnBench,
  isPartiallyOnBench,
  isSeniorManager,
  weeksUntil,
} from "@/lib/availability";
import { CHART_SERIES } from "@/lib/format";
import { topSkills } from "@/lib/skills";
import type { Consultant } from "@/lib/types";

function countBy(list: Consultant[], key: (c: Consultant) => string): Datum[] {
  const map = new Map<string, number>();
  for (const c of list) {
    const k = key(c) || "Unknown";
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].map(([name, value]) => ({ name, value }));
}

const SKILL_AXIS_MAX = 20;

function truncateAxisLabel(name: string, max = SKILL_AXIS_MAX): string {
  if (name.length <= max) return name;
  return `${name.slice(0, max).trimEnd()}…`;
}

const RANK_ORDER = ["Intern", "Associate", "Senior", "Manager"];

export function DashboardClient({ consultants }: { consultants: Consultant[] }) {
  const router = useRouter();
  const go = (params: Record<string, string>) => {
    const sp = new URLSearchParams(params);
    router.push(`/resources?${sp.toString()}`);
  };

  const stats = useMemo(() => {
    const total = consultants.length;
    const onBench = consultants.filter(isOnBench).length;
    const spare = consultants.filter(isPartiallyOnBench).length;
    const rollingOff = consultants.filter((c) => {
      const w = weeksUntil(c.endDate);
      return (
        !isSeniorManager(c) &&
        c.currentAllocation > 0 &&
        w != null &&
        w >= 0 &&
        w <= 6
      );
    }).length;
    const utilisationPopulation = consultants.filter(
      (c) => !isSeniorManager(c),
    );
    const avgUtil =
      utilisationPopulation.length === 0
        ? 0
        : Math.round(
            (utilisationPopulation.reduce(
              (sum, consultant) => sum + consultant.currentAllocation,
              0,
            ) /
              utilisationPopulation.length) *
              100,
          );
    return { total, onBench, spare, rollingOff, avgUtil };
  }, [consultants]);

  const byRank = useMemo(() => {
    const d = countBy(consultants, (c) => c.rank);
    return d.sort(
      (a, b) =>
        (RANK_ORDER.indexOf(a.name) + 99) % 100 -
        ((RANK_ORDER.indexOf(b.name) + 99) % 100),
    );
  }, [consultants]);

  const byGender = useMemo(
    () =>
      countBy(consultants, (c) => c.gender).map((d) => ({
        ...d,
        color: d.name === "Female" ? "#FFE600" : "#2E2E38",
      })),
    [consultants],
  );

  const byNationality = useMemo(
    () => countBy(consultants, (c) => c.nationality),
    [consultants],
  );

  const bySkillset = useMemo(() => {
    const top = topSkills(consultants, 10);
    return top.map((name, i) => ({
      name,
      label: truncateAxisLabel(name),
      value: consultants.filter((c) =>
        (c.skills ?? []).some((s) => s.toLowerCase() === name.toLowerCase()),
      ).length,
      color: CHART_SERIES[i % CHART_SERIES.length],
    }));
  }, [consultants]);

  const byStatus = useMemo(() => {
    const buckets = {
      "On bench": 0,
      "Partially on bench": 0,
      "Rolling off <=6w": 0,
      "Fully allocated": 0,
    };
    for (const c of consultants) {
      if (isOnBench(c)) buckets["On bench"]++;
      else if (isPartiallyOnBench(c)) buckets["Partially on bench"]++;
      else if (c.currentAllocation >= 1) buckets["Fully allocated"]++;

      const w = weeksUntil(c.endDate);
      if (
        !isSeniorManager(c) &&
        c.currentAllocation > 0 &&
        w != null &&
        w >= 0 &&
        w <= 6
      ) {
        buckets["Rolling off <=6w"]++;
      }
    }
    const colors: Record<string, string> = {
      "On bench": "#B8202E",
      "Partially on bench": "#FFE600",
      "Rolling off <=6w": "#B35C00",
      "Fully allocated": "#2E2E38",
    };
    return Object.entries(buckets).map(([name, value]) => ({
      name,
      value,
      color: colors[name],
    }));
  }, [consultants]);

  const byRolloff = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of consultants) {
      if (!c.endDate) continue;
      const key = c.endDate.slice(0, 7);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const sorted = [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
    return sorted.map(([month, value], i) => ({
      name: new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-GB", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      }),
      month,
      value,
      color: CHART_SERIES[i % CHART_SERIES.length],
    }));
  }, [consultants]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ey-black">
          Resource dashboard
        </h1>
        <p className="mt-1 text-sm text-ey-gray">
          Live bench &amp; availability overview. Click any chart segment to drill
          into the roster.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Total Resources"
          value={stats.total}
          accent="ink"
          icon={<Users size={18} />}
        />
        <StatCard
          label="On Bench Now"
          value={stats.onBench}
          accent="danger"
          icon={<BatteryLow size={18} />}
          sub="0% allocated"
        />
        <StatCard
          label="Partially on Bench"
          value={stats.spare}
          accent="success"
          icon={<Zap size={18} />}
          sub="partially allocated this week"
        />
        <StatCard
          label="Rolling Off <=6w"
          value={stats.rollingOff}
          accent="warning"
          icon={<Clock size={18} />}
        />
        <StatCard
          label="Utilisation Rate"
          value={`${stats.avgUtil}%`}
          accent="yellow"
          icon={<Gauge size={18} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel hover>
          <PanelTitle>Resources by Rank</PanelTitle>
          <ChartBar data={byRank} onSelect={(name) => go({ rank: name })} />
        </Panel>

        <Panel hover>
          <PanelTitle>Top skill buckets (Combined Bucket Skillset)</PanelTitle>
          <ChartBar
            data={bySkillset}
            vertical
            height={Math.max(240, bySkillset.length * 36 + 40)}
            onSelect={(name) => go({ skillset: name })}
          />
        </Panel>

        <Panel hover>
          <PanelTitle>By Gender</PanelTitle>
          <ChartDonut data={byGender} onSelect={(name) => go({ gender: name })} />
        </Panel>

        <Panel hover>
          <PanelTitle>By Employment Status</PanelTitle>
          <ChartDonut
            data={byNationality}
            onSelect={(name) => go({ nationality: name })}
          />
        </Panel>

        <Panel hover>
          <PanelTitle>Availability Status</PanelTitle>
          <ChartBar
            data={byStatus}
            vertical
            onSelect={(name) => {
              if (name === "On bench") go({ availability: "bench" });
              else if (name === "Partially on bench")
                go({ availability: "spare" });
              else if (name.startsWith("Rolling"))
                go({ availability: "within", withinWeeks: "6" });
              else if (name === "Fully allocated")
                go({ availability: "full" });
            }}
          />
        </Panel>

        <Panel hover>
          <PanelTitle>Engagement Roll-off (by end month)</PanelTitle>
          <ChartBar
            data={byRolloff}
            onSelect={(name) => {
              const month = byRolloff.find((item) => item.name === name)?.month;
              if (month) go({ rolloffMonth: month });
            }}
          />
        </Panel>
      </div>
    </div>
  );
}
