"""
Expand the masked seed files to a 20-person demo roster + resume deck.

Seed inputs (read-only templates):
  - Dummy Data Generated Masked.seed.xlsx
  - Masked resume.seed.pptx

Outputs (app-facing names):
  - Dummy Data Generated.xlsx
  - Dummy Data Generated Resumes.pptx
"""

from __future__ import annotations

import copy
import random
import shutil
from datetime import datetime, timedelta
from pathlib import Path

import openpyxl
from openpyxl.worksheet.formula import ArrayFormula
from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE

SEED = 42
random.seed(SEED)

ROOT = Path(r"C:\Users\miawm\Downloads\Grayson Dummy")
EXCEL_SEED = ROOT / "Dummy Data Generated Masked.seed.xlsx"
PPTX_SEED = ROOT / "Masked resume.seed.pptx"
EXCEL_PATH = ROOT / "Dummy Data Generated.xlsx"
PPTX_PATH = ROOT / "Dummy Data Generated Resumes.pptx"

REF_MONDAY = datetime(2026, 7, 14)  # first weekly column in the masked workbook
WEEK_COLS = [
    "WC 14 Jul 2026",
    "WC 22 Jul 2026",
    "WC 29 Jul 2026",
    "WC 5 Aug 2026",
    "WC 12 Aug 2026",
    "WC 19 Aug 2026",
    "WC 26 Aug 2026",
]

SKILL_BUCKETS = [
    "Data Engineering",
    "Data Architecture",
    "Business Intelligence & Analytics",
    "Artificial Intelligence (AI) & Machine Learning",
    "Data Governance & Quality",
    "Data Security & Privacy",
    "Data Strategy & Management",
    "Cloud Data Platforms & Operations",
]

