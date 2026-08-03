"""
Generate a demo Resource Management dataset for a consulting firm.

Produces `Dummy Data Generated.xlsx` with 20 fictional consultants, one row per
person, following (and cleaning up) the schema of the original `Dummy Data.xlsx`.

Enforced value sets:
  - Gender:      Male / Female
  - Nationality: Citizen / PR / Long-term Pass
  - Skillset:    Data Engineering / AI / GenAI / MLOps / Data Governance
  - Rank:        Intern / Associate / Senior / Manager (with numeric grades)

Adds a new column: "Experience Summary (CV)".
"""

import random
from datetime import datetime, timedelta

import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

SEED = 42
random.seed(SEED)

OUTPUT_PATH = r"C:\Users\miawm\Downloads\Grayson Dummy\Dummy Data Generated.xlsx"

# Reference "current week" that the weekly forecast columns start from.
REF_MONDAY = datetime(2026, 7, 7)
WEEK_COLUMNS = [
    "WC 7 Jul 2026",
    "WC 14 Jul 2026",
    "WC 22 Jul 2026",
    "WC 29 Jul 2026",
    "WC 5 Aug 2026",
    "WC 12 Aug 2026",
    "WC 19 Aug 2026",
]

# Fixed quota pools guarantee a clean spread for the demo (20 people).
GENDER_POOL = ["Female"] * 11 + ["Male"] * 9
NATIONALITY_POOL = ["Citizen"] * 12 + ["PR"] * 5 + ["Long-term Pass"] * 3

# Rank -> valid grades and rough years-of-experience range.
RANKS = {
    "Intern": {"grades": [""], "years": (0, 1)},
    "Associate": {"grades": ["1", "2", "3"], "years": (1, 4)},
    "Senior": {"grades": ["1", "2"], "years": (4, 8)},
    "Manager": {"grades": ["1", "2"], "years": (8, 13)},
}
RANK_POOL = (
    ["Intern"] * 2 + ["Associate"] * 8 + ["Senior"] * 7 + ["Manager"] * 3
)

SKILLSETS = {
    "Data Engineering": {
        "primary": "Python, SQL, Spark, Airflow, dbt",
        "secondary": ["Data Modelling", "Lakehouse Architecture", "Streaming (Kafka)"],
        "roles": ["Data Engineer", "Analytics Engineer"],
        "aspiring": ["Lead Data Engineer", "Data Architect"],
        "projects": [
            "cloud data platform migration",
            "real-time streaming pipeline",
            "data warehouse modernisation",
            "lakehouse build-out",
        ],
    },
    "AI / GenAI": {
        "primary": "Python, PyTorch, LangChain, LLMs, RAG",
        "secondary": ["GenAI Engineering", "NLP", "Computer Vision"],
        "roles": ["AI Engineer", "Data Scientist"],
        "aspiring": ["GenAI Lead", "ML Research Engineer"],
        "projects": [
            "RAG chatbot",
            "demand forecasting model",
            "document intelligence solution",
            "customer churn model",
        ],
    },
    "MLOps": {
        "primary": "Python, Docker, Kubernetes, MLflow, Terraform, CI/CD",
        "secondary": ["Model Deployment", "Feature Store", "Observability"],
        "roles": ["MLOps Engineer", "ML Platform Engineer"],
        "aspiring": ["MLOps Lead", "Platform Architect"],
        "projects": [
            "ML model productionisation",
            "CI/CD platform for ML",
            "feature store implementation",
            "model monitoring framework",
        ],
    },
    "Data Governance": {
        "primary": "SQL, Collibra, Microsoft Purview, Data Quality, Metadata Management",
        "secondary": ["Data Cataloguing", "Data Privacy (PDPA)", "Master Data Management"],
        "roles": ["Data Governance Consultant", "Data Steward"],
        "aspiring": ["Data Governance Lead", "Chief Data Office Advisor"],
        "projects": [
            "data governance framework rollout",
            "data quality remediation",
            "metadata catalogue implementation",
            "PDPA compliance programme",
        ],
    },
}
SKILL_POOL = (
    ["Data Engineering"] * 6
    + ["AI / GenAI"] * 6
    + ["MLOps"] * 4
    + ["Data Governance"] * 4
)

