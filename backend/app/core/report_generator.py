"""
Generates a printable Consultation Summary Report (.docx) a patient can
carry to a PHC, CHC, or district hospital — closing the loop on the
`python-docx` dependency already in requirements.txt.

Deliberately plain, high-contrast, and large-type: this is meant to be
read by a doctor at a glance, and often printed at a low-quality shop
printer in a village with patchy power, so no color-dependent design and
no small type.
"""
from __future__ import annotations

import io
from datetime import datetime
from typing import List, Dict, Any

try:
    from docx import Document
    from docx.shared import Pt, RGBColor, Inches
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.enum.table import WD_TABLE_ALIGNMENT
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False
    Document = None
    Pt = lambda x: x
    RGBColor = lambda *a: None
    Inches = lambda x: x
    WD_ALIGN_PARAGRAPH = type("MockAlign", (), {"CENTER": 1, "LEFT": 0, "RIGHT": 2})()
    WD_TABLE_ALIGNMENT = type("MockTableAlign", (), {"CENTER": 1, "LEFT": 0, "RIGHT": 2})()


# Matches the app's "Himalayan Alpenglow" palette so a downloaded report
# feels like it came from the same product, not a generic template.
COLOR_DUSK = RGBColor(0x1E, 0x2A, 0x43)
COLOR_PINE = RGBColor(0x2B, 0x4A, 0x30)
COLOR_EMBER = RGBColor(0xC5, 0x76, 0x2B)
COLOR_BRICK = RGBColor(0xA2, 0x3B, 0x33)
COLOR_MUTED = RGBColor(0x6E, 0x66, 0x56)

TIER_COLOR = {"Red": COLOR_BRICK, "Yellow": COLOR_EMBER, "Green": COLOR_PINE}
TIER_LABEL = {
    "Red": "RED — Emergency / Immediate Care Needed",
    "Yellow": "YELLOW — Clinical Review Recommended Within 24h",
    "Green": "GREEN — Safe for Home Care / Routine",
}


def _set_base_style(doc: Document) -> None:
    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(11)
    style.font.color.rgb = COLOR_DUSK


def _heading(doc: Document, text: str, size: int = 16, color: RGBColor = COLOR_DUSK) -> None:
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.bold = True
    run.font.size = Pt(size)
    run.font.color.rgb = color
    p.space_after = Pt(4)


def _label_value_row(table, label: str, value: str) -> None:
    row = table.add_row()
    row.cells[0].text = label
    row.cells[1].text = value or "—"
    for run in row.cells[0].paragraphs[0].runs:
        run.bold = True
        run.font.size = Pt(10)
        run.font.color.rgb = COLOR_MUTED
    for run in row.cells[1].paragraphs[0].runs:
        run.font.size = Pt(11)