# Keep Pokka as person 1; invent 19 more masked-but-plausible SG consulting names.
PEOPLE_META = [
    # name, gender, nationality, rank, role, primary, secondary, aspiring, buckets, years
    (
        "Pokka",
        "Male",
        "Singaporean",
        "Intern (CS) 1",
        "Tech Consultant",
        "Python, MySQL, C++, Javascript, Typescript",
        "Python\nPyTorch, Scikit-learn, SHAP, Model Optimization, Feature Engineering",
        "AI/ML Ops\nSoftware Developer / AI Engineer",
        ["Data Engineering", "Business Intelligence & Analytics", "Artificial Intelligence (AI) & Machine Learning"],
        1,
        "seed",  # special: keep existing excel + resume text for Pokka
    ),
    (
        "Kopi, Jia Wei",
        "Male",
        "Singaporean",
        "Associate 2",
        "Data Engineer",
        "Python, SQL, Spark, Airflow, dbt",
        "Lakehouse Architecture\nKafka Streaming, Delta Lake",
        "Lead Data Engineer\nData Architect",
        ["Data Engineering", "Cloud Data Platforms & Operations"],
        3,
        None,
    ),
    (
        "Teh, Mei Ling",
        "Female",
        "Singaporean",
        "Senior 1",
        "AI Engineer",
        "Python, PyTorch, LangChain, LLMs, RAG",
        "NLP\nDocument Intelligence, Prompt Engineering",
        "GenAI Lead\nML Research Engineer",
        ["Artificial Intelligence (AI) & Machine Learning", "Data Engineering"],
        6,
        None,
    ),
    (
        "Bandung, Arjun",
        "Male",
        "PR",
        "Manager 1",
        "Data Architecture Lead",
        "Azure, Databricks, Synapse, Python, SQL",
        "Enterprise Data Modelling\nMDM, Integration Patterns",
        "Principal Architect\nCTO Advisory",
        ["Data Architecture", "Cloud Data Platforms & Operations", "Data Strategy & Management"],
        10,
        None,
    ),
    (
        "Milo, Nurul",
        "Female",
        "Singaporean",
        "Associate 1",
        "Analytics Engineer",
        "SQL, dbt, Power BI, Python",
        "Semantic Modelling\nSelf-serve BI enablement",
        "BI Lead\nAnalytics Manager",
        ["Business Intelligence & Analytics", "Data Engineering"],
        2,
        None,
    ),
    (
        "Horlicks, Daniel",
        "Male",
        "Long-term Pass",
        "Senior 2",
        "MLOps Engineer",
        "Python, Docker, Kubernetes, MLflow, Terraform",
        "Feature Store\nModel Monitoring, CI/CD",
        "MLOps Lead\nPlatform Architect",
        ["Artificial Intelligence (AI) & Machine Learning", "Cloud Data Platforms & Operations"],
        7,
        None,
    ),
    (
        "Chrysanthemum, Priya",
        "Female",
        "PR",
        "Associate 3",
        "Data Governance Consultant",
        "SQL, Collibra, Microsoft Purview, Data Quality",
        "PDPA / Privacy\nMetadata Management",
        "Data Governance Lead\nCDO Advisor",
        ["Data Governance & Quality", "Data Security & Privacy"],
        4,
        None,
    ),
    (
        "Yakult, Marcus",
        "Male",
        "Singaporean",
        "Intern (CS) 1",
        "Tech Consultant",
        "Python, SQL, Javascript, React",
        "Basic ML\nScikit-learn, Pandas",
        "Software Developer / AI Engineer",
        ["Data Engineering", "Artificial Intelligence (AI) & Machine Learning"],
        1,
        None,
    ),
    (
        "Ribena, Aisha",
        "Female",
        "Singaporean",
        "Manager 2",
        "Data Strategy Manager",
        "SQL, Azure, Power BI, Stakeholder Management",
        "Operating Model Design\nValue Case Development",
        "Partner / Director track",
        ["Data Strategy & Management", "Business Intelligence & Analytics", "Data Governance & Quality"],
        11,
        None,
    ),
    (
        "Fanta, Rahul",
        "Male",
        "Long-term Pass",
        "Senior 1",
        "Cloud Data Engineer",
        "AWS, Glue, Redshift, Python, Terraform",
        "Streaming (Kinesis/Kafka)\nCost Optimisation",
        "Cloud Architect\nPlatform Lead",
        ["Cloud Data Platforms & Operations", "Data Engineering"],
        5,
        None,
    ),
    (
        "Sprite, Hui Ling",
        "Female",
        "Singaporean",
        "Associate 2",
        "BI Developer",
        "Power BI, SQL, DAX, Azure Synapse",
        "Data Visualisation\nReporting Automation",
        "Analytics Engineer\nBI Lead",
        ["Business Intelligence & Analytics"],
        3,
        None,
    ),
    (
        "Pocari, Kenji",
        "Male",
        "PR",
        "Senior 2",
        "Data Scientist",
        "Python, scikit-learn, XGBoost, SQL",
        "Forecasting\nCausal Inference",
        "Principal Data Scientist\nAI Product Owner",
        ["Artificial Intelligence (AI) & Machine Learning", "Business Intelligence & Analytics"],
        8,
        None,
    ),
    (
        "Calpis, Sofia",
        "Female",
        "Singaporean",
        "Associate 1",
        "Data Steward",
        "SQL, Great Expectations, Collibra",
        "Data Quality Rules\nIssue Remediation",
        "Data Governance Consultant",
        ["Data Governance & Quality"],
        2,
        None,
    ),
    (
        "Oolong, Bryan",
        "Male",
        "Singaporean",
        "Manager 1",
        "Engagement Manager - Data",
        "Azure, Databricks, Delivery Management, SQL",
        "Agile Delivery\nCommercials / SOW",
        "Senior Manager\nPortfolio Lead",
        ["Data Strategy & Management", "Cloud Data Platforms & Operations", "Data Architecture"],
        9,
        None,
    ),
    (
        "Matcha, Divya",
        "Female",
        "PR",
        "Senior 1",
        "Privacy & Security Consultant",
        "SQL, Purview, Azure AD, PDPA controls",
        "Access Governance\nData Classification",
        "Data Security Lead",
        ["Data Security & Privacy", "Data Governance & Quality"],
        6,
        None,
    ),
    (
        "Soybean, Ethan",
        "Male",
        "Singaporean",
        "Associate 3",
        "Platform Engineer",
        "Python, Kubernetes, Terraform, GitHub Actions",
        "Observability\nDevOps for Data",
        "MLOps Engineer\nPlatform Architect",
        ["Cloud Data Platforms & Operations", "Data Engineering"],
        4,
        None,
    ),
    (
        "Ginger, Chloe",
        "Female",
        "Singaporean",
        "Senior 2",
        "Analytics Consultant",
        "SQL, Python, Tableau, Snowflake",
        "Executive Dashboards\nKPI Frameworks",
        "Manager - Insights",
        ["Business Intelligence & Analytics", "Data Strategy & Management"],
        7,
        None,
    ),
    (
        "Barley, Farhan",
        "Male",
        "Long-term Pass",
        "Associate 2",
        "GenAI Engineer",
        "Python, LangChain, Azure OpenAI, Vector DBs",
        "RAG Patterns\nEvaluation Harnesses",
        "AI Engineer\nGenAI Lead",
        ["Artificial Intelligence (AI) & Machine Learning", "Data Engineering"],
        3,
        None,
    ),
    (
        "Coconut, Grace",
        "Female",
        "Singaporean",
        "Intern (CS) 1",
        "Tech Consultant",
        "Python, SQL, Excel, Power BI",
        "Data Cleaning\nBasic Visualisation",
        "Analytics Engineer",
        ["Business Intelligence & Analytics", "Data Engineering"],
        1,
        None,
    ),
    (
        "Lemongrass, Ravi",
        "Male",
        "Singaporean",
        "Manager 2",
        "Data Platform Manager",
        "Databricks, Spark, Azure, FinOps",
        "Platform Roadmaps\nTeam Leadership",
        "Senior Manager - Platforms",
        ["Cloud Data Platforms & Operations", "Data Architecture", "Data Strategy & Management"],
        12,
        None,
    ),
]

