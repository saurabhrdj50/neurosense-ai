"""
PDF Report Generator Service
Generates professional medical-style PDF reports for Alzheimer's assessment results.
"""

import io
import logging
import base64
import re
from datetime import datetime
from typing import Dict, Any, Optional
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Flowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.utils import ImageReader

logger = logging.getLogger(__name__)


class PatientPhoto(Flowable):
    """Custom flowable to display patient photo in PDF."""
    
    def __init__(self, photo_data, width=1.2*inch, height=1.2*inch):
        self.width = width
        self.height = height
        self.photo_data = photo_data
        
    def wrap(self, aw, ah):
        return self.width, self.height
    
    def draw(self):
        if not self.photo_data:
            return
            
        try:
            data = self.photo_data
            if 'base64,' in data:
                data = data.split('base64,')[1]
            
            img_data = base64.b64decode(data)
            img = ImageReader(io.BytesIO(img_data))
            
            aspect = img.getSize()[0] / img.getSize()[1]
            if aspect > 1:
                new_w = self.width
                new_h = self.width / aspect
            else:
                new_h = self.height
                new_w = self.height * aspect
            
            x_offset = (self.width - new_w) / 2
            y_offset = (self.height - new_h) / 2
            
            self.canv.drawImage(img, x_offset, y_offset, width=new_w, height=new_h, mask='auto')
        except Exception as e:
            logger.warning(f"Could not render patient photo: {e}")


