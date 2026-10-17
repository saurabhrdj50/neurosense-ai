"""
Enhanced Report Generator for Clinical Analysis.
Generates comprehensive 4-page PDF and HTML reports with clinical visualizations.
"""
import logging
import html as _html
import hashlib
import hmac as _hmac
import json as _json
from typing import Dict, Any, List
from datetime import datetime
from xml.sax.saxutils import escape as _xml_escape
import io

logger = logging.getLogger(__name__)

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    HAS_REPORTLAB = True
except ImportError:
    HAS_REPORTLAB = False
    logger.warning("ReportLab not installed. PDF reports will not be available.")


class ClinicalReportGenerator:
    """
    Generates comprehensive 4-page clinical reports for Alzheimer's assessment.

    Integrity note: reports are system-generated drafts. They carry an HMAC
    fingerprint of the result payload (tamper-evidence, not a signature) and
    are only attributed to a physician when the physician's name was actually
    supplied — no fictional attending is ever printed.
    """

    @staticmethod
    def _esc(value: Any) -> str:
        """Escape a patient-supplied value for ReportLab Paragraph markup."""
        return _xml_escape(str(value)) if value is not None else 'N/A'
    
    def __init__(self):
        self.styles = None
        if HAS_REPORTLAB:
            self._init_styles()
    
    def _init_styles(self):
        """Initialize report styles safely without duplicate errors."""
        self.styles = getSampleStyleSheet()
        
        # Helper to get/add styles safely
        self._get_style_safe('ReportTitle', 'Heading1', fontSize=22, textColor=colors.HexColor('#0f172a'), spaceAfter=15, alignment=TA_CENTER)
        self._get_style_safe('SectionTitle', 'Heading2', fontSize=14, textColor=colors.HexColor('#1e3a8a'), spaceBefore=12, spaceAfter=8, borderPadding=4)
        self._get_style_safe('SubSection', 'Heading3', fontSize=11, textColor=colors.HexColor('#334155'), spaceBefore=8, spaceAfter=4)
        
        if 'BodyText' in self.styles:
            self.styles['BodyText'].fontSize = 9
            self.styles['BodyText'].spaceBefore = 4
            self.styles['BodyText'].spaceAfter = 4
            self.styles['BodyText'].alignment = TA_LEFT
            self.styles['BodyText'].textColor = colors.HexColor('#1e293b')
        else:
            self._get_style_safe('BodyText', 'Normal', fontSize=9, spaceBefore=4, spaceAfter=4, alignment=TA_LEFT, textColor=colors.HexColor('#1e293b'))
            
        self._get_style_safe('Disclaimer', 'Normal', fontSize=8, textColor=colors.HexColor('#64748b'), spaceBefore=10, alignment=TA_CENTER)
        self._get_style_safe('CardTitle', 'Normal', fontSize=11, fontName='Helvetica-Bold', textColor=colors.white)
        self._get_style_safe('TableText', 'Normal', fontSize=8, textColor=colors.HexColor('#334155'))
        self._get_style_safe('TableTextBold', 'Normal', fontSize=8, fontName='Helvetica-Bold', textColor=colors.HexColor('#0f172a'))

    def _get_style_safe(self, name, parent_name, **kwargs):
        if name in self.styles:
            style = self.styles[name]
            for k, v in kwargs.items():
                setattr(style, k, v)
        else:
            style = ParagraphStyle(name, parent=self.styles[parent_name], **kwargs)
            self.styles.add(style)
        return style

    def generate_pdf_report(self, analysis_results: Dict[str, Any], 
                           patient_info: Dict[str, Any]) -> bytes:
        """
        Generate exactly 4-page PDF clinical report.
        """
        if not HAS_REPORTLAB:
            raise ImportError("ReportLab not installed")
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=0.5*inch,
            leftMargin=0.5*inch,
            topMargin=0.5*inch,
            bottomMargin=0.5*inch
        )
        
        story = []

        # ── PAGE 1: DEMOGRAPHICS, RISK TIER BOX & EXECUTIVE SUMMARY ─────────────────
        story.extend(self._build_header_section(patient_info))
        story.extend(self._build_stage_banner(analysis_results))
        story.extend(self._build_risk_summary_card(analysis_results, patient_info))
        story.extend(self._build_executive_summary_page1(analysis_results))
        story.extend(self._build_clinical_checklist_page1(analysis_results))
        story.append(PageBreak())
        
        # ── PAGE 2: MULTIMODAL DIAGNOSTIC BREAKDOWN ─────────────────────────────────
        story.extend(self._build_multimodal_breakdown_title())
        story.extend(self._build_multimodal_grid(analysis_results))
        story.append(PageBreak())
        
        # ── PAGE 3: RULE-BASED FUSION WEIGHTS ────────────────────────────────────
        story.extend(self._build_explainable_ai_heading())
        story.extend(self._build_fusion_weight_table(analysis_results))
        story.extend(self._build_confidence_indicators(analysis_results))
        story.append(PageBreak())
        
        # ── PAGE 4: GOVERNANCE, CLINICIAN NOTES & SECURE QR SIGNATURE ───────────────
        story.extend(self._build_governance_heading())
        story.extend(self._build_notes_and_references(patient_info))
        story.extend(self._build_signature_and_qrcode(analysis_results, patient_info))
        
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()
    
    def _build_header_section(self, patient_info: Dict) -> List:
        elements = []
        
        logo_data = [
            [
                Paragraph("<b>NEUROSENSE CLINICAL WORKSTATION</b><br/><font size=8 color='#64748b'>Professional Multi-Modal Assessment</font>", self.styles['Normal']),
                Paragraph("<font size=14 color='#1e3a8a'><b>CLINICAL DOSSIER</b></font>", ParagraphStyle('HRight', parent=self.styles['Normal'], alignment=TA_RIGHT))
            ]
        ]
        logo_table = Table(logo_data, colWidths=[4*inch, 3.5*inch])
        logo_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LINEBELOW', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        elements.append(logo_table)
        elements.append(Spacer(1, 8))
        
        report_date = datetime.now().strftime("%B %d, %Y")
        report_id = patient_info.get('report_id', 'NS-' + datetime.now().strftime('%Y%m%d%H%M'))
        
        demo_data = [
            [
                Paragraph("<b>Patient Name:</b>", self.styles['TableTextBold']),
                Paragraph(self._esc(patient_info.get('name', 'N/A')), self.styles['TableText']),
                Paragraph("<b>Report Date:</b>", self.styles['TableTextBold']),
                Paragraph(report_date, self.styles['TableText'])
            ],
            [
                Paragraph("<b>Patient ID:</b>", self.styles['TableTextBold']),
                Paragraph(self._esc(patient_info.get('patient_id', 'N/A')), self.styles['TableText']),
                Paragraph("<b>Report Spec ID:</b>", self.styles['TableTextBold']),
                Paragraph(report_id, self.styles['TableText'])
            ],
            [
                Paragraph("<b>Age / Sex:</b>", self.styles['TableTextBold']),
                Paragraph(f"{self._esc(patient_info.get('age', 'N/A'))} yrs / {self._esc(patient_info.get('sex', patient_info.get('gender', 'N/A')))}", self.styles['TableText']),
                Paragraph("<b>Education Years:</b>", self.styles['TableTextBold']),
                Paragraph(self._esc(patient_info.get('education_years', 'N/A')), self.styles['TableText'])
            ],
            [
                Paragraph("<b>Ref. Clinician:</b>", self.styles['TableTextBold']),
                Paragraph(self._esc(patient_info.get('physician') or 'Not attributed'), self.styles['TableText']),
                Paragraph("<b>Status:</b>", self.styles['TableTextBold']),
                Paragraph("System-Generated Draft", self.styles['TableText'])
            ],
        ]
        
        demo_table = Table(demo_data, colWidths=[1.5*inch, 2.25*inch, 1.5*inch, 2.25*inch])
        demo_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#f1f5f9')),
            ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#f8fafc')),
            ('BACKGROUND', (2,0), (2,-1), colors.HexColor('#f8fafc')),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ]))
        elements.append(demo_table)
        elements.append(Spacer(1, 10))
        return elements
        
    def _extract_stage_string(self, stage_input: Any) -> str:
        """Safely extract string representation from string, dict, or numeric stage object."""
        if not stage_input:
            return 'Unknown'
        if isinstance(stage_input, dict):
            return str(stage_input.get('stage', stage_input.get('stage_name', stage_input.get('risk_label', 'Unknown'))))
        return str(stage_input)

    # Stage colors mirror the frontend STAGES palette (ml/mri/stages.py).
    STAGE_BANNER_COLORS = {
        'Cognitively Normal (CN)': '#22c55e',
        'Mild Cognitive Impairment (MCI)': '#f59e0b',
        "Alzheimer's Disease (AD)": '#ef4444',
        # Legacy 4-stage labels from records created before the 3-stage
        # vocabulary reduction — kept so old PDFs still render correctly.
        'Non-Demented': '#22c55e',
        'Non Demented': '#22c55e',
        'Very Mild Demented': '#eab308',
        'Mild Demented': '#f97316',
        'Moderate Demented': '#ef4444',
        'Severe Demented': '#ef4444',
    }

    def _build_stage_banner(self, results: Dict) -> List:
        """Full-width, color-coded fused-stage banner directly under the header."""
        fusion = results.get('final_stage') or {}
        stage = self._extract_stage_string(fusion.get('stage'))
        confidence = fusion.get('confidence')
        hex_color = self.STAGE_BANNER_COLORS.get(stage, '#64748b')
        if not fusion.get('stage'):
            # No fusion verdict (nothing assessed): keep the banner quiet.
            return []

        conf_text = f"{float(confidence):.1f}% confidence" if confidence is not None else ""
        banner = Table(
            [[Paragraph(
                f"<b><font size=12 color='white'>Fused Assessment: {self._esc(stage)}</font></b>"
                + (f"  <font size=9 color='white'>· {conf_text}</font>" if conf_text else ""),
                ParagraphStyle('StageBanner', parent=self.styles['Normal'], alignment=TA_CENTER),
            )]],
            colWidths=[7.5 * inch],
        )
        banner.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(hex_color)),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        return [banner, Spacer(1, 8)]

    def _build_risk_summary_card(self, results: Dict, patient_info: Dict) -> List:
        elements = []
        raw_stage = results.get('final_stage', results.get('mri', {}).get('stage', 'Unknown'))
        stage = self._extract_stage_string(raw_stage)
        final_stage = results.get('final_stage') or {}
        confidence = final_stage.get('confidence') if isinstance(final_stage, dict) else None
        if confidence is None:
            confidence = results.get('mri', {}).get('confidence')
        confidence_text = f"{float(confidence):.1f}% (uncalibrated)" if confidence is not None else 'Not available'
        risk_text = "MODEL / HEURISTIC OUTPUT — NOT A DIAGNOSIS"
        bg_color = colors.HexColor('#f8fafc')
        border_color = colors.HexColor('#94a3b8')
        text_color = colors.HexColor('#334155')
            
        stage_style = ParagraphStyle('StageSty', parent=self.styles['Normal'], fontSize=16, fontName='Helvetica-Bold', textColor=text_color, alignment=TA_CENTER)
        lbl_style = ParagraphStyle('LblSty', parent=self.styles['Normal'], fontSize=9, textColor=text_color, alignment=TA_CENTER)
        
        card_contents = [
            [Paragraph(risk_text, lbl_style)],
            [Paragraph(f"BACKEND OUTPUT LABEL: {stage.upper()}", stage_style)],
            [Paragraph(f"Reported score: {confidence_text}", lbl_style)]
        ]
        
        card_table = Table(card_contents, colWidths=[7.5*inch])
        card_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), bg_color),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 10),
            ('BOTTOMPADDING', (0,0), (-1,-1), 10),
            ('BOX', (0,0), (-1,-1), 1.5, border_color),
        ]))
        
        elements.append(card_table)
        elements.append(Spacer(1, 10))
        return elements

    def _build_executive_summary_page1(self, results: Dict) -> List:
        elements = []
        elements.append(Paragraph("Clinical Executive Summary", self.styles['SectionTitle']))
        
        raw_stage = results.get('final_stage', results.get('mri', {}).get('stage', 'Unknown'))
        stage = self._extract_stage_string(raw_stage)
        final_stage = results.get('final_stage') or {}
        confidence = final_stage.get('confidence') if isinstance(final_stage, dict) else None
        if confidence is None:
            confidence = results.get('mri', {}).get('confidence')
        confidence_text = f"{float(confidence):.1f}%" if confidence is not None else 'not available'
        
        summary_text = (
            f"The backend returned the output label <b>{stage}</b> with a reported score of "
            f"<b>{confidence_text}</b>. The active workflow combines MRI classification, a rule-based "
            f"cognitive screening composite, and a rule-based risk-factor score when supplied. Speech "
            f"summaries are returned separately and do not enter the active fusion calculation. "
            f"The MRI checkpoint's training label mapping is unverified. This research output is not a diagnosis."
        )
        elements.append(Paragraph(summary_text, self.styles['BodyText']))
        elements.append(Spacer(1, 8))
        return elements

    def _build_clinical_checklist_page1(self, results: Dict) -> List:
        elements = []
        elements.append(Paragraph("Clinical Care & Support Checklist", self.styles['SubSection']))
        
        checklist = [
            ["[ ]", "Schedule neurological consult for diagnostic convergence validation."],
            ["[ ]", "Review the MRI classifier output against independently interpreted imaging."],
            ["[ ]", "Review the submitted risk-factor checklist; its score is a local heuristic, not a validated instrument."],
            ["[ ]", "Review item-level cognitive screening scores; MMSE/MoCA are not administered by this workflow."],
            ["[ ]", "Interpret speech summaries separately; they are not inputs to the active fusion calculation."]
        ]
        
        ch_data = []
        for box, task in checklist:
            ch_data.append([
                Paragraph(f"<b>{box}</b>", self.styles['TableTextBold']),
                Paragraph(task, self.styles['TableText'])
            ])
            
        chk_table = Table(ch_data, colWidths=[0.5*inch, 7.0*inch])
        chk_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor('#f1f5f9')),
        ]))
        elements.append(chk_table)
        
        note_text = (
            "<font size=7 color='#64748b'><b>Diagnostic Note:</b> The recommendations above are rule-based suggestions produced from the analysis outputs, not a clinical prescription. "
            "The clinician holds final responsibility for custom prescription adjustments.</font>"
        )
        elements.append(Spacer(1, 10))
        elements.append(Paragraph(note_text, self.styles['Normal']))
        return elements

    def _build_multimodal_breakdown_title(self) -> List:
        elements = []
        elements.append(Paragraph("Assessment Input Summary", self.styles['ReportTitle']))
        elements.append(Paragraph("Backend outputs for submitted modalities", self.styles['SectionTitle']))
        elements.append(Paragraph(
            "This report contains MRI classification, questionnaire scoring, optional speech summaries, "
            "and heuristic risk-factor outputs. It does not contain volumetric MRI or laboratory measurements.", self.styles['BodyText']
        ))
        elements.append(Spacer(1, 8))
        return elements

    def _build_multimodal_grid(self, results: Dict) -> List:
        elements = []
        
        mri = results.get('mri', {})
        if not isinstance(mri, dict):
            mri = {'stage': str(mri)}

        cog = results.get('cognitive', {})
        if not isinstance(cog, dict):
            cog = {'mmse': {'score': cog}}

        speech = results.get('sentiment', {})
        if not isinstance(speech, dict):
            speech = {'dominant_emotion': str(speech)}
        transcription = results.get('audio_transcription', {})
        if not isinstance(transcription, dict):
            transcription = {}
        transcript = transcription.get('text') or ''
        transcript_status = f"Transcript available ({len(transcript.split())} words)" if transcript else 'Not available'
        mri_confidence = mri.get('confidence')
        mri_confidence_text = f"{float(mri_confidence):.1f}%" if mri_confidence is not None else 'Not available'
        gradcam_status = 'Available' if mri.get('gradcam_image') or mri.get('gradcam_image_base64') else 'Not available'

        risk = results.get('risk_profile', {})

        # High Density Modality Grid Table for Available Modalities
        grid_data = [
            [
                Paragraph("<b>Diagnostic Modality</b>", self.styles['TableTextBold']),
                Paragraph("<b>Output</b>", self.styles['TableTextBold']),
                Paragraph("<b>Observed value</b>", self.styles['TableTextBold']),
                Paragraph("<b>Interpretation</b>", self.styles['TableTextBold'])
            ],
            # MRI
            [
                Paragraph("<b>1. Structural MRI</b>", self.styles['TableTextBold']),
                Paragraph("Backend-mapped class label<br/>Reported model score<br/>Grad-CAM image", self.styles['TableText']),
                Paragraph(f"{mri.get('stage', 'Not available')}<br/>{mri_confidence_text}<br/>{gradcam_status}", self.styles['TableText']),
                Paragraph("Training class mapping is unverified; no volumetric measurements or segmentation are produced.", self.styles['TableText'])
            ],
            # Cognitive
            [
                Paragraph("<b>2. Cognitive Assessment</b>", self.styles['TableTextBold']),
                Paragraph("Questionnaire composite<br/>Questions answered", self.styles['TableText']),
                Paragraph(f"{cog.get('composite_score', 'Not available')}/100<br/>{cog.get('questions_completed', 'Not available')} / {cog.get('total_questions', 'Not available')}", self.styles['TableText']),
                Paragraph("Rule-based screening score; not an MMSE/MoCA administration or diagnosis.", self.styles['TableText'])
            ],
            # Speech
            [
                Paragraph("<b>3. Phonetic Speech</b>", self.styles['TableTextBold']),
                Paragraph("Transcript", self.styles['TableText']),
                Paragraph(transcript_status, self.styles['TableText']),
                Paragraph(
                    f"Speech NLP research model: P(dementia)={float(transcription['dementia_probability']):.2f} (active fusion input)."
                    if transcription.get('dementia_probability') is not None
                    else "Speech transcript evaluated; acoustic & NLP markers extracted.",
                    self.styles['TableText']
                )
            ],
            # Clinical Risk
            [
                Paragraph("<b>4. Clinical Risk Profile</b>", self.styles['TableTextBold']),
                Paragraph("Rule-based factor score<br/>Factors selected", self.styles['TableText']),
                Paragraph(f"{risk.get('overall_risk_score', 'Not available')}/100<br/>{risk.get('factors_assessed', len(risk.get('contributing_factors', [])))}", self.styles['TableText']),
                Paragraph("Local heuristic; not a Lancet or Hachinski instrument.", self.styles['TableText'])
            ],
        ]
        
        grid_table = Table(grid_data, colWidths=[1.75*inch, 2.25*inch, 1.5*inch, 2.0*inch])
        grid_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e3a8a')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        
        elements.append(grid_table)
        elements.append(Spacer(1, 10))
        return elements

    def _build_explainable_ai_heading(self) -> List:
        elements = []
        elements.append(Paragraph("Rule-Based Fusion Weights", self.styles['ReportTitle']))
        elements.append(Paragraph("Modality weights returned by the fusion engine", self.styles['SectionTitle']))
        elements.append(Paragraph(
            "These are normalized modality weights, not SHAP values or feature-level explanations. "
            "They do not indicate clinical validity or calibrated importance.", self.styles['BodyText']
        ))
        elements.append(Spacer(1, 8))
        return elements

    def _build_fusion_weight_table(self, results: Dict) -> List:
        elements = []

        final_stage = results.get('final_stage') or {}
        contributions = final_stage.get('modality_contributions', {}) if isinstance(final_stage, dict) else {}
        table_data = [
            [
                Paragraph("<b>Modality</b>", self.styles['TableTextBold']),
                Paragraph("<b>Normalized fusion weight</b>", self.styles['TableTextBold']),
                Paragraph("<b>Meaning</b>", self.styles['TableTextBold'])
            ]
        ]
        for modality, weight in contributions.items():
            table_data.append([
                Paragraph(str(modality).title(), self.styles['TableText']),
                Paragraph(f"{float(weight):.1f}%", self.styles['TableTextBold']),
                Paragraph("Rule-based fusion weight, not feature attribution", self.styles['TableText']),
            ])
        if not contributions:
            table_data.append([
                Paragraph("No fusion data", self.styles['TableText']),
                Paragraph("Not available", self.styles['TableTextBold']),
                Paragraph("No modality contribution was returned", self.styles['TableText']),
            ])

        weights_table = Table(table_data, colWidths=[2.25*inch, 1.5*inch, 3.5*inch])
        weights_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0f172a')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
            ('TOPPADDING', (0,0), (-1,-1), 7),
            ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ]))
        
        elements.append(weights_table)
        elements.append(Spacer(1, 10))
        return elements

    def _build_confidence_indicators(self, results: Dict) -> List:
        elements = []
        elements.append(Paragraph("Reported fusion score (uncalibrated)", self.styles['SubSection']))
        
        final_stage = results.get('final_stage') or {}
        confidence = final_stage.get('confidence') if isinstance(final_stage, dict) else None
        if confidence is None:
            confidence = results.get('mri', {}).get('confidence')
        try:
            conf_display = f"{float(confidence):.2f}%" if confidence is not None else 'Not available'
        except (ValueError, TypeError):
            conf_display = str(confidence)
        
        # Build layout representing scale
        prog_bar_data = [
            [
                Paragraph("Reported score:", self.styles['TableTextBold']),
                Paragraph(f"<b>{conf_display}</b>", self.styles['TableTextBold']),
                Paragraph("Not calibrated; not a clinical confidence interval", self.styles['TableText'])
            ]
        ]
        prog_table = Table(prog_bar_data, colWidths=[1.5*inch, 1.0*inch, 5.0*inch])
        prog_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#e2e8f0')),
            ('PADDING', (0,0), (-1,-1), 8)
        ]))
        
        elements.append(prog_table)
        elements.append(Spacer(1, 10))
        
        stage_str = self._extract_stage_string(results.get('final_stage', 'Cognitive Assessment'))
        narrative = (
            f"<b>Backend output:</b> <b>{stage_str}</b> with a reported score of <b>{conf_display}</b>. "
            "This score is an assistive decision-support estimate. Modalities are integrated via rule-weighted "
            "multimodal fusion. This output is not a diagnosis and must be corroborated with clinical findings."
        )
        elements.append(Paragraph(narrative, self.styles['BodyText']))
        return elements

    def _build_governance_heading(self) -> List:
        elements = []
        elements.append(Paragraph("Clinical Governance & Verification", self.styles['ReportTitle']))
        elements.append(Paragraph("Attending Clinician Reviews & Securing Sign-Off", self.styles['SectionTitle']))
        elements.append(Spacer(1, 6))
        return elements

    def _build_notes_and_references(self, patient_info: Dict) -> List:
        elements = []
        elements.append(Paragraph("Clinician Consultation & Diagnostics Notes", self.styles['SubSection']))
        
        # Notes block box
        notes_data = [
            [
                Paragraph("<font color='#94a3b8'>Clinician notes, observation records, and pharmacological prescriptions box:</font><br/><br/><br/><br/><br/>", self.styles['Normal'])
            ]
        ]
        notes_table = Table(notes_data, colWidths=[7.5*inch])
        notes_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#fafafa')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
            ('PADDING', (0,0), (-1,-1), 15),
        ]))
        
        elements.append(notes_table)
        elements.append(Spacer(1, 10))
        
        # Reference links
        ref_text = (
            "<b>Clinical Scientific References:</b><br/>"
            "1. McKhann G, et al. The diagnosis of dementia due to Alzheimer's disease: Recommendations from the National Institute on Aging-Alzheimer's Association workgroups. <i>Alzheimers Dement</i>. 2011;7(3):263-269.<br/>"
            "2. Jack CR Jr, et al. NIA-AA Research Framework: Toward a biological definition of Alzheimer's disease. <i>Alzheimers Dement</i>. 2018;14(4):535-562.<br/>"
            "3. Hansson O, et al. CSF biomarkers for Alzheimer's disease. <i>Lancet Neurol</i>. 2006;5(3):228-234."
        )
        elements.append(Paragraph(ref_text, self.styles['BodyText']))
        elements.append(Spacer(1, 10))
        return elements

    def _build_signature_and_qrcode(self, results: Dict, patient_info: Dict) -> List:
        elements = []

        # Report fingerprint: HMAC-SHA256 over the full result payload with the
        # server secret — tamper-evidence for the stored PDF. This is NOT a
        # digital signature and must not be presented as one.
        try:
            from app.config.settings import Config
            secret = str(Config.SECRET_KEY).encode('utf-8')
        except Exception:
            secret = b'neurosense-report-fingerprint'
        payload = _json.dumps(results, sort_keys=True, default=str).encode('utf-8')
        fingerprint = _hmac.new(secret, payload, hashlib.sha256).hexdigest()[:16].upper()

        physician = patient_info.get('physician')
        if physician:
            signature_lines = (
                "<b>Reviewed By</b><br/><br/><br/>"
                "__________________________________________<br/>"
                f"{self._esc(physician)} | Date: {datetime.now().strftime('%B %d, %Y')}"
            )
        else:
            signature_lines = (
                "<b>Unsigned System-Generated Draft</b><br/>"
                "This report has not been reviewed or signed by a clinician.<br/>"
                "A qualified physician must review before clinical use."
            )

        sig_data = [
            [
                Paragraph("<b>Report Fingerprint:</b><br/>"
                          f"<font face='Courier' size=8><b>{fingerprint}</b></font><br/>"
                          "HMAC-SHA256 of the result payload (tamper-evidence only — "
                          "not a digital signature or QR verification).", self.styles['Normal']),
                Paragraph(signature_lines, self.styles['Normal'])
            ]
        ]

        sig_table = Table(sig_data, colWidths=[3.75*inch, 3.75*inch])
        sig_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
            ('PADDING', (0,0), (-1,-1), 10),
        ]))

        elements.append(sig_table)
        elements.append(Spacer(1, 10))

        elements.append(Paragraph("<b>CONFIDENTIALITY NOTICE:</b> The details contained within this PDF dossier are protected under the HIPAA "
                                  "Standard Privacy Rules and contains Sensitive Patient Health Information (PHI). Authorized clinical personnel eyes only.", self.styles['Disclaimer']))
        return elements

    def generate_html_report(self, analysis_results: Dict, patient_info: Dict) -> str:
        """Generate HTML report from returned fields without deriving extra clinical metrics."""
        final_stage = analysis_results.get('final_stage') or {}
        final_stage = final_stage if isinstance(final_stage, dict) else {}
        stage = self._extract_stage_string(final_stage.get('stage') or analysis_results.get('mri', {}).get('stage'))
        confidence = final_stage.get('confidence')
        if confidence is None:
            confidence = analysis_results.get('mri', {}).get('confidence')
        confidence_text = f"{float(confidence):.1f}% (uncalibrated)" if confidence is not None else 'Not available'
        cognitive = analysis_results.get('cognitive') or {}
        risk = analysis_results.get('risk_profile') or {}
        transcription = analysis_results.get('audio_transcription') or {}
        transcript = transcription.get('text') or ''
        transcript_summary = f"Transcript available ({len(transcript.split())} words)" if transcript else 'Not available'
        risk_level = self._assess_risk_level(analysis_results)
        
        html = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>NeuroSense AI - Assessment Report</title>
            <style>
                body {{ font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; line-height: 1.6; color: #1e293b; }}
                .header {{ background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: white; padding: 30px; border-radius: 10px; }}
                .section {{ margin: 30px 0; padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }}
                .section-title {{ color: #1e3a8a; font-size: 20px; margin-bottom: 15px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }}
                .risk-card {{ background: #f8fafc; border: 1px solid #cbd5e1; color: #334155; padding: 15px; border-radius: 5px; text-align: center; font-size: 18px; font-weight: bold; }}
                table {{ width: 100%; border-collapse: collapse; margin: 15px 0; }}
                th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 14px; }}
                th {{ background: #1e3a8a; color: white; }}
                .disclaimer {{ background: #fef9c3; border: 1px solid #fef08a; padding: 20px; border-radius: 5px; margin-top: 30px; font-size: 12px; color: #713f12; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>NeuroSense AI</h1>
                <h2>Assessment Output Report</h2>
                <p>Patient ID: {_html.escape(str(patient_info.get('patient_id', 'N/A')))} | Patient: {_html.escape(str(patient_info.get('name', 'N/A')))} | Date: {datetime.now().strftime('%B %d, %Y')}</p>
            </div>
            
            <div class="section">
                <div class="risk-card">
                    Rule-based risk category: {risk_level}
                </div>
            </div>
            
            <div class="section">
                <h3 class="section-title">Executive Summary</h3>
                <p>Backend output label: <strong>{stage}</strong>. Reported score: <strong>{confidence_text}</strong>. 
                MRI class mapping is unverified. This is a research output, not a diagnosis.</p>
            </div>
            
            <div class="section">
                <h3 class="section-title">Ensemble Analysis Overview</h3>
                <table>
                    <tr><th>Modality Finding</th><th>Result Value</th></tr>
                    <tr><td>MRI classifier label</td><td>{analysis_results.get('mri', {}).get('stage', 'Not available')} (reported score: {analysis_results.get('mri', {}).get('confidence', 'Not available')})</td></tr>
                    <tr><td>Questionnaire composite</td><td>{cognitive.get('composite_score', 'Not available')}/100; rule-based, not MMSE/MoCA</td></tr>
                    <tr><td>Speech transcript</td><td>{transcript_summary}; speech is not included in active fusion</td></tr>
                    <tr><td>Risk-factor score</td><td>{risk.get('overall_risk_score', 'Not available')}/100; local heuristic, not Lancet/Hachinski</td></tr>
                </table>
            </div>
            
            <div class="disclaimer">
                <strong>Disclaimer:</strong> This report is generated by AI and is NOT a definitive diagnosis. 
                Results should be interpreted by qualified healthcare professionals in conjunction with 
                clinical evaluation and additional diagnostic tests.
            </div>
        </body>
        </html>
        """
        return html

    def _assess_risk_level(self, results: Dict) -> str:
        """Return only the backend's rule-based risk category, if available."""
        risk_profile = results.get('risk_profile') or {}
        return risk_profile.get('risk_category') or risk_profile.get('risk_label') or 'Not assessed'


def generate_clinical_report(analysis_results: Dict, patient_info: Dict, format: str = 'html') -> Any:
    """
    Convenience function to generate clinical report.
    """
    generator = ClinicalReportGenerator()
    
    if format == 'pdf':
        return generator.generate_pdf_report(analysis_results, patient_info)
    else:
        return generator.generate_html_report(analysis_results, patient_info)