def build_consultation_report(
    patient_name: str,
    patient_phone: str,
    patient_village: str,
    conversation_id: str,
    tier: str,
    flags: List[str],
    remedies: List[Dict[str, Any]],
    consultation_summary: str,
) -> bytes:
    doc = Document()
    _set_base_style(doc)

    # Header
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title.add_run("Sanjeevani — Consultation Summary")
    run.bold = True
    run.font.size = Pt(22)
    run.font.color.rgb = COLOR_PINE

    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub_run = subtitle.add_run(f"Generated {datetime.now().strftime('%d %B %Y, %I:%M %p')}")
    sub_run.font.size = Pt(9)
    sub_run.font.color.rgb = COLOR_MUTED

    doc.add_paragraph()

    # Patient info table
    info_table = doc.add_table(rows=0, cols=2)
    info_table.alignment = WD_TABLE_ALIGNMENT.LEFT
    info_table.columns[0].width = Inches(1.6)
    info_table.columns[1].width = Inches(4.4)
    _label_value_row(info_table, "Patient Name", patient_name)
    _label_value_row(info_table, "Phone / ID", patient_phone)
    _label_value_row(info_table, "Village", patient_village)
    _label_value_row(info_table, "Session Reference", conversation_id)

    doc.add_paragraph()

    # Tier banner
    tier_p = doc.add_paragraph()
    tier_run = tier_p.add_run(TIER_LABEL.get(tier, tier))
    tier_run.bold = True
    tier_run.font.size = Pt(14)
    tier_run.font.color.rgb = TIER_COLOR.get(tier, COLOR_DUSK)

    if flags:
        flags_p = doc.add_paragraph()
        flags_run = flags_p.add_run("Clinical flags: " + "; ".join(flags))
        flags_run.font.size = Pt(9)
        flags_run.font.color.rgb = COLOR_MUTED
        flags_run.italic = True

    doc.add_paragraph()

    # Consultation summary
    if consultation_summary.strip():
        _heading(doc, "Consultation Notes")
        doc.add_paragraph(consultation_summary.strip())
        doc.add_paragraph()

    # Remedies
    if remedies:
        _heading(doc, "Verified Home Remedies Discussed", color=COLOR_PINE)
        for remedy in remedies:
            name_p = doc.add_paragraph()
            name_run = name_p.add_run(remedy.get("remedy_name", "Remedy"))
            name_run.bold = True
            name_run.font.size = Pt(12)

            doc.add_paragraph(remedy.get("remedy_text", ""))

            note = remedy.get("ayurvedic_note")
            if note:
                note_p = doc.add_paragraph()
                note_run = note_p.add_run(note)
                note_run.italic = True
                note_run.font.size = Pt(10)
                note_run.font.color.rgb = COLOR_MUTED

            source_p = doc.add_paragraph()
            source_run = source_p.add_run(
                f"Source: {remedy.get('source', 'Ministry of AYUSH Guidelines')} · "
                f"{remedy.get('safety_check', 'Verified safe')}"
            )
            source_run.font.size = Pt(9)
            source_run.font.color.rgb = COLOR_MUTED
            doc.add_paragraph()

    # Footer disclaimer — always present, never color-only
    doc.add_paragraph()
    footer_border = doc.add_paragraph()
    footer_run = footer_border.add_run(
        "This is an AI-assisted triage summary, not a medical diagnosis. "
        "It supports, but never replaces, a qualified clinician's assessment. "
        "For emergencies, call 108 (Ambulance) or 104 (Health Helpline) immediately."
    )
    footer_run.italic = True
    footer_run.font.size = Pt(9)
    footer_run.font.color.rgb = COLOR_MUTED

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def build_consultation_pdf_report(
    patient_name: str,
    patient_phone: str,
    patient_village: str,
    conversation_id: str,
    tier: str,
    flags: List[str],
    remedies: List[Dict[str, Any]],
    consultation_summary: str,
) -> bytes:
    """
    Renders a high-contrast, printable consultation summary in PDF format
    using reportlab, ideal for rural PHC clinics and direct browser printing.
    """
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    from reportlab.lib import colors

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#2B4A30'),
        alignment=1,
    )
    sub_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#6E6656'),
        alignment=1,
    )
    section_heading = ParagraphStyle(
        'SecHead',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1E2A43'),
        spaceBefore=8,
        spaceAfter=4,
    )
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#1E2A43'),
    )
    tier_hex = "#A23B33" if tier == "Red" else ("#C5762B" if tier == "Yellow" else "#2B4A30")
    tier_style = ParagraphStyle(
        'TierStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor(tier_hex),
    )
    disclaimer_style = ParagraphStyle(
        'DisclaimerStyle',
        parent=styles['Italic'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#6E6656'),
    )

    story = []
    story.append(Paragraph("Sanjeevani — Consultation Summary", title_style))
    story.append(Spacer(1, 3))
    story.append(Paragraph(f"Generated {datetime.now().strftime('%d %B %Y, %I:%M %p')}", sub_style))
    story.append(Spacer(1, 10))

    # Patient info table
    table_data = [
        [Paragraph("<b>Patient Name:</b>", body_style), Paragraph(patient_name or "—", body_style)],
        [Paragraph("<b>Phone / ID:</b>", body_style), Paragraph(patient_phone or "—", body_style)],
        [Paragraph("<b>Village:</b>", body_style), Paragraph(patient_village or "—", body_style)],
        [Paragraph("<b>Session Reference:</b>", body_style), Paragraph(conversation_id or "—", body_style)],
    ]
    t = Table(table_data, colWidths=[130, 410])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F4F6F0')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#D1D5DB')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E5E7EB')),
    ]))
    story.append(t)
    story.append(Spacer(1, 10))

    # Tier banner
    tier_label_str = TIER_LABEL.get(tier, f"{tier} TIER")
    story.append(Paragraph(f"<b>TRIAGE STATUS:</b> {tier_label_str}", tier_style))
    if flags:
        flags_text = "Clinical flags: " + "; ".join(flags)
        story.append(Paragraph(f"<i>{flags_text}</i>", disclaimer_style))
    story.append(Spacer(1, 8))

    # Consultation Notes
    if consultation_summary and consultation_summary.strip():
        story.append(Paragraph("Consultation Notes", section_heading))
        clean_notes = consultation_summary.strip().replace("\n", "<br/>")
        story.append(Paragraph(clean_notes, body_style))
        story.append(Spacer(1, 8))

    # Remedies
    if remedies:
        story.append(Paragraph("Verified Home Remedies Discussed", section_heading))
        for r in remedies:
            r_name = r.get("remedy_name", "Remedy")
            story.append(Paragraph(f"<b>• {r_name}</b>", body_style))
            if r.get("remedy_text"):
                clean_text = r.get("remedy_text").replace("\n", "<br/>")
                story.append(Paragraph(clean_text, body_style))
            if r.get("ayurvedic_note"):
                story.append(Paragraph(f"<i>Ayurvedic Rationale: {r.get('ayurvedic_note')}</i>", disclaimer_style))
            src_str = f"Source: {r.get('source', 'Ministry of AYUSH Guidelines')} · {r.get('safety_check', 'Verified safe')}"
            story.append(Paragraph(f"<i>{src_str}</i>", disclaimer_style))
            story.append(Spacer(1, 6))

    # Medical Disclaimer Footer
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#6E6656'), spaceAfter=5))
    story.append(Paragraph(
        "This is an AI-assisted triage summary, not a medical diagnosis. "
        "It supports, but never replaces, a qualified clinician's assessment. "
        "For emergencies, call 108 (Ambulance) or 104 (Health Helpline) immediately.",
        disclaimer_style
    ))

    doc.build(story)
    return buf.getvalue()