PROJECTS = [
    {
        "name": "Pokkatea",
        "em_sheet": "Manager1",
        "em_master": "Liu, Vanessa",
        "client": "Pokkatea Holdings",
        "theme": "S/4HANA data migration & reporting",
        "code": "E-69379635",
    },
    {
        "name": "Lumina360",
        "em_sheet": "Manager 2",
        "em_master": "Tan, Alexis",
        "client": "Dummy Telco",
        "theme": "Customer 360 lakehouse",
        "code": "E-71004821",
    },
    {
        "name": "Clearwater",
        "em_sheet": "Manager 3",
        "em_master": "Ng, Jordan",
        "client": "Dummy Gov Agency",
        "theme": "Enterprise data governance programme",
        "code": "E-72219904",
    },
]

# Archetypes: (current_alloc, end_week_from_ref or None, project_idx)
# Tuned so ~4 bench / partial, rest allocated across 3 engagements.
ARCHETYPES = [
    (1.0, 0, 0),     # Pokka - rolls off immediately (seed)
    (0.0, None, None),  # on bench
    (1.0, 40, 1),
    (1.0, 36, 1),
    (0.5, 18, 0),
    (1.0, 44, 2),
    (0.75, 22, 2),
    (0.0, None, None),
    (1.0, 48, 1),
    (1.0, 28, 0),
    (0.2, 30, 0),
    (1.0, 50, 2),
    (0.6, 40, 1),
    (1.0, 34, 2),
    (1.0, 16, 1),
    (0.5, 12, 2),
    (1.0, 26, 0),
    (1.0, 20, 1),
    (0.0, None, None),
    (1.0, 55, 2),
]

EMS = ["Liu, Vanessa", "Tan, Alexis", "Ng, Jordan", "Wong, Casey", "Lim, Devon"]

CLIENT_FICTION = [
    ("Pokkatea", "Pokkastan"),
    ("Dummy Telco", "Singapura"),
    ("Dummy Bank", "Singapura"),
    ("Dummy Insurer", "Malaya"),
    ("Dummy Retailer", "Singapura"),
    ("Dummy Gov Agency", "Singapura"),
    ("Dummy Healthcare", "Singapura"),
    ("Dummy Energy Co", "Batavia"),
]

CERT_POOL = [
    "Project Management Professional (PMP)",
    "Professional Scrum Master (PSM I)",
    "AWS Certified Solutions Architect Associate",
    "Microsoft Azure Fundamentals",
    "Microsoft Azure Data Engineer Associate",
    "Databricks Lakehouse Fundamentals",
    "Google Professional Data Engineer",
    "Certified Data Management Professional (CDMP)",
    "TensorFlow Developer Certificate",
]

