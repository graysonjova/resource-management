/**
 * Deterministic placeholder informatics for the People Informatics demo page.
 * Scores are seeded from consultant id so they stay stable across reloads —
 * they are NOT real evaluation data.
 */

export const FUNCTIONAL_AXES = [
  "Clarity",
  "Depth",
  "Factual Accuracy",
  "Completeness",
  "Consistency",
] as const;

export const TECHNICAL_AXES = [
  "Complexity",
  "Originality",
  "Documentation",
  "Maintainability",
  "Best Practices",
] as const;

const SECONDARY_BY_SKILLSET: Record<string, string[]> = {
  "Data Engineering": [
    "Spark / PySpark",
    "dbt",
    "Kafka streaming",
    "Lakehouse design",
    "Airflow",
    "Cloud data platforms",
  ],
  "AI / GenAI": [
    "RAG pipelines",
    "Prompt engineering",
    "LangChain / LlamaIndex",
    "LLM evaluation",
    "Vector databases",
    "Fine-tuning basics",
  ],
  MLOps: [
    "MLflow",
    "Kubernetes for ML",
    "Model monitoring",
    "Feature stores",
    "CI/CD for models",
    "Docker packaging",
  ],
  "Data Governance": [
    "Data lineage",
    "PDPA / privacy",
    "Metadata management",
    "Data quality frameworks",
    "Stewardship models",
    "Policy drafting",
  ],
};

const ENGAGEMENT_TEMPLATES = [
  {
    name: "Retail GenAI Assistant",
    role: "Delivery lead",
    outcome: "Shipped RAG chatbot to UAT",
  },
  {
    name: "Bank Risk Data Platform",
    role: "Contributor",
    outcome: "Built staging pipelines + DQ checks",
  },
  {
    name: "Telco Churn Model Ops",
    role: "Contributor",
    outcome: "Productionised scoring service",
  },
  {
    name: "Healthcare Data Lake",
    role: "Support",
    outcome: "Metadata catalogue + lineage map",
  },
  {
    name: "Public Sector PDPA Review",
    role: "Contributor",
    outcome: "Gap assessment + remediation plan",
  },
  {
    name: "Insurer Document Intelligence",
    role: "Delivery lead",
    outcome: "OCR + extraction MVP",
  },
];

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function score(seed: string, axis: string, base = 55): number {
  const n = hash(`${seed}::${axis}`);
  // Spread roughly 40-95 around a base, stable per seed+axis.
  return Math.min(95, Math.max(40, base + (n % 41) - 8));
}

export interface InformaticsProfile {
  functional: { name: string; value: number }[];
  technical: { name: string; value: number }[];
  medianFunctional: { name: string; value: number }[];
  medianTechnical: { name: string; value: number }[];
  secondarySkills: string[];
  engagementHistory: {
    engagement: string;
    role: string;
    period: string;
    outcome: string;
  }[];
  overallScore: number;
}

export function buildPlaceholderInformatics(
  id: string,
  skillset: string,
  previousRoles: string,
): InformaticsProfile {
  const functional = FUNCTIONAL_AXES.map((name) => ({
    name,
    value: score(id, `f:${name}`, 62),
  }));
  const technical = TECHNICAL_AXES.map((name) => ({
    name,
    value: score(id, `t:${name}`, 58),
  }));

  // Shared "team median" placeholders — same for everyone so the compare line
  // is meaningful in the UI demo.
  const medianFunctional = FUNCTIONAL_AXES.map((name) => ({
    name,
    value: score("team-median", `f:${name}`, 60),
  }));
  const medianTechnical = TECHNICAL_AXES.map((name) => ({
    name,
    value: score("team-median", `t:${name}`, 57),
  }));

  const pool =
    SECONDARY_BY_SKILLSET[skillset] ??
    SECONDARY_BY_SKILLSET["Data Engineering"];
  const start = hash(id) % Math.max(1, pool.length - 3);
  const secondarySkills = pool.slice(start, start + 4);
  // Fold in a token from their real secondary / previous roles when present.
  if (previousRoles) {
    const first = previousRoles.split(/[,;/]/)[0]?.trim();
    if (first && first.length < 40 && !secondarySkills.includes(first)) {
      secondarySkills[secondarySkills.length - 1] = first;
    }
  }

  const count = 3 + (hash(id) % 2);
  const engagementHistory = Array.from({ length: count }, (_, i) => {
    const t = ENGAGEMENT_TEMPLATES[(hash(id) + i * 3) % ENGAGEMENT_TEMPLATES.length];
    const year = 2024 + ((hash(id) + i) % 3);
    const qStart = 1 + ((hash(`${id}-${i}`) % 3));
    return {
      engagement: t.name,
      role: t.role,
      period: `Q${qStart} ${year} – Q${Math.min(4, qStart + 1)} ${year}`,
      outcome: t.outcome,
    };
  });

  const all = [...functional, ...technical].map((d) => d.value);
  const overallScore = Math.round(all.reduce((s, v) => s + v, 0) / all.length);

  return {
    functional,
    technical,
    medianFunctional,
    medianTechnical,
    secondarySkills,
    engagementHistory,
    overallScore,
  };
}