# What each project involved + the technology used (for CV descriptions).
PROJECT_DETAILS = {
    "cloud data platform migration": (
        "migrated on-prem data workloads to the cloud", "AWS, Snowflake, Python, Airflow"),
    "real-time streaming pipeline": (
        "built real-time ingestion and processing pipelines", "Kafka, Spark Structured Streaming, Python"),
    "data warehouse modernisation": (
        "re-platformed a legacy warehouse and rebuilt ELT models", "Snowflake, dbt, SQL"),
    "lakehouse build-out": (
        "designed and implemented a lakehouse architecture", "Databricks, Delta Lake, PySpark"),
    "RAG chatbot": (
        "developed a retrieval-augmented chatbot over enterprise documents", "Python, LangChain, OpenAI, Pinecone"),
    "demand forecasting model": (
        "built and tuned time-series demand forecasting models", "Python, Prophet, scikit-learn"),
    "document intelligence solution": (
        "automated document extraction and classification", "Python, Azure Form Recognizer, LLMs"),
    "customer churn model": (
        "developed churn prediction models and driver analysis", "Python, scikit-learn, XGBoost"),
    "ML model productionisation": (
        "packaged and deployed ML models to production", "Python, Docker, Kubernetes, MLflow"),
    "CI/CD platform for ML": (
        "set up automated training and deployment pipelines", "GitHub Actions, Terraform, Kubernetes"),
    "feature store implementation": (
        "implemented a centralised feature store", "Feast, Python, Spark"),
    "model monitoring framework": (
        "built model drift and performance monitoring", "Python, Evidently, Prometheus, Grafana"),
    "data governance framework rollout": (
        "defined governance policies, roles, and workflows", "Collibra, SQL"),
    "data quality remediation": (
        "profiled data and remediated quality issues", "Great Expectations, SQL, Python"),
    "metadata catalogue implementation": (
        "implemented an enterprise metadata catalogue", "Microsoft Purview, SQL"),
    "PDPA compliance programme": (
        "delivered data privacy and PDPA compliance controls", "Collibra, SQL, Python"),
}

CLIENTS = [
    "Dummy Bank",
    "Dummy Telco",
    "Dummy Insurer",
    "Dummy Gov Agency",
    "Dummy Retailer",
    "Dummy Airline",
    "Dummy Healthcare Provider",
    "Dummy Energy Co",
    "Dummy Logistics Co",
]
EMS = [
    "Manager, Alex",
    "Manager, Blair",
    "Manager, Casey",
    "Manager, Devon",
    "Manager, Riley",
]

FIRST_NAMES = [
    "Jamie", "Morgan", "Wei Ling", "Arjun", "Siti", "Daniel", "Priya", "Nurul",
    "Ethan", "Mei Chen", "Rahul", "Aisha", "Marcus", "Hui Ling", "Farhan",
    "Grace", "Kenji", "Divya", "Bryan", "Sofia", "Ravi", "Chloe",
]
LAST_NAMES = [
    "Doe", "Tan", "Lim", "Sharma", "Rahman", "Ng", "Menon", "Binte Yusof",
    "Koh", "Wong", "Kapoor", "Abdullah", "Lee", "Goh", "Ismail", "Chua",
    "Nakamura", "Patel", "Ong", "Fernandez", "Iyer", "Teo",
]

FY26_REASONS = [
    "Rolled off a project early and spent time on internal enablement.",
    "Project was delayed, leading to a short bench period.",
    "Transitioned between two engagements with a gap in between.",
    "Part-time allocation across two smaller engagements.",
]
POST_ENGAGEMENT = [
    "Training, knowledge transfer, and internal BD activities",
    "Continue support activities and prepare handover notes",
    "Internal enablement and upskilling until next assignment",
    "Available for immediate re-staffing on a new engagement",
    "Pursue certification and contribute to accelerator development",
]

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def sentence_case(text):
    """Capitalise the first letter only, preserving acronyms (ML, CI/CD, PDPA...)."""
    return text[:1].upper() + text[1:]


def make_name(used):
    while True:
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        full = f"{last}, {first}"
        if full not in used:
            used.add(full)
            initials = f"{first[0]}{last[0]}"
            return f"{full} {initials.upper()}"


def build_weekly(current_alloc, end_week):
    """Return 7 weekly allocation fractions with a realistic wind-down."""
    weekly = []
    for i in range(7):
        if end_week is None or end_week > 6:
            weekly.append(current_alloc)
        elif i < end_week - 1:
            weekly.append(current_alloc)
        elif i == end_week - 1:
            weekly.append(round(current_alloc * 0.75, 2))
        elif i == end_week:
            weekly.append(round(current_alloc * 0.5, 2))
        else:
            weekly.append(0.0)
    return weekly


