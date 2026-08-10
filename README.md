# EY Resource Management Demo

A resource-planning and AI staffing tool for a consulting bench, built as a demo
on EY's brand palette. Roster data is read live from an Excel workbook, and the
AI features run against DeepSeek via OpenRouter.

> All names, engagements and client references in the data are fictional dummy
> data generated for this demo.

## What's in it

| Page | What it does |
| --- | --- |
| Dashboard | Bench and availability overview. Every chart segment is clickable and drills through to a filtered roster. |
| Resources | Filterable roster (rank, skillset, nationality, gender, availability, free capacity, free-text search) plus per-consultant profiles with weekly allocation forecast and AI CV tagging. |
| People Informatics | Functional and technical skill radars against a team median, secondary skills, engagement history and short CV. Skill scores are placeholder demo data; CVs and roster fields come from the workbook. |
| AI Recommender | Describe an engagement, get a team designed and matched to real people on the bench, with fit scores, per-pick reasoning and a client-facing proposal. |
| AI Features | The remaining AI tools: natural-language roster search, certification recommendations, promotion readiness, firm-wide skill gaps, chat with your roster, and roll-off redeployment planning. |
| Bookings | Advance reservations placed against consultants, with conflict detection. |

## Stack

- Next.js 15 (App Router) with React 18 and TypeScript
- Tailwind CSS for styling, Recharts for charts, Lucide for icons
- `xlsx` (SheetJS) to read the roster workbook server-side
- OpenRouter (DeepSeek) for all AI endpoints

There is no database. Roster data comes from the Excel workbook and is cached in
memory until the file's modified time changes; bookings persist to
`resource-app/data/bookings.json`.

## Prerequisites

Node.js 20 LTS or newer (Next 15 requires at least 18.18). Nothing else —
Python is only needed if you want to regenerate the dummy workbook with
`generate_dummy_data.py`.

```bash
node -v
```

## Setup

1. **Keep the folder layout intact.** The app resolves the workbook as
   `../Dummy Data Generated.xlsx`, relative to `resource-app`:

   ```
   Grayson Dummy/
   ├─ Dummy Data Generated.xlsx     <- roster data, must stay here
   └─ resource-app/                 <- the Next.js app
   ```

2. **Create `resource-app/.env.local`.** It is gitignored, so it does not come
   with a clone and must be recreated:

   ```
   OPENROUTER_API_KEY=sk-or-...
   OPENROUTER_MODEL=deepseek/deepseek-v4-flash-0731
   DATA_XLSX_PATH=../Dummy Data Generated.xlsx
   ```

   Get a key at <https://openrouter.ai/keys>. Without it the app still runs, but
   every AI panel will error.

3. **Install and start:**

   ```bash
   cd resource-app
   npm install
   npm run dev
   ```

   Then open <http://localhost:3000>.

Do not copy a `node_modules` folder between machines — it contains compiled
platform-specific binaries. Delete it and run `npm install` instead.

## How dates work

The workbook's weekly allocation columns start at week commencing 7 Jul 2026, so
the app anchors all "now", availability and roll-off maths to a fixed reference
date of **6 Jul 2026** (`REFERENCE_DATE` in `lib/data.ts`) rather than the real
current date. This keeps availability consistent with the data instead of
drifting as real time passes. Change that constant if you re-generate the
workbook against different dates.

## AI endpoints

All AI calls are server-side only, so the API key is never exposed to the
browser.

| Route | Purpose |
| --- | --- |
| `POST /api/ai/recommend` | Match people from the bench to an engagement brief |
| `POST /api/ai/compose` | Design the ideal team shape (roles and ranks) before matching |
| `POST /api/ai/proposal` | Write a client-facing staffing narrative with anonymised names |
| `POST /api/ai/search` | Turn plain English into roster filters |
| `POST /api/ai/ask` | Answer questions about capacity, skills and availability |
| `POST /api/ai/certifications` | Certification recommendations per person or firm-wide |
| `POST /api/ai/career` | Promotion readiness against the next rank |
| `POST /api/ai/redeploy` | Redeployment suggestions for people rolling off |
| `POST /api/ai/autotag` | Extract structured skills, tools and industries from a CV |
| `GET`/`POST`/`DELETE` `/api/bookings` | Read, create and cancel advance bookings |

Requested rank composition is enforced server-side in the recommender: if a
brief asks for 2 seniors and 3 associates, the code fills those slots only from
the matching rank family and reports a shortfall rather than silently
substituting a manager or an intern.

## Theme

The UI follows the EY primary palette from the EY Brand Identity Guidelines:
EY Yellow `#FFE600`, Confident Black `#1A1A24`, Off Black `#2E2E38`,
Gray 01 `#747480`, Gray 02 `#C4C4CD` and Off White `#F6F6FA`, defined as the
`ey.*` tokens in `tailwind.config.ts`. Because that palette has no accent
colours, a small separate `state.*` group carries status meaning only (bench
alerts, risk levels, errors). EY's corporate typeface is EY Interstate, which is
licensed; Inter is used as the closest substitute available through `next/font`.

## Troubleshooting

**`npm install` fails with `SELF_SIGNED_CERT_IN_CHAIN` or
`UNABLE_TO_GET_ISSUER_CERT_LOCALLY`.** A corporate TLS-inspection proxy is
re-signing traffic and Node doesn't trust its root CA. Point Node and npm at the
certificate rather than disabling verification:

```powershell
npm config set cafile "C:\path\to\corp-root-ca.pem"
$env:NODE_EXTRA_CA_CERTS="C:\path\to\corp-root-ca.pem"
```

**AI panels error but the rest of the app works.** Check that `openrouter.ai` is
reachable — corporate networks often block third-party AI endpoints:

```powershell
curl.exe -s -o NUL -w "%{http_code}`n" https://openrouter.ai/api/v1/models
```

Anything other than `200` means the AI features won't work on that network.
Everything else (dashboard, roster, profiles, People Informatics, bookings)
reads only from the local workbook and works fully offline.

**"Could not find the data workbook at ..."** The workbook isn't where
`DATA_XLSX_PATH` points. Check the folder layout above, or set an absolute path
in `.env.local`.

**Hydration warning in the dev overlay on pages showing dates.** Node and Chrome
disagree on a few `en-GB` month abbreviations ("Sept" vs "Sep") via
`toLocaleDateString` in `lib/format.ts`. Dev-only and harmless.
