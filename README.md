# EY Resource Management Demo

A resource-planning and AI staffing tool for a consulting bench, built as a demo
on EY's brand palette. Roster data is read live from an Excel workbook, and the
AI features run against a deployed model in Microsoft Foundry.

> All names, engagements and client references in the data are fictional dummy
> data generated for this demo.

## What's in it

| Page | What it does |
| --- | --- |
| Dashboard | Bench and availability overview. Every chart segment is clickable and drills through to a filtered roster. |
| Resources | Filterable roster (rank, skillset, nationality, gender, availability, free capacity, free-text search) plus per-consultant profiles with weekly allocation forecast and AI CV tagging. |
| People Informatics | Skills, engagement, and short CV from the roster workbook and resume deck. |
| AI Recommender | Describe an engagement, get a team designed and matched to real people on the bench, with fit scores, per-pick reasoning and a client-facing proposal. |

## Stack

- Next.js 15 (App Router) with React 18 and TypeScript
- Tailwind CSS for styling, Recharts for charts, Lucide for icons
- `xlsx` (SheetJS) to read the roster workbook server-side
- Microsoft Foundry / Azure OpenAI-compatible API for all AI endpoints

There is no database. Roster data comes from the Excel workbook and is cached in
memory until the file's modified time changes.

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
   AZURE_OPENAI_ENDPOINT=https://your-resource.services.ai.azure.com
   AZURE_OPENAI_API_KEY=...
   AZURE_OPENAI_DEPLOYMENT=gpt-4o
   AUTH_SESSION_SECRET=replace-with-a-long-random-value
   DATA_XLSX_PATH=../Dummy Data Generated.xlsx
   DATA_PPTX_PATH=../Dummy Data Generated Resumes.pptx
   ```

   Copy the endpoint, key and deployment name from the model deployment in
   Microsoft Foundry. Without them the app still runs, but every AI panel will
   error.

3. **Install and start:**

   ```bash
   cd resource-app
   npm install
   npm run dev
   ```

   Then open <http://localhost:3000>.

## Login whitelist

Demo login accounts are stored in `resource-app/whitelist.json`. Edit that file
to add or remove users. The passwords are intentionally plain text for this
demo and must not be used as a production authentication design.

This login replaces Azure App Service Authentication. Configure App Service
Authentication to allow unauthenticated access (or disable it), because the
application middleware now performs the access check.

## Local production test

```bash
cd resource-app
npm install
npm run build
npm run start
```

Then open <http://localhost:3000>. Docker and WSL are not required.

## Azure Container Registry build

Run this from the repository root. ACR builds the Linux container remotely, so
Docker Desktop and WSL are not required:

```bash
az acr build --registry YOUR_REGISTRY --image resource-app:stable1 \
  --file container_images/webapp_container_image/Dockerfile .
```

Do not copy a `node_modules` folder between machines — it contains compiled
platform-specific binaries. Delete it and run `npm install` instead.

## How dates work

The app uses the real current UTC date. Allocation, current engagement, forecast
weeks, end dates and roll-off calculations come from the
`Utilization by Engagement` sheet. Profile attributes and skills continue to
come from `Master`. A Master resource with no active utilization row is treated
as fully on bench.

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
| `POST /api/ai/redeploy` | Redeployment suggestions for people rolling off |
| `POST /api/ai/autotag` | Extract structured skills, tools and industries from a CV |

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

**AI panels error but the rest of the app works.** Verify the three
`AZURE_OPENAI_*` settings, confirm the Foundry deployment is active, and ensure
the Web App can reach its endpoint. Everything else (dashboard, roster,
profiles, People Informatics) reads only from the local workbook and works
without the model.

**"Could not find the data workbook at ..."** The workbook isn't where
`DATA_XLSX_PATH` points. Check the folder layout above, or set an absolute path
in `.env.local`.

**Hydration warning in the dev overlay on pages showing dates.** Node and Chrome
disagree on a few `en-GB` month abbreviations ("Sept" vs "Sep") via
`toLocaleDateString` in `lib/format.ts`. Dev-only and harmless.