class PDFReportGenerator:
    """Generate professional PDF reports for Alzheimer assessment results."""

    COLORS = {
        'primary': colors.HexColor('#1e3a5f'),
        'secondary': colors.HexColor('#2563eb'),
        'success': colors.HexColor('#059669'),
        'warning': colors.HexColor('#d97706'),
        'danger': colors.HexColor('#dc2626'),
        'neutral': colors.HexColor('#64748b'),
        'light': colors.HexColor('#f8fafc'),
        'border': colors.HexColor('#e2e8f0'),
        'bg_gray': colors.HexColor('#f1f5f9'),
    }

    STAGE_COLORS = {
        'Non Demented': colors.HexColor('#059669'),
        'Very Mild Demented': colors.HexColor('#2563eb'),
        'Mild Demented': colors.HexColor('#d97706'),
        'Moderate Demented': colors.HexColor('#dc2626'),
    }

    def generate_report(self, results: Dict[str, Any], patient_info: Optional[Dict] = None) -> bytes:
        """Generate a professional PDF report from analysis results."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=0.5*inch,
            leftMargin=0.5*inch,
            topMargin=0.4*inch,
            bottomMargin=0.5*inch
        )
        
        story = []
        styles = self._create_custom_styles()
        
        patient_photo = patient_info.get('photo') if patient_info else None
        
        story.extend(self._create_header(styles, patient_info, patient_photo))
        
        stage = results.get('final_stage', {}).get('stage') or results.get('mri', {}).get('stage') or 'Unknown'
        confidence = results.get('final_stage', {}).get('confidence') or results.get('mri', {}).get('confidence') or 0
        
        story.extend(self._create_summary_section(styles, stage, confidence))
        story.extend(self._create_patient_details(styles, patient_info, results))
        story.extend(self._create_modality_results(styles, results))
        story.extend(self._create_explanation_section(styles, results))
        story.extend(self._create_recommendations_section(styles, results))
        story.extend(self._create_footer(styles))
        
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()

    def _create_custom_styles(self):
        """Create custom paragraph styles for the report."""
        styles = getSampleStyleSheet()
        
        styles.add(ParagraphStyle(
            name='ReportTitle',
            parent=styles['Heading1'],
            fontSize=20,
            textColor=self.COLORS['primary'],
            spaceAfter=2,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=styles['Heading2'],
            fontSize=12,
            textColor=self.COLORS['primary'],
            spaceBefore=15,
            spaceAfter=8,
            borderPadding=(0, 0, 8, 0),
            fontName='Helvetica-Bold'
        ))
        
        styles.add(ParagraphStyle(
            name='SubsectionHeader',
            parent=styles['Heading3'],
            fontSize=10,
            textColor=self.COLORS['secondary'],
            spaceBefore=8,
            spaceAfter=4,
            fontName='Helvetica-Bold'
        ))
        
        styles.add(ParagraphStyle(
            name='NormalText',
            parent=styles['Normal'],
            fontSize=9,
            spaceAfter=4,
            leading=13,
            textColor=self.COLORS['primary']
        ))
        
        styles.add(ParagraphStyle(
            name='SmallText',
            parent=styles['Normal'],
            fontSize=7,
            textColor=self.COLORS['neutral'],
            spaceAfter=2
        ))
        
        return styles

    def _create_header(self, styles, patient_info: Optional[Dict], patient_photo: Optional[str]) -> list:
        """Create the professional report header."""
        story = []
        
        title = Paragraph(
            "<b>NeuroSense AI</b><br/>"
            "<font size=10>Comprehensive Alzheimer's Assessment Report</font><br/>"
            "<font size=8 color='#64748b'>Multimodal AI-Powered Neurological Analysis</font>",
            styles['ReportTitle']
        )
        
        photo_para = Paragraph("", styles['NormalText'])
        if patient_photo:
            photo_para = PatientPhoto(patient_photo, width=0.8*inch, height=0.8*inch)
        
        header_data = [[title, photo_para]]
        header_table = Table(header_data, colWidths=[4.5*inch, 1.3*inch], rowHeights=[0.8*inch])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('LINEABOVE', (0, 0), (-1, 0), 2, self.COLORS['primary']),
        ]))
        story.append(header_table)
        
        date_str = datetime.now().strftime('%B %d, %Y at %I:%M %p')
        
        info_data = []
        if patient_info:
            if patient_info.get('name'):
                info_data.append(['Patient Name:', patient_info['name']])
            if patient_info.get('patient_id'):
                info_data.append(['Patient ID:', patient_info['patient_id']])
            if patient_info.get('age'):
                info_data.append(['Age:', f"{patient_info['age']} years"])
            if patient_info.get('sex'):
                sex = 'Male' if patient_info['sex'] == 'M' else 'Female'
                info_data.append(['Gender:', sex])
            if patient_info.get('education_years'):
                info_data.append(['Education:', f"{patient_info['education_years']} years"])
        
        info_data.append(['Report Date:', date_str])
        
        info_table = Table(info_data, colWidths=[1.2*inch, 2.5*inch])
        info_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TEXTCOLOR', (0, 0), (0, -1), self.COLORS['neutral']),
            ('TEXTCOLOR', (1, 0), (1, -1), self.COLORS['primary']),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(info_table)
        story.append(Spacer(1, 10))
        
        return story

    def _create_summary_section(self, styles, stage: str, confidence: float) -> list:
        """Create the assessment summary section."""
        story = []
        
        stage_color = self.STAGE_COLORS.get(stage, self.COLORS['neutral'])
        
        risk_level = 'Low'
        risk_desc = 'Minimal cognitive decline detected'
        if stage == 'Very Mild Demented':
            risk_level = 'Low'
            risk_desc = 'Minor cognitive changes, early intervention recommended'
        elif stage == 'Mild Demented':
            risk_level = 'Moderate'
            risk_desc = 'Clear cognitive decline, medical consultation advised'
        elif stage == 'Moderate Demented':
            risk_level = 'High'
            risk_desc = 'Significant impairment, urgent medical attention recommended'
        
        summary = Paragraph(
            f"<font size=11 color='#64748b'>Assessment Result</font><br/>"
            f"<font size=16 color='{stage_color.hexval()}'><b>{stage}</b></font><br/>"
            f"<font size=9 color='#64748b'>{risk_desc}</font>",
            styles['NormalText']
        )
        
        conf_text = Paragraph(
            f"<font size=11 color='#64748b'>AI Confidence</font><br/>"
            f"<font size=16 color='#2563eb'><b>{confidence:.1f}%</b></font>",
            styles['NormalText']
        )
        
        risk_text = Paragraph(
            f"<font size=11 color='#64748b'>Risk Level</font><br/>"
            f"<font size=14 color='{stage_color.hexval()}'><b>{risk_level}</b></font>",
            styles['NormalText']
        )
        
        summary_row = Table([[summary, conf_text, risk_text]], colWidths=[2.5*inch, 1.8*inch, 1.5*inch])
        summary_row.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOX', (0, 0), (-1, -1), 1, self.COLORS['border']),
            ('BACKGROUND', (0, 0), (-1, -1), self.COLORS['bg_gray']),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ]))
        story.append(summary_row)
        story.append(Spacer(1, 12))
        
        disclaimer = Paragraph(
            "<b>Medical Disclaimer:</b> This report is generated by an AI system for research and educational purposes only. "
            "It does not constitute a medical diagnosis. Always consult a qualified neurologist.",
            styles['SmallText']
        )
        story.append(disclaimer)
        
        return story

    def _create_patient_details(self, styles, patient_info: Optional[Dict], results: Dict) -> list:
        """Create patient demographic details section."""
        story = []
        
        if not patient_info:
            return story
        
        story.append(Paragraph('Patient Demographics', styles['SectionHeader']))
        
        demo_items = []
        
        if patient_info.get('name'):
            demo_items.append(['Name', patient_info['name']])
        if patient_info.get('patient_id'):
            demo_items.append(['Patient ID', patient_info['patient_id']])
        if patient_info.get('age'):
            demo_items.append(['Age', f"{patient_info['age']} years"])
        if patient_info.get('sex'):
            demo_items.append(['Gender', 'Male' if patient_info['sex'] == 'M' else 'Female'])
        
        risk_profile = results.get('risk_profile', {})
        if risk_profile:
            risk_factors = risk_profile.get('factor_details', {})
            high_risk = [k for k, v in risk_factors.items() if v.get('risk_score', 0) > 50]
            if high_risk:
                labels = [risk_factors[k].get('label', k) for k in high_risk[:3]]
                demo_items.append(['High-Risk Factors', ', '.join(labels)])
        
        if demo_items:
            demo_table = Table(demo_items, colWidths=[1.5*inch, 4.5*inch])
            demo_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica'),
                ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 0.5, self.COLORS['border']),
                ('BACKGROUND', (0, 0), (0, -1), self.COLORS['bg_gray']),
            ]))
            story.append(demo_table)
        
        return story

    def _create_modality_results(self, styles, results: Dict) -> list:
        """Create the detailed modality results section."""
        story = []
        
        story.append(Paragraph('Diagnostic Analysis Results', styles['SectionHeader']))
        
        mri = results.get('mri', {})
        cognitive = results.get('cognitive', {})
        sentiment = results.get('sentiment', {})
        handwriting = results.get('handwriting', {})
        risk_profile = results.get('risk_profile', {})
        
        modalities = []
        
        if mri:
            modalities.append(['MRI Scan', mri.get('stage', 'N/A'), f"{mri.get('confidence', 0):.1f}%", 'Brain imaging analyzed'])
        
        if cognitive:
            modalities.append(['Cognitive Test', f"{cognitive.get('composite_score', 0)}/10", 'Complete', 'Tests evaluated'])
        
        if sentiment:
            modalities.append(['Sentiment Analysis', sentiment.get('dominant_emotion', 'N/A').title(), 'Done', 'Emotion patterns analyzed'])
        
        if handwriting:
            hw_risk = handwriting.get('handwriting_risk_score', 0)
            modalities.append(['Handwriting', 'Normal' if hw_risk < 0.3 else 'Abnormal', f'{hw_risk:.2f}', 'Motor control analyzed'])
        
        if risk_profile:
            modalities.append(['Risk Profile', risk_profile.get('risk_label', 'N/A'), f"{risk_profile.get('overall_risk_score', 0):.1f}", 'Assessment complete'])
        
        if modalities:
            headers = ['Modality', 'Result', 'Score', 'Details']
            table = Table([headers] + modalities, colWidths=[1.3*inch, 1.3*inch, 0.9*inch, 2.5*inch])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), self.COLORS['primary']),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('GRID', (0, 0), (-1, -1), 0.5, self.COLORS['border']),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, self.COLORS['bg_gray']]),
            ]))
            story.append(table)
        
        return story

    def _create_explanation_section(self, styles, results: Dict) -> list:
        """Create the AI explanation section."""
        story = []
        
        explanation = results.get('ai_explanation', {})
        if not explanation:
            return story
        
        story.append(Paragraph('AI Analysis Explanation', styles['SectionHeader']))
        
        summary = explanation.get('summary', '')
        if summary:
            story.append(Paragraph(f"<b>Summary:</b> {summary}", styles['NormalText']))
        
        key_indicators = explanation.get('key_indicators', [])
        if key_indicators:
            story.append(Spacer(1, 5))
            story.append(Paragraph('Key Contributing Factors:', styles['SubsectionHeader']))
            
            for indicator in key_indicators:
                ind_text = f"• <b>{indicator.get('modality', 'N/A')}</b>: {indicator.get('value', 'N/A')} — Confidence: {indicator.get('confidence', 0):.1f}%"
                story.append(Paragraph(ind_text, styles['NormalText']))
        
        overall = explanation.get('overall_explanation', '')
        if overall:
            story.append(Spacer(1, 5))
            story.append(Paragraph('Detailed Assessment:', styles['SubsectionHeader']))
            story.append(Paragraph(overall, styles['NormalText']))
        
        return story

    def _create_recommendations_section(self, styles, results: Dict) -> list:
        """Create the recommendations section."""
        story = []
        
        recommendations = results.get('recommendations', {})
        if not recommendations:
            return story
        
        story.append(Paragraph('Recommendations & Next Steps', styles['SectionHeader']))
        
        medical = recommendations.get('medical_recommendations', {})
        if medical:
            urgency = medical.get('urgency_level', 'Routine')
            story.append(Paragraph(f"<b>Recommended Follow-up:</b> {urgency}", styles['NormalText']))
            
            story.append(Spacer(1, 5))
            story.append(Paragraph('Medical Referrals:', styles['SubsectionHeader']))
            
            referrals = medical.get('referrals', [])
            for ref in referrals[:4]:
                ref_text = f"• <b>{ref.get('specialist', 'N/A')}</b> — {ref.get('reason', '')} ({ref.get('urgency', '')})"
                story.append(Paragraph(ref_text, styles['NormalText']))
        
        lifestyle = recommendations.get('lifestyle_recommendations', {})
        if lifestyle:
            story.append(Spacer(1, 8))
            story.append(Paragraph('Lifestyle Recommendations:', styles['SubsectionHeader']))
            
            tips = lifestyle.get('tips', [])
            for tip in tips[:5]:
                tip_text = f"• <b>[{tip.get('category', '')}]</b> {tip.get('tip', '')}"
                story.append(Paragraph(tip_text, styles['NormalText']))
        
        goals = lifestyle.get('goals', [])
        if goals:
            story.append(Spacer(1, 5))
            story.append(Paragraph('Recommended Goals:', styles['SubsectionHeader']))
            
            for goal in goals[:3]:
                goal_text = f"• <b>{goal.get('goal', '')}</b> — {goal.get('timeline', '')}"
                story.append(Paragraph(goal_text, styles['NormalText']))
        
        return story

    def _create_footer(self, styles) -> list:
        """Create the professional report footer."""
        story = []
        
        story.append(PageBreak())
        
        footer_text = Paragraph(
            "<font size=9 color='#64748b'><b>Report Information</b></font><br/><br/>"
            "<font size=7 color='#64748b'>"
            "This report was automatically generated by <b>NeuroSense AI</b> — an advanced multimodal AI system<br/>"
            "designed to assist in Alzheimer's disease risk assessment.<br/><br/>"
            "<b>Important:</b> This report is for educational and research purposes only.<br/>"
            "It does NOT constitute a medical diagnosis. Always consult qualified healthcare professionals<br/>"
            "for clinical decisions, treatment plans, or medical advice."
            "</font>",
            styles['SmallText']
        )
        story.append(footer_text)
        story.append(Spacer(1, 15))
        
        generated = Paragraph(
            f"Report generated on {datetime.now().strftime('%Y-%m-%d at %H:%M:%S')} - NeuroSense AI v2.0",
            styles['SmallText']
        )
        story.append(generated)
        
        return story


def generate_pdf_report(results: Dict[str, Any], patient_info: Optional[Dict] = None) -> bytes:
    """Convenience function to generate PDF report."""
    generator = PDFReportGenerator()
    return generator.generate_report(results, patient_info)