def avg_alloc_6m(current_alloc, end_week):
    """Average allocation over the next 26 weeks (for the 6-month availability)."""
    if current_alloc == 0:
        return 0.0
    if end_week is None:
        return current_alloc
    covered = min(end_week, 26)
    return current_alloc * covered / 26.0


def make_experience(skill_key, role, years):
    info = SKILLSETS[skill_key]
    n_projects = 3 if years >= 4 else 2
    # Draw project themes, occasionally borrowing from a second skillset.
    themes = list(info["projects"])
    other_key = random.choice([k for k in SKILLSETS if k != skill_key])
    themes += SKILLSETS[other_key]["projects"]
    chosen = random.sample(themes, n_projects)
    lines = [f"~{years} yr{'s' if years != 1 else ''} experience as {role}."]
    for theme in chosen:
        client = random.choice(CLIENTS)
        months = random.choice([6, 8, 9, 12, 14, 18])
        did, tech = PROJECT_DETAILS[theme]
        lines.append(
            f"- {sentence_case(theme)} for {client} ({months} mo): {did} using {tech}."
        )
    return "\n".join(lines)


def period_label(start, months):
    end = start
    for _ in range(months):
        # advance one month
        y = end.year + (end.month // 12)
        m = end.month % 12 + 1
        end = end.replace(year=y, month=m)
    if start.year == end.year:
        return f"{MONTHS[start.month - 1]}-{MONTHS[end.month - 1]} {start.year}"
    return f"{MONTHS[start.month - 1]} {start.year}-{MONTHS[end.month - 1]} {end.year}"


def build_allocation_text(current_alloc, end_date, client, project_theme):
    if current_alloc == 0:
        return "On bench - available for immediate staffing"
    pct = int(current_alloc * 100)
    period = period_label(REF_MONDAY, 3)
    line = f"{period} - {client} {sentence_case(project_theme)} ({pct}%)"
    if current_alloc < 1:
        line += "; remaining capacity available for staffing"
    else:
        line += "; internal enablement after roll-off"
    return line


def bench_category(current_alloc, end_week):
    if current_alloc == 0:
        return "On bench now"
    if 0 < current_alloc < 1:
        return f"Partially available ({int((1 - current_alloc) * 100)}% free)"
    if end_week is not None and end_week <= 12:
        return f"Coming on bench in {end_week} week(s)"
    return "Fully allocated"


def make_people():
    # Availability archetypes: (current_alloc, end_week_from_ref)
    # end_week None => allocated well beyond the visible window / 6 months.
    archetypes = (
        [(0.0, None)] * 4                       # 4 on bench now
        + [(0.5, 20), (0.75, 24), (0.5, 16),    # 5 partially available
           (0.75, 30), (0.5, 12)]
        + [(1.0, 4), (1.0, 5), (1.0, 6), (1.0, 8),   # 11 fully allocated,
           (1.0, 10), (1.0, 12), (1.0, 16), (1.0, 22),  # varied roll-off
           (1.0, 30), (1.0, 40), (1.0, None)]
    )
    random.shuffle(archetypes)

    ranks = RANK_POOL[:]
    random.shuffle(ranks)
    skills = SKILL_POOL[:]
    random.shuffle(skills)
    genders = GENDER_POOL[:]
    random.shuffle(genders)
    nationalities = NATIONALITY_POOL[:]
    random.shuffle(nationalities)

    used_names = set()
    people = []
    for i in range(20):
        current_alloc, end_week = archetypes[i]
        rank_name = ranks[i]
        grade = random.choice(RANKS[rank_name]["grades"])
        rank_and_grade = f"{rank_name} {grade}".strip()
        y_lo, y_hi = RANKS[rank_name]["years"]
        years = random.randint(y_lo, y_hi)

        skill_key = skills[i]
        info = SKILLSETS[skill_key]
        prev_role = random.choice(info["roles"])
        project_theme = random.choice(info["projects"])
        client = random.choice(CLIENTS)

        # End date derived from roll-off week (or far future if allocated long).
        if current_alloc == 0:
            end_date = None
        elif end_week is None:
            end_date = REF_MONDAY + timedelta(weeks=random.randint(45, 60))
        else:
            end_date = REF_MONDAY + timedelta(weeks=end_week)

        weekly = build_weekly(current_alloc, end_week)
        avg6 = avg_alloc_6m(current_alloc, end_week)
        availability_6m = round(1 - avg6, 2)

        twelve_week = current_alloc if (end_week is None or end_week > 12) else 0.0

        fulfilled = current_alloc == 1 and (end_week is None or end_week > 12)

        person = {
            "Employee name": make_name(used_names),
            "Rank and Grade": rank_and_grade,
            "Gender": genders[i],
            "Nationality": nationalities[i],
            "Bench Category Column": bench_category(current_alloc, end_week),
            "6 Weeks Forecast": weekly[5],
            "12 Weeks Forecast": twelve_week,
            "Current Week Forecast": weekly[0],
            WEEK_COLUMNS[0]: weekly[0],
            WEEK_COLUMNS[1]: weekly[1],
            WEEK_COLUMNS[2]: weekly[2],
            WEEK_COLUMNS[3]: weekly[3],
            WEEK_COLUMNS[4]: weekly[4],
            WEEK_COLUMNS[5]: weekly[5],
            WEEK_COLUMNS[6]: weekly[6],
            "Allocation": build_allocation_text(current_alloc, end_date, client, project_theme),
            "% availability for next 6 months": availability_6m,
            "End date": end_date,
            "Primary Skillset (Platform)": f"{skill_key} ({info['primary']})",
            "Secondary Skillset": random.choice(info["secondary"]),
            "Previous/Existing Project Roles": prev_role,
            "Aspiring roles": random.choice(info["aspiring"]),
            "Experience Summary (CV)": make_experience(skill_key, prev_role, years),
            "Current Engagement": (
                "On bench" if current_alloc == 0
                else f"{client} - {sentence_case(project_theme)} - E-{i + 1:08d}"
            ),
            "EM": random.choice(EMS),
            "Updated?": "yes",
            "For FY26 (Jul 2025 to Jun 2026), were you 100% fulfilled on a project?": (
                "Yes" if fulfilled else "No"
            ),
            "If you were NOT 100% for FY26 (Jul 2025 to Jun 2026), why not?": (
                "N/A" if fulfilled else random.choice(FY26_REASONS)
            ),
            "What are your planned activities after your current engagement ends, "
            "if it is expected to conclude within the next six months?": random.choice(POST_ENGAGEMENT),
            "MS FORM DONE?": random.choice(["yes", "yes", "no"]),
        }
        people.append(person)
    return people


def write_excel(people):
    columns = list(people[0].keys())
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Resources"

    header_fill = PatternFill("solid", fgColor="1F3864")
    header_font = Font(bold=True, color="FFFFFF")
    for c, name in enumerate(columns, start=1):
        cell = ws.cell(row=1, column=c, value=name)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(vertical="center", wrap_text=True)

    pct_cols = {
        "6 Weeks Forecast", "12 Weeks Forecast", "Current Week Forecast",
        "% availability for next 6 months", *WEEK_COLUMNS,
    }
    wrap_cols = {"Experience Summary (CV)", "Allocation"}

    for r, person in enumerate(people, start=2):
        for c, name in enumerate(columns, start=1):
            value = person[name]
            cell = ws.cell(row=r, column=c, value=value)
            if name in pct_cols and isinstance(value, (int, float)):
                cell.number_format = "0%"
            elif name == "End date" and value is not None:
                cell.number_format = "dd mmm yyyy"
            if name in wrap_cols:
                cell.alignment = Alignment(wrap_text=True, vertical="top")
            else:
                cell.alignment = Alignment(vertical="top")

    # Column widths + wrapping for readability.
    wide = {
        "Employee name": 22, "Allocation": 46, "Primary Skillset (Platform)": 42,
        "Experience Summary (CV)": 70, "Current Engagement": 42,
        "Bench Category Column": 26,
    }
    for c, name in enumerate(columns, start=1):
        letter = get_column_letter(c)
        ws.column_dimensions[letter].width = wide.get(name, 16)

    ws.freeze_panes = "B2"
    ws.row_dimensions[1].height = 42
    wb.save(OUTPUT_PATH)


def print_summary(people):
    def dist(key):
        counts = {}
        for p in people:
            counts[p[key]] = counts.get(p[key], 0) + 1
        return counts

    print(f"Generated {len(people)} people -> {OUTPUT_PATH}\n")
    print("Rank:", dist("Rank and Grade"))
    print("Gender:", dist("Gender"))
    print("Nationality:", dist("Nationality"))
    skills = {}
    for p in people:
        key = p["Primary Skillset (Platform)"].split(" (")[0]
        skills[key] = skills.get(key, 0) + 1
    print("Skillset:", skills)
    print("Bench category:", dist("Bench Category Column"))
    avail_now = sum(1 for p in people if p["Current Week Forecast"] < 1)
    print(f"Have spare capacity this week: {avail_now}")


if __name__ == "__main__":
    people = make_people()
    write_excel(people)
    print_summary(people)
