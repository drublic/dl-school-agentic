#!/usr/bin/env python3
"""Generate employee_handbook.pdf for Session 4 workshop demos."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

from fpdf import FPDF

ROOT = Path(__file__).resolve().parent
CORPUS_PATH = ROOT / "handbook-corpus.json"
OUTPUT_PATH = ROOT / "employee_handbook.pdf"

COMPANY = "Northstar Labs GmbH"
TITLE = "Employee Handbook"
EDITION = "2024 Edition"
EFFECTIVE = "Effective January 1, 2024"

# Compact 22-page layout — multiple paragraphs per page; §3.2 Remote Work stays on p.12 (RAG demo).
TOTAL_PAGES = 22


@dataclass
class SectionBlock:
    section_id: str
    section: str
    paragraphs: list[str]


@dataclass
class TableBlock:
    headers: list[str]
    rows: list[list[str]]
    col_widths: list[float]


@dataclass
class PageSpec:
    blocks: list[str | SectionBlock | TableBlock] = field(default_factory=list)


def _p(*paragraphs: str) -> list[str]:
    return list(paragraphs)


def build_pages() -> dict[int, PageSpec]:
    return {
        1: PageSpec(),  # cover
        2: PageSpec(
            blocks=_p(
                "About This Handbook",
                "Northstar Labs GmbH provides this handbook to describe employment policies, "
                "benefits, workplace expectations, and conduct standards for all employees. "
                "It is not an employment contract and does not alter at-will employment where applicable.",
                "Managers may implement additional team norms that remain consistent with these "
                "policies. When team norms and handbook language conflict, the handbook governs "
                "unless HR publishes an explicit exception.",
                "How to Use This Document",
                "Policies are organized by chapter. Section numbers (for example §3.2) are stable "
                "references for HR tickets, audits, and internal search. Always cite the section "
                "number when escalating a question.",
                "Table of Contents — 1 Introduction · 3 Workplace · 5 Time Off · 6 Benefits · "
                "7 Equipment · 8 Security · 9 Family Leave · 11 Conduct",
                "Document Control: Version 2024.1 · Last updated December 15, 2023 · Owner: People "
                "Operations · Classification: Internal. Printed copies are uncontrolled; refer to "
                "the intranet for the latest version.",
            )
        ),
        3: PageSpec(
            blocks=[
                SectionBlock(
                    "1.1",
                    "Welcome",
                    _p(
                        "This handbook applies to all full-time and part-time employees. Policies "
                        "are effective January 1, 2024 unless otherwise noted. HR publishes updates "
                        "on the intranet; employees are responsible for reviewing changes within "
                        "30 days of notification.",
                        "Northstar Labs is an equal-opportunity employer. We hire, promote, and "
                        "compensate based on qualifications, performance, and business need without "
                        "regard to protected characteristics under applicable law.",
                        "Offer letters describe role, compensation, equity (if any), and probation "
                        "terms. This handbook supplements but does not replace individual agreements. "
                        "If your offer letter conflicts with a general policy, contact People Operations.",
                        "Probation periods are typically six months for new hires. Performance "
                        "check-ins occur at 30, 90, and 180 days unless your manager schedules "
                        "additional reviews. Successful completion of probation is required before "
                        "certain benefits (for example internal transfer priority) take effect.",
                    ),
                )
            ]
        ),
        4: PageSpec(
            blocks=_p(
                "Chapter 2 — Employment Basics (continued)",
                "Work authorization must remain valid for the duration of employment. Notify HR "
                "within five business days of any change to visa or permit status. Managers must "
                "not employ individuals who are not authorized to work in their assigned location.",
                "Employment classifications (full-time, part-time, contractor) determine benefit "
                "eligibility. Contractors and vendors are not covered by this handbook unless a "
                "separate statement of work explicitly incorporates these policies.",
                "Chapter 3 — Workplace & Attendance (overview)",
                "This chapter covers office attendance, remote work, and collaboration norms. Hybrid "
                "and fully remote roles have different requirements — see §3.1 and §3.2. Team leads "
                "document core hours and on-call rotations in team playbooks compatible with these rules.",
                "Office facilities are available Monday through Friday except on company holidays. "
                "Badge access is personal and must not be shared. Report lost badges to Security "
                "within 24 hours.",
            )
        ),
        5: PageSpec(
            blocks=_p(
                "Chapter 4 — Collaboration Norms",
                "Use the company calendar for PTO visibility and respect focus-time blocks. Async "
                "updates in Slack or email are preferred when colleagues are in different time zones. "
                "Default to written summaries after meetings that produce decisions affecting customers "
                "or cross-team commitments.",
                "Meeting hygiene: agendas required for meetings longer than 30 minutes; optional "
                "attendees may decline without penalty. Recordings are for internal use only and "
                "must not be shared externally without Legal approval.",
                "Travel between offices follows the expense policy in §6.3. Pre-approval is required "
                "for international travel and for domestic trips estimated above EUR 500.",
            )
        ),
        6: PageSpec(
            blocks=[
                SectionBlock(
                    "3.1",
                    "Office Attendance",
                    _p(
                        "All hybrid employees are expected in the office at least 2 days per week "
                        "unless an approved remote-work exception applies. Team leads may set stricter "
                        "team norms when customer or lab requirements demand it.",
                        "Failure to meet attendance expectations may trigger a performance review. "
                        "Repeated unapproved absences from the office are treated as a conduct issue. "
                        "Employees with medical or caregiving accommodations should work with HR on "
                        "documented flexible arrangements.",
                        "Desk hoteling applies in Berlin and Munich offices. Reserve space through "
                        "the workplace app before 5 PM the prior business day. Personal items left "
                        "overnight may be removed during cleaning.",
                    ),
                )
            ]
        ),
        7: PageSpec(
            blocks=_p(
                "Workplace Health & Safety",
                "Report hazards to facilities@northstarlabs.example. Emergency exits and assembly "
                "points are posted on each floor. Fire drills are mandatory; participation is tracked.",
                "Ergonomic assessments are available for office and home setups. Submit a request "
                "through the HR portal; approved items may be expensed per §6.3 up to published limits.",
                "Visitors must sign in at reception and wear visible badges. Employees hosting visitors "
                "are responsible for escorting them and ensuring NDA execution when required.",
            )
        ),
        8: PageSpec(
            blocks=_p(
                "Remote Collaboration Standards",
                "Video is encouraged for 1:1s and small group working sessions. Camera-off is "
                "acceptable for large forums and when bandwidth is limited. Use company-approved "
                "conferencing tools only; do not record customer calls without consent.",
                "Response-time expectations: Slack within 4 business hours; email within 1 business "
                "day unless marked urgent. On-call engineers follow the paging policy in the "
                "Engineering wiki.",
            )
        ),
        9: PageSpec(
            blocks=_p(
                "Chapter 5 — Time Off (overview)",
                "Paid time off and sick leave policies are detailed on pages 13–14. Submit requests "
                "through Workday unless your region uses a local payroll provider.",
                "Public holidays follow the official calendar for your work location. Floating "
                "holidays may be available in certain regions — see your offer letter or HR portal.",
                "Extended leave beyond PTO (sabbatical, unpaid leave) requires VP approval and HR "
                "planning at least 8 weeks in advance. Benefits continuity during unpaid leave "
                "requires separate enrollment paperwork.",
            )
        ),
        10: PageSpec(
            blocks=_p(
                "Leave Coordination",
                "Managers must maintain team coverage plans for absences longer than three consecutive "
                "days. Hand off open customer issues and document in-flight work in the team tracker.",
                "Company shutdown days (typically between Christmas and New Year) may require use of "
                "PTO in some regions. HR announces shutdown schedules by October 1 each year.",
            )
        ),
        11: PageSpec(
            blocks=_p(
                "Preparing for §3.2 Remote Work",
                "Hybrid and remote arrangements share core collaboration hours but differ on monthly "
                "remote-day caps and approval workflows. Read §3.1 together with §3.2 before submitting "
                "requests in the HR portal.",
                "International remote work (working from a country other than your assigned entity) "
                "requires Legal and Tax review at least 6 weeks in advance and is not guaranteed.",
            )
        ),
        12: PageSpec(
            blocks=[
                SectionBlock(
                    "3.2",
                    "Remote Work",
                    _p(
                        "The following table summarizes remote work limits by arrangement. Hybrid "
                        "employees must also comply with §3.1 office attendance.",
                    ),
                ),
                TableBlock(
                    headers=[
                        "Arrangement",
                        "Remote days / month",
                        "Advance notice",
                        "Core hours (local)",
                    ],
                    rows=[
                        ["Hybrid", "3", "5 business days (HR portal)", "10:00-15:00"],
                        [
                            "Fully remote",
                            "Exempt from monthly cap",
                            "As agreed with manager",
                            "10:00-15:00",
                        ],
                    ],
                    col_widths=[32, 38, 52, 38],
                ),
                SectionBlock(
                    "3.2",
                    "Remote Work",
                    _p(
                        "Hybrid employees may work remotely up to 3 days per calendar month, with "
                        "manager approval required. Requests must be submitted at least 5 business "
                        "days in advance via the HR portal.",
                        "Fully remote roles are exempt from the monthly day cap but must maintain "
                        "core collaboration hours (10:00-15:00 local time). Temporary relocation "
                        "during remote work must stay within approved tax jurisdictions.",
                        "Equipment and connectivity for remote work follow §7.2. The company does "
                        "not reimburse coworking memberships unless pre-approved for roles without "
                        "a suitable home workspace.",
                    ),
                ),
            ]
        ),
        13: PageSpec(
            blocks=_p(
                "Chapter 5 — Time Off (overview)",
                "Submit PTO and sick requests through Workday unless your region uses a local payroll "
                "provider. Managers should approve or decline within 2 business days.",
            )
            + [
                SectionBlock(
                    "5.1",
                    "Paid Time Off",
                    _p(
                        "Full-time employees accrue 20 PTO days per year. PTO requests require "
                        "manager approval in Workday at least 2 weeks before start date for trips "
                        "longer than 5 consecutive days.",
                        "Unused PTO above 5 days rolls over to the next calendar year, capped at "
                        "10 days. Payout of unused PTO at termination follows local law and your "
                        "employment agreement.",
                        "Part-time employees accrue PTO pro rata based on scheduled hours. PTO "
                        "cannot be borrowed against future accrual except with HR exception for "
                        "documented emergencies.",
                        "Blackout periods may apply for revenue-critical teams; HR publishes these "
                        "by November for the following calendar year. PTO booked before a blackout "
                        "announcement is grandfathered unless business continuity requires rescheduling.",
                    ),
                )
            ]
        ),
        14: PageSpec(
            blocks=[
                SectionBlock(
                    "5.2",
                    "Sick Leave",
                    _p(
                        "Employees receive 10 paid sick days per year. Sick leave does not require "
                        "advance approval; notify your manager before 9:30 AM on the first day absent.",
                        "A doctor's note is required for absences longer than 3 consecutive days. "
                        "Sick leave may not be used for vacation purposes. Patterns of Monday/Friday "
                        "absences may trigger a good-faith inquiry from HR.",
                        "Caregiver leave for ill family members may use sick balance where local law "
                        "permits; otherwise apply for unpaid leave or PTO per regional guidance.",
                        "Public holidays follow the official calendar for your work location. Floating "
                        "holidays may be available in certain regions — see your offer letter or HR portal.",
                    ),
                )
            ]
        ),
        15: PageSpec(
            blocks=_p(
                "Extended Leave & Sabbatical",
                "Extended leave beyond PTO (sabbatical, unpaid leave) requires VP approval and HR "
                "planning at least 8 weeks in advance. Benefits continuity during unpaid leave "
                "requires separate enrollment paperwork.",
                "Corporate card holders must reconcile transactions weekly. Personal purchases on "
                "company cards are prohibited and may result in payroll deduction or termination.",
                "Learning and conference budgets require manager approval and must align with role "
                "development plans. Conference travel follows §6.3 pre-approval thresholds.",
            )
        ),
        16: PageSpec(
            blocks=_p(
                "Chapter 6 — Benefits & Expenses (overview)",
                "Keep receipts and submit claims within 30 days. Wellness stipends and learning "
                "budgets are described on the intranet and are separate from §6.3 reimbursements.",
            )
            + [
                SectionBlock(
                    "6.1",
                    "Health Benefits",
                    _p(
                        "Medical, dental, and vision coverage begins on the first day of the month "
                        "after your start date. Open enrollment is each November for changes effective "
                        "January 1.",
                        "Dependents must be enrolled within 30 days of a qualifying life event. "
                        "Domestic partner coverage requires submitted documentation per carrier rules.",
                        "Northstar Labs contributes a fixed percentage of premium costs; employee "
                        "contributions are payroll-deducted pre-tax where permitted. COBRA or local "
                        "equivalent notices are issued within statutory timelines upon separation.",
                        "Flexible spending and health savings arrangements vary by country; see the "
                        "benefits portal for eligible expenses and submission deadlines.",
                    ),
                )
            ]
        ),
        17: PageSpec(
            blocks=[
                SectionBlock(
                    "6.3",
                    "Expense Reimbursement",
                    _p(
                        "Submit expenses within 30 days via Concur with receipts. Home office "
                        "stipend: up to EUR 50/month for internet when working remotely.",
                        "Travel must be pre-approved for amounts over EUR 500. Mileage is reimbursed "
                        "at the published IRS or local rate depending on entity. Alcohol is reimbursable "
                        "only for approved customer entertainment within per-head limits.",
                        "Gifts to customers or partners require pre-approval from your manager and "
                        "must comply with the ethics rules in §11.2.",
                    ),
                )
            ]
        ),
        18: PageSpec(
            blocks=_p(
                "Chapter 7 — Equipment (overview)",
                "Report lost or stolen devices to IT within 24 hours. Asset tags must remain visible "
                "on company hardware at all times.",
            )
            + [
                SectionBlock(
                    "7.2",
                    "Equipment",
                    _p(
                        "Remote employees receive a laptop, monitor, and EUR 200 home-office setup "
                        "allowance once per role. Equipment remains company property.",
                        "Return all hardware within 5 business days of offboarding. Failure to return "
                        "equipment may delay final pay processing and trigger asset recovery procedures.",
                        "Software licenses are assigned through SSO groups. Do not install unapproved "
                        "productivity tools that sync company data to personal accounts. BYOD is not "
                        "supported for roles handling customer data.",
                        "Monitors and peripherals purchased with the home-office allowance become "
                        "company property when reimbursed; retain receipts for audit.",
                    ),
                )
            ]
        ),
        19: PageSpec(
            blocks=[
                SectionBlock(
                    "8.1",
                    "IT Security",
                    _p(
                        "Company laptops must use full-disk encryption and MFA on all SSO apps. Do not "
                        "store customer PII on personal devices.",
                        "Report suspected phishing to security@ within 1 hour. VPN is required when "
                        "accessing internal systems from public networks. Complete annual security "
                        "training by March 31 each year.",
                        "Incident response playbooks are on the security wiki. When unsure, escalate "
                        "to security@northstarlabs.example rather than investigating alone. Lost or "
                        "stolen devices must be reported to IT within 24 hours.",
                    ),
                )
            ]
        ),
        20: PageSpec(
            blocks=[
                SectionBlock(
                    "9.1",
                    "Parental Leave",
                    _p(
                        "Primary caregivers receive 16 weeks paid parental leave. Secondary caregivers "
                        "receive 6 weeks. Leave must be taken within 12 months of birth or adoption "
                        "placement.",
                        "Coordinate return dates with HR at least 4 weeks before end of leave. Benefits "
                        "continuation during leave follows carrier rules; HR provides enrollment packets "
                        "at leave start.",
                        "Parental leave runs concurrently with statutory leave where applicable. "
                        "Employees planning adoption or surrogacy should contact HR early for "
                        "jurisdiction-specific guidance.",
                    ),
                )
            ]
        ),
        21: PageSpec(
            blocks=_p(
                "Chapter 10 — Performance & Development",
                "Annual review cycles run in Q1. Goals should align with team OKRs and company values. "
                "Calibration sessions ensure consistent ratings across departments.",
                "Internal mobility is encouraged. Discuss transfer interest with your manager and HR "
                "before applying to open roles. A minimum of 12 months in role is expected unless "
                "reorg or business need dictates otherwise.",
                "Chapter 11 — Conduct & Ethics (overview)",
                "The code of conduct on page 22 defines non-negotiable behavior standards. Speak up "
                "early if you witness violations. Conflicts of interest must be disclosed to HR and "
                "your manager.",
            )
        ),
        22: PageSpec(
            blocks=[
                SectionBlock(
                    "11.2",
                    "Code of Conduct",
                    _p(
                        "Harassment, discrimination, and retaliation are prohibited. Report concerns to "
                        "HR@ or the anonymous ethics hotline. All reports are investigated within 10 "
                        "business days.",
                        "Retaliation against reporters is grounds for termination. Social media "
                        "guidelines prohibit sharing confidential information or speaking on behalf "
                        "of the company without communications approval.",
                        "Gifts from vendors above EUR 50 aggregate per year require approval. "
                        "Whistleblower protections apply to good-faith reports.",
                    ),
                ),
                "Appendix A — Contacts",
                "People Operations: people@northstarlabs.example · IT Helpdesk: helpdesk@northstarlabs.example · "
                "Security: security@northstarlabs.example · Ethics hotline: ethics@northstarlabs.example "
                "(anonymous option available)",
            ]
        ),
    }


class HandbookPDF(FPDF):
    def header(self) -> None:
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(100, 100, 100)
        self.cell(0, 6, f"{COMPANY} · {TITLE} · {EDITION}", align="L")
        self.ln(8)

    def footer(self) -> None:
        if self.page_no() == 1:
            return
        self.set_y(-12)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(100, 100, 100)
        self.cell(0, 8, f"Page {self.page_no()}", align="C")


def sanitize(text: str) -> str:
    return (
        text.replace("\u2014", " - ")
        .replace("\u2013", "-")
        .replace("\u201c", '"')
        .replace("\u201d", '"')
        .replace("\u2019", "'")
        .replace("€", "EUR ")
    )


def write_paragraphs(
    pdf: HandbookPDF,
    paragraphs: list[str],
    *,
    title: str | None = None,
    compact: bool = True,
) -> None:
    body_size = 10 if compact else 11
    body_leading = 5 if compact else 6
    gap = 2 if compact else 3

    if title:
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(20, 20, 20)
        pdf.multi_cell(0, 6, sanitize(title))
        pdf.ln(2)

    pdf.set_font("Helvetica", "", body_size)
    pdf.set_text_color(30, 30, 30)
    for para in paragraphs:
        para = sanitize(para)
        if para.endswith(":"):
            pdf.set_font("Helvetica", "B", 11)
            pdf.multi_cell(0, 5.5, para)
            pdf.set_font("Helvetica", "", body_size)
        else:
            pdf.multi_cell(0, body_leading, para)
        pdf.ln(gap)


def write_table(
    pdf: HandbookPDF,
    headers: list[str],
    rows: list[list[str]],
    col_widths: list[float],
) -> None:
    line_h = 6
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(230, 236, 245)
    pdf.set_text_color(20, 20, 20)
    for i, header in enumerate(headers):
        pdf.cell(col_widths[i], line_h, sanitize(header), border=1, align="C", fill=True)
    pdf.ln(line_h)

    pdf.set_font("Helvetica", "", 9)
    pdf.set_fill_color(255, 255, 255)
    for row in rows:
        cell_lines = []
        max_lines = 1
        for i, cell in enumerate(row):
            text = sanitize(cell)
            lines = pdf.multi_cell(
                col_widths[i],
                line_h,
                text,
                border=0,
                align="L",
                dry_run=True,
                output="LINES",
            )
            cell_lines.append(lines)
            max_lines = max(max_lines, len(lines))
        row_h = line_h * max_lines

        x0, y0 = pdf.get_x(), pdf.get_y()
        x = x0
        for i, lines in enumerate(cell_lines):
            pdf.set_xy(x, y0)
            pdf.multi_cell(
                col_widths[i],
                line_h,
                "\n".join(lines),
                border=1,
                align="L",
            )
            x += col_widths[i]
        pdf.set_xy(x0, y0 + row_h)
    pdf.ln(3)


def write_page(pdf: HandbookPDF, spec: PageSpec) -> None:
    section_titles_written: set[tuple[str, str]] = set()

    for block in spec.blocks:
        if isinstance(block, str):
            if block.endswith(":") or block.startswith("Chapter ") or block.startswith("Appendix"):
                write_paragraphs(pdf, [block])
            else:
                write_paragraphs(pdf, [block])
            continue

        if isinstance(block, TableBlock):
            write_table(pdf, block.headers, block.rows, block.col_widths)
            continue

        if isinstance(block, SectionBlock):
            key = (block.section_id, block.section)
            title = f"§{block.section_id} {block.section}"
            if key not in section_titles_written:
                section_titles_written.add(key)
                write_paragraphs(pdf, block.paragraphs, title=title)
            else:
                write_paragraphs(pdf, block.paragraphs)


def write_cover(pdf: HandbookPDF) -> None:
    pdf.add_page()
    pdf.ln(45)
    pdf.set_font("Helvetica", "B", 26)
    pdf.set_text_color(25, 55, 95)
    pdf.multi_cell(0, 11, TITLE, align="C")
    pdf.ln(6)
    pdf.set_font("Helvetica", "", 15)
    pdf.set_text_color(60, 60, 60)
    pdf.multi_cell(0, 9, COMPANY, align="C")
    pdf.ln(5)
    pdf.set_font("Helvetica", "I", 12)
    pdf.multi_cell(0, 7, EDITION, align="C")
    pdf.ln(16)
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(0, 6, EFFECTIVE, align="C")
    pdf.ln(24)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(100, 100, 100)
    pdf.multi_cell(
        0,
        5,
        "Internal use only · Workshop demo document · Not a binding employment contract",
        align="C",
    )


def sync_corpus_pages() -> None:
    """Keep handbook-corpus.json page numbers aligned with compact layout."""
    page_by_id = {
        "handbook-p7-welcome": 3,
        "handbook-p11-office-attendance": 6,
        "handbook-p12-remote-work": 12,
        "handbook-p12-bad-parse-decoy": 12,
        "handbook-p18-pto": 13,
        "handbook-p19-sick-leave": 14,
        "handbook-p22-benefits": 16,
        "handbook-p24-expenses": 17,
        "handbook-p28-equipment": 18,
        "handbook-p31-security": 19,
        "handbook-p33-parental-leave": 20,
        "handbook-p40-conduct": 22,
    }
    data = json.loads(CORPUS_PATH.read_text(encoding="utf-8"))
    for chunk in data["chunks"]:
        if chunk["id"] in page_by_id:
            chunk["page"] = page_by_id[chunk["id"]]
    CORPUS_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> None:
    sync_corpus_pages()
    pages = build_pages()

    pdf = HandbookPDF()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.set_margins(22, 18, 22)

    write_cover(pdf)

    for page_num in range(2, TOTAL_PAGES + 1):
        pdf.add_page()
        write_page(pdf, pages[page_num])

    pdf.output(str(OUTPUT_PATH))
    print(f"Wrote {OUTPUT_PATH} ({TOTAL_PAGES} pages)")


if __name__ == "__main__":
    main()