DEGREE_POOL = [
    ("2018-2022", "Bachelor of Computing\n\nNational University of Pokkastan"),
    ("2016-2020", "Bachelor of Science (Data Science)\n\nUniversity of Singapura"),
    ("2014-2018", "Bachelor of Engineering (Computer)\n\nNanyang Dummy University"),
    ("2012-2016", "Bachelor of Information Systems\n\nSingapore Dummy University"),
    ("2010-2014", "Bachelor of Science (Statistics)\n\nUniversity of Pokkastan"),
    ("2008-2012", "Master of Technology (Software)\n\nDummy Institute of Technology"),
    ("2005-2009", "Master of Science (Analytics)\n\nUniversity of Singapura"),
    ("1998-2001", "Master's in Computer Applications\n\nUniversity of pokkastan"),
]

TITLE_BY_RANK = {
    "Intern": "Intern, AI and Data, Singapore",
    "Associate": "Consultant, AI and Data, Singapore",
    "Senior": "Senior Consultant, AI and Data, Singapore",
    "Manager": "Manager, AI and Data, Singapore",
}


def rank_family(rank_and_grade: str) -> str:
    for key in ("Intern", "Associate", "Senior", "Manager"):
        if rank_and_grade.startswith(key):
            return key
    return "Associate"


def bench_category(current_alloc: float, end_week: int | None) -> str:
    if current_alloc == 0:
        return "On bench now"
    if 0 < current_alloc < 1:
        return f"Partially available ({int(round((1 - current_alloc) * 100))}% free)"
    if end_week is not None and end_week <= 12:
        weeks = max(1, end_week)
        return f"Coming on bench in {weeks} week(s)"
    return "Fully allocated"


def build_weekly(current_alloc: float, end_week: int | None) -> list[float]:
    weekly = []
    for i in range(7):
        if current_alloc == 0:
            weekly.append(0.0)
        elif end_week is None or end_week > 6:
            weekly.append(current_alloc)
        elif i < end_week - 1:
            weekly.append(current_alloc)
        elif i == end_week - 1:
            weekly.append(round(current_alloc * 0.75, 4))
        elif i == end_week:
            weekly.append(round(current_alloc * 0.5, 4))
        else:
            weekly.append(0.0)
    return weekly


def availability_windows(weekly: list[float], current_alloc: float, end_week: int | None):
    """Rough 1/2/3/6 month free capacity from allocation pattern."""
    def free_over(weeks: int) -> float:
        if current_alloc == 0:
            return 1.0
        if end_week is None:
            return max(0.0, 1.0 - current_alloc)
        # free after roll-off
        free_weeks = max(0, weeks - end_week)
        partial = max(0.0, 1.0 - current_alloc) * min(end_week, weeks)
        return round((partial + free_weeks) / weeks, 4)

    return free_over(4), free_over(8), free_over(12), free_over(26)


def allocation_remarks(current_alloc: float, end_date: datetime | None, project: dict | None) -> str:
    if current_alloc == 0 or project is None:
        return "On bench - available for immediate staffing"
    pct = int(round(current_alloc * 100))
    end_txt = end_date.strftime("%b %Y") if end_date else "TBC"
    return (
        f"Current - {project['client']} {project['theme']} ({pct}%)\n"
        f"Expected end {end_txt}\n"
        f"{'Partial capacity open for staffing' if current_alloc < 1 else 'Internal enablement after roll-off'}"
    )


