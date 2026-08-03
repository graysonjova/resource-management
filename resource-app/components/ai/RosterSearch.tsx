"use client";

import { Wand2, Search, ArrowRight, Filter } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Chip, Panel, PanelTitle } from "@/components/ui/kit";

export function RosterSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, unknown> | null>(null);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);

  async function runSearch() {
    setSearchBusy(true);
    setSearchErr(null);
    setFilters(null);
    try {
      const res = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Request failed.");
      setFilters(data.filters ?? {});
    } catch (e) {
      setSearchErr((e as Error).message);
    } finally {
      setSearchBusy(false);
    }
  }

  function applyFilters() {
    if (!filters) return;
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v !== null && v !== undefined && String(v) !== "") sp.set(k, String(v));
    }
    router.push(`/resources?${sp.toString()}`);
  }

  return (
    <Panel hover>
      <PanelTitle>
        <span className="inline-flex items-center gap-1.5">
          <Filter size={13} /> Roster Filter (natural language)
        </span>
      </PanelTitle>
      <p className="-mt-1 mb-3 text-xs text-ey-gray">
        Turns a description into roster filters and opens the Resources list.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ey-gray"
          />
          <input
            className="input pl-9"
            placeholder='e.g. "Singaporean AI consultants available now"'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && query && runSearch()}
          />
        </div>
        <button className="btn-primary" onClick={runSearch} disabled={searchBusy || !query}>
          <Wand2 size={16} />
          {searchBusy ? "Interpreting..." : "Interpret"}
        </button>
      </div>

      {searchErr && <p className="mt-3 text-sm text-state-danger">{searchErr}</p>}

      {filters && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-ey-gray">
              Resolved filters:
            </span>
            {Object.keys(filters).length === 0 ? (
              <span className="text-sm text-ey-gray">(none - showing everyone)</span>
            ) : (
              Object.entries(filters).map(([k, v]) => (
                <Chip key={k} color="ink">
                  {k}: {String(v)}
                </Chip>
              ))
            )}
          </div>
          <button className="btn-secondary" onClick={applyFilters}>
            Apply in roster <ArrowRight size={15} />
          </button>
        </div>
      )}
    </Panel>
  );
}
