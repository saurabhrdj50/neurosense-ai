"""
Report Generator Module
Produces a downloadable PDF clinical summary report using reportlab.
"""

from __future__ import annotations

import io
import logging
from datetime import datetime
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.colors import HexColor, black, white
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        HRFlowable,
    )
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False
    logger.warning("reportlab not installed — PDF generation disabled.")


class ReportGenerator:
    """Generate a PDF report from analysis results."""

    ACCENT = '#6c8cff'
    GREEN = '#22c55e'
    YELLOW = '#eab308'
    ORANGE = '#f97316'
    RED = '#ef4444'

    def __init__(self) -> None:
        if not REPORTLAB_AVAILABLE:
            logger.warning("reportlab unavailable. Install via: pip install reportlab>=4.0.0")

    def generate(self, results: Dict[str, Any], patient_info: Optional[Dict[str, Any]] = None) -> Optional[bytes]:
        """Generate a PDF report."""
        if not REPORTLAB_AVAILABLE:
            return None

        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=A4,
            topMargin=20 * mm,
            bottomMargin=20 * mm,
            leftMargin=20 * mm,
            rightMargin=20 * mm,
        )

        styles = getSampleStyleSheet()

        styles.add(ParagraphStyle(
            'ReportTitle', parent=styles['Title'],
            fontSize=22, textColor=HexColor(self.ACCENT),
            spaceAfter=4,
        ))
        styles.add(ParagraphStyle(
            'SectionHead', parent=styles['Heading2'],
            fontSize=14, textColor=HexColor(self.ACCENT),
            spaceBefore=16, spaceAfter=8,
            borderWidth=0,
        ))
        styles.add(ParagraphStyle(
            'SubHead', parent=styles['Heading3'],
            fontSize=11, textColor=HexColor('#333333'),
            spaceBefore=8, spaceAfter=4,
        ))
        styles.add(ParagraphStyle(
            'BodySmall', parent=styles['BodyText'],
            fontSize=9.5, leading=14,
        ))
        styles.add(ParagraphStyle(
            'Disclaimer', parent=styles['BodyText'],
            fontSize=8, textColor=HexColor('#888888'),
            alignment=TA_CENTER, spaceBefore=12,
        ))
        styles.add(ParagraphStyle(
            'CenterBold', parent=styles['Normal'],
            fontSize=10, alignment=TA_CENTER,
            textColor=HexColor('#555555'),
        ))

        elements = []

        elements.append(Paragraph('NeuroSense — Clinical Report', styles['ReportTitle']))
        elements.append(Paragraph(
            'AI-Based Multimodal Early Detection and Staging of Alzheimer\'s Disease',
            styles['CenterBold'],
        ))
        elements.append(Spacer(1, 4 * mm))
        elements.append(HRFlowable(
            width='100%', thickness=1.5,
            color=HexColor(self.ACCENT), spaceAfter=6 * mm,
        ))

        info = patient_info or {}
        now = datetime.now().strftime('%B %d, %Y at %H:%M')
        info_data = [
            ['Patient Name:', info.get('name', 'Anonymous'),
             'Report Date:', now],
            ['Age:', str(info.get('age', '—')),
             'Sex:', info.get('sex', '—')],
            ['Patient ID:', info.get('patient_id', '—'),
             'Report ID:', f"NS-{datetime.now().strftime('%Y%m%d%H%M%S')}"],
        ]
        t = Table(info_data, colWidths=[80, 130, 80, 130])
        t.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0, 0), (0, -1), HexColor('#555')),
            ('TEXTCOLOR', (2, 0), (2, -1), HexColor('#555')),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 4 * mm))

        mri = results.get('mri')
        if mri:
            elements.append(Paragraph('1. MRI Classification Results', styles['SectionHead']))

            stage_color = mri.get('color', self.ACCENT)
            elements.append(Paragraph(
                f"<b>Detected Stage:</b> "
                f"<font color='{stage_color}'><b>{mri.get('stage', '—')}</b></font> "
                f"({mri.get('label', '')})",
                styles['BodySmall'],
            ))
            elements.append(Paragraph(
                f"<b>Confidence:</b> {mri.get('confidence', 0):.1f}%",
                styles['BodySmall'],
            ))
            elements.append(Paragraph(
                f"<b>Description:</b> {mri.get('description', '')}",
                styles['BodySmall'],
            ))
            elements.append(Spacer(1, 2 * mm))

            probs = mri.get('probabilities', {})
            if probs:
                elements.append(Paragraph('Stage Probabilities', styles['SubHead']))
                prob_data = [['Stage', 'Probability']]
                for stage_name, pct in probs.items():
                    prob_data.append([stage_name, f'{pct}%'])
                pt = Table(prob_data, colWidths=[200, 100])
                pt.setStyle(TableStyle([
                    ('FONTSIZE', (0, 0), (-1, -1), 9),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('BACKGROUND', (0, 0), (-1, 0), HexColor('#f0f4ff')),
                    ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#ddd')),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                    ('TOPPADDING', (0, 0), (-1, -1), 4),
                ]))
                elements.append(pt)

            recs = mri.get('recommendations', [])
            if recs:
                elements.append(Spacer(1, 2 * mm))
                elements.append(Paragraph('Recommendations', styles['SubHead']))
                for r in recs:
                    elements.append(Paragraph(f'• {r}', styles['BodySmall']))

        cog = results.get('cognitive')
        if cog and cog.get('tests_completed', 0) > 0:
            elements.append(Paragraph('2. Cognitive Assessment', styles['SectionHead']))
            elements.append(Paragraph(
                f"<b>Composite Score:</b> "
                f"<font color='{cog.get('risk_color', self.ACCENT)}'>"
                f"<b>{cog.get('composite_score', 0)}/100</b></font> "
                f"— {cog.get('risk_label', '')}",
                styles['BodySmall'],
            ))
            elements.append(Paragraph(
                f"Tests completed: {cog.get('tests_completed', 0)}/{cog.get('tests_total', 5)}",
                styles['BodySmall'],
            ))
            elements.append(Spacer(1, 2 * mm))

            test_data = [['Test', 'Score', 'Max', '%', 'Interpretation']]
            for tk, tv in cog.get('test_results', {}).items():
                test_data.append([
                    tv.get('name', tk),
                    str(tv.get('raw_score', '—')),
                    str(tv.get('max_score', '—')),
                    f"{tv.get('percentage', 0)}%",
                    tv.get('interpretation', '—'),
                ])
            if len(test_data) > 1:
                ct = Table(test_data, colWidths=[100, 50, 40, 50, 130])
                ct.setStyle(TableStyle([
                    ('FONTSIZE', (0, 0), (-1, -1), 8.5),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('BACKGROUND', (0, 0), (-1, 0), HexColor('#f0f4ff')),
                    ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#ddd')),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                    ('TOPPADDING', (0, 0), (-1, -1), 3),
                ]))
                elements.append(ct)

        sent = results.get('sentiment')
        if sent:
            elements.append(Paragraph('3. Sentiment & Cognitive Linguistic Analysis', styles['SectionHead']))
            elements.append(Paragraph(
                f"<b>Sentiment:</b> {sent.get('sentiment_label', '—')} "
                f"(score: {sent.get('sentiment_score', 0)}/100)",
                styles['BodySmall'],
            ))
            elements.append(Paragraph(
                f"<b>Dominant Emotion:</b> {sent.get('dominant_emotion', '—')}",
                styles['BodySmall'],
            ))
            elements.append(Paragraph(
                f"<b>Cognitive Risk Score:</b> "
                f"<font color='{sent.get('cognitive_risk_color', self.ACCENT)}'>"
                f"<b>{sent.get('cognitive_risk_score', 0)}/100</b></font> "
                f"— {sent.get('cognitive_risk_label', '')}",
                styles['BodySmall'],
            ))

            insights = sent.get('insights', [])
            if insights:
                elements.append(Spacer(1, 2 * mm))
                elements.append(Paragraph('Key Insights', styles['SubHead']))
                for ins in insights:
                    elements.append(Paragraph(f'• {ins}', styles['BodySmall']))

        risk = results.get('risk_profile')
        if risk and risk.get('factors_assessed', 0) > 0:
            elements.append(Paragraph('4. Risk Factor Profile', styles['SectionHead']))
            elements.append(Paragraph(
                f"<b>Overall Risk Score:</b> "
                f"<font color='{risk.get('risk_color', self.ACCENT)}'>"
                f"<b>{risk.get('overall_risk_score', 0)}/100</b></font> "
                f"— {risk.get('risk_label', '')}",
                styles['BodySmall'],
            ))
            elements.append(Paragraph(
                f"<b>Modifiable Risk:</b> {risk.get('modifiable_risk', 0)}/100 | "
                f"<b>Non-modifiable:</b> {risk.get('non_modifiable_risk', 0)}/100",
                styles['BodySmall'],
            ))

            cat_scores = risk.get('category_scores', {})
            if cat_scores:
                elements.append(Spacer(1, 2 * mm))
                cat_data = [['Category', 'Risk Score']]
                for cat, score in cat_scores.items():
                    cat_data.append([cat, f'{score}/100'])
                cst = Table(cat_data, colWidths=[180, 100])
                cst.setStyle(TableStyle([
                    ('FONTSIZE', (0, 0), (-1, -1), 9),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('BACKGROUND', (0, 0), (-1, 0), HexColor('#f0f4ff')),
                    ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#ddd')),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                    ('TOPPADDING', (0, 0), (-1, -1), 3),
                ]))
                elements.append(cst)

            prev_recs = risk.get('prevention_recommendations', [])
            if prev_recs:
                elements.append(Spacer(1, 2 * mm))
                elements.append(Paragraph('Prevention Recommendations', styles['SubHead']))
                for r in prev_recs:
                    elements.append(Paragraph(f'• {r}', styles['BodySmall']))

        fusion = results.get('final_stage')
        if fusion:
            elements.append(Paragraph('5. Multimodal Fusion Result', styles['SectionHead']))
            elements.append(Paragraph(
                f"<b>Final Stage:</b> "
                f"<b>{fusion.get('stage', '—')}</b> "
                f"(Confidence: {fusion.get('confidence', 0)}%)",
                styles['BodySmall'],
            ))
            elements.append(Paragraph(
                f"<b>Method:</b> {fusion.get('method', '—')}",
                styles['BodySmall'],
            ))
            explanation = fusion.get('explanation', '')
            if explanation:
                elements.append(Paragraph(
                    f"<b>Explanation:</b> {explanation}",
                    styles['BodySmall'],
                ))

        music = results.get('music')
        if music:
            elements.append(Paragraph('6. Music Therapy Recommendation', styles['SectionHead']))
            elements.append(Paragraph(
                f"<b>{music.get('therapy_type', '')}</b> — {music.get('title', '')}",
                styles['BodySmall'],
            ))
            elements.append(Paragraph(
                music.get('description', ''),
                styles['BodySmall'],
            ))
            elements.append(Paragraph(
                f"Tempo: {music.get('tempo', '—')} | "
                f"Duration: {music.get('session_duration', '—')}",
                styles['BodySmall'],
            ))

        elements.append(Spacer(1, 10 * mm))
        elements.append(HRFlowable(width='100%', thickness=0.5, color=HexColor('#ccc')))
        elements.append(Paragraph(
            '<b>DISCLAIMER:</b> This report is generated by NeuroSense, an AI-based '
            'research prototype. It is NOT a substitute for professional medical diagnosis. '
            'Always consult a qualified neurologist for clinical decisions.',
            styles['Disclaimer'],
        ))
        elements.append(Paragraph(
            f'Generated on {now} | NeuroSense | '
            'KJ Somaiya Institute of Technology — Group 15',
            styles['Disclaimer'],
        ))

        doc.build(elements)
        return buf.getvalue()