def experience_bullets(primary: str, buckets: list[str], years: int, name: str) -> list[tuple[str, str]]:
    """Return (header, body) experience blocks for the resume."""
    rng = random.Random(hash(name) & 0xFFFFFFFF)
    n = 3 if years >= 6 else 2
    picks = rng.sample(CLIENT_FICTION, n)
    bodies = {
        "Data Engineering": "Designed and built scalable ingestion and transformation pipelines using {tech}, enabling reliable analytics and AI workloads.",
        "Data Architecture": "Defined target data architecture and integration patterns on {tech}, unifying domains and accelerating downstream use cases.",
        "Business Intelligence & Analytics": "Delivered self-serve analytics and executive reporting on {tech}, improving decision cycle time for business stakeholders.",
        "Artificial Intelligence (AI) & Machine Learning": "Built and productionised ML/GenAI solutions with {tech}, focusing on measurable business outcomes and responsible AI controls.",
        "Data Governance & Quality": "Stood up data governance operating model and quality controls with {tech}, improving trust and discoverability of critical data.",
        "Data Security & Privacy": "Implemented data protection and access controls using {tech}, aligning with PDPA and enterprise security standards.",
        "Data Strategy & Management": "Shaped data strategy, roadmap and value cases; guided delivery teams using {tech} platforms to prioritise high-ROI use cases.",
        "Cloud Data Platforms & Operations": "Delivered cloud data platform capabilities on {tech}, covering lakehouse storage, compute, CI/CD and cost governance.",
    }
    tech_map = {
        "Data Engineering": "Python, Spark, ADF/Airflow and SQL",
        "Data Architecture": "Azure Synapse, Databricks and enterprise modelling tools",
        "Business Intelligence & Analytics": "Power BI / Tableau, SQL and semantic models",
        "Artificial Intelligence (AI) & Machine Learning": "Python, Azure OpenAI / LangChain and MLflow",
        "Data Governance & Quality": "Purview/Collibra, SQL and data quality frameworks",
        "Data Security & Privacy": "Purview, Azure AD and classification tooling",
        "Data Strategy & Management": "cloud analytics platforms and operating-model artefacts",
        "Cloud Data Platforms & Operations": "AWS/Azure, Terraform, Kubernetes and Databricks",
    }
    focus = buckets[:] or ["Data Engineering"]
    out = []
    for i, (client, country) in enumerate(picks):
        end_year = 2025 - i
        start_year = end_year - rng.randint(1, 3)
        bucket = focus[i % len(focus)]
        tech = tech_map[bucket]
        header = f"{client}, {country} – {start_year}-{end_year}"
        body = bodies[bucket].format(tech=tech)
        out.append((header, body))
    return out


def background_blurb(years: int, buckets: list[str], rank: str) -> str:
    focus = ", ".join(buckets[:2]) if buckets else "data and analytics"
    seniority = {
        "Intern": "An early-career consultant building foundations",
        "Associate": "A hands-on consultant",
        "Senior": "A seasoned consultant",
        "Manager": "A delivery leader",
    }[rank]
    ytxt = f"{years}+ yrs" if years > 1 else "1 yr"
    return (
        f"{seniority} with {ytxt} of experience across {focus}. "
        f"Combines technical delivery with stakeholder management to ship practical outcomes for clients in Singapore and the region.\n\n"
        f"Passionate about helping organisations modernise data platforms, adopt AI responsibly, and turn information into competitive advantage."
    )


def set_shape_paragraphs(shape, lines: list[str]):
    """Replace a text frame's paragraphs with the given lines, preserving first-run formatting where possible."""
    tf = shape.text_frame
    # Ensure enough paragraphs
    while len(tf.paragraphs) < len(lines):
        tf.add_paragraph()
    for i, para in enumerate(tf.paragraphs):
        text = lines[i] if i < len(lines) else ""
        if para.runs:
            para.runs[0].text = text
            for run in para.runs[1:]:
                run.text = ""
        else:
            run = para.add_run()
            run.text = text
    # Clear any extra paragraphs beyond lines
    for i in range(len(lines), len(tf.paragraphs)):
        para = tf.paragraphs[i]
        if para.runs:
            para.runs[0].text = ""
            for run in para.runs[1:]:
                run.text = ""


def find_shapes_by_title_text(slide):
    """Map section header text -> content shape in the same group, plus header textbox."""
    mapping = {}
    for shape in slide.shapes:
        if shape.has_text_frame and shape.name.startswith("Text Box"):
            mapping["header"] = shape
        if shape.shape_type == MSO_SHAPE_TYPE.GROUP:
            header_shape = None
            body_shape = None
            for child in shape.shapes:
                if not child.has_text_frame:
                    continue
                txt = "\n".join(p.text for p in child.text_frame.paragraphs).strip().lower()
                if txt in {"relevant experience", "background", "skills", "education"}:
                    header_shape = child
                else:
                    body_shape = child
            if header_shape is not None and body_shape is not None:
                key = "\n".join(p.text for p in header_shape.text_frame.paragraphs).strip().lower()
                mapping[key] = body_shape
        if shape.has_text_frame and shape.text_frame.paragraphs:
            t = shape.text_frame.paragraphs[0].text.strip().lower()
            if t == "education":
                mapping["education_label"] = shape
        if getattr(shape, "has_table", False) and shape.has_table:
            mapping["education_table"] = shape
    return mapping


