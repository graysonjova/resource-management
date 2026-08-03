export function pct(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function initials(name: string): string {
  // Handles "Last, First XY" -> "FL" where possible.
  const parts = name.replace(/,/g, "").trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[1][0] + parts[0][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const SKILLSET_COLORS: Record<string, string> = {
  "Data Engineering": "#2E2E38",
  "AI / GenAI": "#FFE600",
  MLOps: "#747480",
  "Data Governance": "#C4C4CD",
};

/** EY yellow leads, then the brand black/grey ladder. */
export const CHART_SERIES = [
  "#FFE600",
  "#2E2E38",
  "#747480",
  "#C4C4CD",
  "#1A1A24",
  "#E1CB00",
  "#9B9BA5",
];

export function skillsetColor(cat: string): string {
  return SKILLSET_COLORS[cat] ?? "#2E2E38";
}