def apply_resume(slide, person: dict, keep_seed_text: bool = False):
    if keep_seed_text:
        return
    shapes = find_shapes_by_title_text(slide)
    name = person["Employee name"]
    email_local = name.split(",")[0].strip().replace(" ", "").lower()
    title = TITLE_BY_RANK[rank_family(person["Rank and Grade"])]

    if "header" in shapes:
        set_shape_paragraphs(
            shapes["header"],
            [name + " ", title, f"Email: {email_local}@sg.ey.com"],
        )

    buckets = person["_buckets"]
    years = person["_years"]
    if "background" in shapes:
        set_shape_paragraphs(shapes["background"], [background_blurb(years, buckets, rank_family(person["Rank and Grade"]))])

    if "relevant experience" in shapes:
        bullets = experience_bullets(person["Primary Skillset (Platform)"], buckets, years, name)
        lines = []
        for header, body in bullets:
            lines.append(header)
            lines.append(" " + body)
        set_shape_paragraphs(shapes["relevant experience"], lines)

    if "skills" in shapes:
        certs = random.Random(hash(name) ^ 7).sample(CERT_POOL, 4)
        set_shape_paragraphs(shapes["skills"], certs)

    if "education_table" in shapes:
        degree = random.Random(hash(name) ^ 99).choice(DEGREE_POOL)
        table = shapes["education_table"].table
        # row 1 is data
        table.cell(1, 0).text = degree[0]
        table.cell(1, 1).text = degree[1]


def clone_slide(prs: Presentation, index: int = 0):
    """Clone an existing slide to the end of the presentation (XML-level)."""
    source = prs.slides[index]
    blank_layout = source.slide_layout
    dest = prs.slides.add_slide(blank_layout)

    # Remove any default shapes from the new slide
    for sp in list(dest.shapes._spTree):  # noqa: SLF001
        tag = sp.tag
        # keep nvGrpSpPr / cSld structure pieces; remove graphic shapes later via clear
        pass

    # Clear dest shapes by removing all shape elements under spTree except structural ones
    spTree = dest.shapes._spTree  # noqa: SLF001
    nsmap_vals = list(spTree.nsmap.values()) if hasattr(spTree, "nsmap") else []
    for child in list(spTree):
        if child.tag.endswith("}nvGrpSpPr") or child.tag.endswith("}clrMapOvr"):
            continue
        if child.tag.endswith("}extLst"):
            continue
        # keep cSld? in python-pptx, shapes live directly under sld/cSld/spTree
        if not (
            child.tag.endswith("}nvGrpSpPr")
            or child.tag.endswith("}clrMapOvr")
        ):
            # Remove shape-like nodes that were added by blank layout
            if any(
                child.tag.endswith(suf)
                for suf in ("}sp", "}pic", "}grpSp", "}graphicFrame", "}cxnSp")
            ):
                spTree.remove(child)

    # Deep copy shapes from source
    for child in source.shapes._spTree:  # noqa: SLF001
        if any(
            child.tag.endswith(suf)
            for suf in ("}sp", "}pic", "}grpSp", "}graphicFrame", "}cxnSp")
        ):
            spTree.append(copy.deepcopy(child))

    return dest


def build_people() -> list[dict]:
    people = []
    for i, meta in enumerate(PEOPLE_META):
        name, gender, nationality, rank, role, primary, secondary, aspiring, buckets, years, flag = meta
        current_alloc, end_week, project_idx = ARCHETYPES[i]
        project = PROJECTS[project_idx] if project_idx is not None else None

        if flag == "seed":
            # Preserve Pokka's original seed values for continuity with the provided files.
            weekly = [0, 0, 0, 0, 0, 0, 0]
            person = {
                "Employee name": "Pokka",
                "Gender": "Male",
                "Rank and Grade": "Intern (CS) 1",
                "Bench Category Column": "Coming on bench in 1 week(s)",
                "6 Weeks Forecast": 0,
                "12 Weeks Forecast": 0,
                "Current Week Forecast": 1.03509,
                **{WEEK_COLS[j]: weekly[j] for j in range(7)},
                "Allocation Remarks": "May - Aug 2027 SAESL \nMay - Aug 2026 - SAESL 100%\nInternship until 7 Aug",
                "% Availablity (1mth)": 0,
                "% Availablity (2mth)": 0,
                "% Availablity (3mth)": 0,
                "% Availablity (6mth)": 0,
                "% Availablity 6mth onwards (Outdated)": "100%\n",
                "End date": datetime(2026, 7, 8),
                "Nationality": "Singaporean",
                "Previous/Existing Project Roles": "Tech Consultant",
                "Primary Skillset (Platform)": primary,
                "Secondary Skillset": secondary,
                "Aspiring roles": aspiring,
                "Current Engagement": "Singapore Aero Engine Services Private Limited - SAESL S/4HANA Implementation - E-69379635",
                "EM": "Liu, Vanessa",
                "_buckets": buckets,
                "_years": years,
                "_seed": True,
                "_project_idx": 0,
                "_util": 0.3,
            }
            people.append(person)
            continue

        weekly = build_weekly(current_alloc, end_week)
        a1, a2, a3, a6 = availability_windows(weekly, current_alloc, end_week)
        if current_alloc == 0:
            end_date = None
            engagement = "On bench"
            em = random.choice(EMS)
            util = 0.0
        else:
            end_date = REF_MONDAY + timedelta(weeks=(end_week or 52))
            engagement = f"{project['client']} - {project['theme']} - {project['code']}"
            em = project["em_master"]
            util = current_alloc

        twelve = current_alloc if (end_week is None or end_week > 12) else 0.0
        six_week = weekly[5] if len(weekly) > 5 else current_alloc

        person = {
            "Employee name": name,
            "Gender": gender,
            "Rank and Grade": rank,
            "Bench Category Column": bench_category(current_alloc, end_week),
            "6 Weeks Forecast": six_week,
            "12 Weeks Forecast": twelve,
            "Current Week Forecast": weekly[0],
            **{WEEK_COLS[j]: weekly[j] for j in range(7)},
            "Allocation Remarks": allocation_remarks(current_alloc, end_date, project),
            "% Availablity (1mth)": a1,
            "% Availablity (2mth)": a2,
            "% Availablity (3mth)": a3,
            "% Availablity (6mth)": a6,
            "% Availablity 6mth onwards (Outdated)": f"{int(round(a6 * 100))}%\n",
            "End date": end_date,
            "Nationality": nationality,
            "Previous/Existing Project Roles": role,
            "Primary Skillset (Platform)": primary,
            "Secondary Skillset": secondary,
            "Aspiring roles": aspiring,
            "Current Engagement": engagement,
            "EM": em,
            "_buckets": buckets,
            "_years": years,
            "_seed": False,
            "_project_idx": project_idx,
            "_util": util,
            "_start": REF_MONDAY if current_alloc > 0 else None,
        }
        people.append(person)
    return people


def write_excel(people: list[dict]):
    if not EXCEL_SEED.exists():
        raise FileNotFoundError(f"Missing Excel seed template: {EXCEL_SEED}")

    wb = openpyxl.load_workbook(EXCEL_SEED)
    master = wb["Master"]
    util = wb["Utilization by Engagement"]

    headers = [c.value for c in master[1]]

    # Clear old data rows (keep header)
    if master.max_row > 1:
        master.delete_rows(2, master.max_row - 1)

    pct_headers = {
        "6 Weeks Forecast",
        "12 Weeks Forecast",
        "Current Week Forecast",
        "% Availablity (1mth)",
        "% Availablity (2mth)",
        "% Availablity (3mth)",
        "% Availablity (6mth)",
        *WEEK_COLS,
    }

    for r, person in enumerate(people, start=2):
        for c, header in enumerate(headers, start=1):
            cell = master.cell(row=r, column=c)
            if header == "Bench/Partial Bench (Profinda)":
                cell.value = f'=IF($G{r}>=100%,"NA",IF(G{r}=0%,"Bench","Partial Bench"))'
                continue
            if header == "Combined Bucket Skillset":
                cell.value = ArrayFormula(
                    f"AA{r}",
                    f'=_xlfn.TEXTJOIN(", ",TRUE,_xlfn._xlws.FILTER($AB$1:$AI$1,$AB{r}:$AI{r}="Yes"))',
                )
                continue
            if header in SKILL_BUCKETS:
                cell.value = "Yes" if header in person["_buckets"] else None
                continue
            if header in person:
                cell.value = person[header]
            if header in pct_headers and isinstance(cell.value, (int, float)):
                cell.number_format = "0%;-0%;0%"
            if header == "End date":
                cell.number_format = "mm-dd-yy"

    # Rebuild Utilization sheet for the 20 people (keep header).
    # Seed file uses merged project/EM cells — clear those first or writes land in
    # non-top-left merge cells and disappear.
    for merged in list(util.merged_cells.ranges):
        util.unmerge_cells(str(merged))
    if util.max_row > 1:
        util.delete_rows(2, util.max_row - 1)

    # Group by project for a clean sheet layout.
    row = 2
    for p_idx, project in enumerate(PROJECTS):
        members = [p for p in people if p.get("_project_idx") == p_idx]
        first = True
        for person in members:
            util.cell(row=row, column=1).value = project["name"] if first else None
            util.cell(row=row, column=2).value = project["em_sheet"] if first else None
            util.cell(row=row, column=3).value = person["Employee name"]
            util.cell(row=row, column=4).value = f'=VLOOKUP(C{row},Master!A:C,3,0)'
            start = person.get("_start")
            end = person.get("End date")
            util.cell(row=row, column=5).value = start
            util.cell(row=row, column=6).value = end
            if start:
                util.cell(row=row, column=5).number_format = "yyyy-mm-dd"
            if end:
                util.cell(row=row, column=6).number_format = "yyyy-mm-dd"
            util.cell(row=row, column=7).value = person.get("_util") or 0
            util.cell(row=row, column=7).number_format = "0%"
            first = False
            row += 1

    # Bench people stay on Master only — they do not appear on Utilization.
    assigned = [p for p in people if p.get("_project_idx") is not None]
    util.cell(row=row + 1, column=1).value = f"Unique Resources Count: {len(assigned)}"

    # Re-merge project / EM columns per engagement block for readability.
    blocks: list[tuple[int, int]] = []
    start = None
    last_project_row = None
    for r in range(2, row):
        if util.cell(row=r, column=1).value:
            if start is not None and last_project_row is not None and last_project_row > start:
                blocks.append((start, last_project_row))
            start = r
        last_project_row = r
    if start is not None and last_project_row is not None and last_project_row > start:
        blocks.append((start, last_project_row))
    for a, b in blocks:
        util.merge_cells(start_row=a, start_column=1, end_row=b, end_column=1)
        util.merge_cells(start_row=a, start_column=2, end_row=b, end_column=2)

    wb.save(EXCEL_PATH)
    print(f"Wrote {len(people)} people -> {EXCEL_PATH}")


def write_pptx(people: list[dict]):
    if not PPTX_SEED.exists():
        raise FileNotFoundError(f"Missing resume seed template: {PPTX_SEED}")

    prs = Presentation(str(PPTX_SEED))
    # Slide 0 is Pokka seed - keep text, then clone for others.
    apply_resume(prs.slides[0], people[0], keep_seed_text=True)

    for person in people[1:]:
        slide = clone_slide(prs, 0)
        apply_resume(slide, person, keep_seed_text=False)

    prs.save(str(PPTX_PATH))
    print(f"Wrote {len(prs.slides)} resume slides -> {PPTX_PATH}")


def main():
    assert len(PEOPLE_META) == 20
    assert len(ARCHETYPES) == 20
    people = build_people()
    write_excel(people)
    write_pptx(people)
    print("\nRoster:")
    for p in people:
        print(
            f"  - {p['Employee name']:<22} {p['Rank and Grade']:<16} "
            f"{p['Bench Category Column']:<40} {p['Current Engagement'][:50]}"
        )


if __name__ == "__main__":
    main()
