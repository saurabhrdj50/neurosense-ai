"""
Enhanced Report Generator for Clinical Analysis.
Generates comprehensive PDF and HTML reports with visualizations.
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
import io
import base64

logger = logging.getLogger(__name__)

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
    HAS_REPORTLAB = True
except ImportError:
    HAS_REPORTLAB = False
    logger.warning("ReportLab not installed. PDF reports will not be available.")


class ClinicalReportGenerator:
    """
    Generates comprehensive clinical reports for Alzheimer's assessment.
    """
    
    def __init__(self):
        self.styles = None
        if HAS_REPORTLAB:
            self._init_styles()
    
    def _init_styles(self):
        """Initialize report styles."""
        self.styles = getSampleStyleSheet()
        
        self.styles.add(ParagraphStyle(
            name='ReportTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1a365d'),
            spaceAfter=30,
            alignment=TA_CENTER
        ))
        
        self.styles.add(ParagraphStyle(
            name='SectionTitle',
            parent=self.styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#2c5282'),
            spaceBefore=20,
            spaceAfter=10
        ))
        
        self.styles.add(ParagraphStyle(
            name='SubSection',
            parent=self.styles['Heading3'],
            fontSize=12,
            textColor=colors.HexColor('#4a5568'),
            spaceBefore=15,
            spaceAfter=5
        ))
        
        self.styles.add(ParagraphStyle(
            name='BodyText',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceBefore=5,
            spaceAfter=5,
            alignment=TA_JUSTIFY
        ))
        
        self.styles.add(ParagraphStyle(
            name='Disclaimer',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#718096'),
            spaceBefore=20,
            alignment=TA_CENTER
        ))
    
    def generate_pdf_report(self, analysis_results: Dict[str, Any], 
                          patient_info: Dict[str, Any]) -> bytes:
        """
        Generate PDF clinical report.
        
        Args:
            analysis_results: Complete analysis results
            patient_info: Patient demographics and info
            
        Returns:
            PDF report as bytes
        """
        if not HAS_REPORTLAB:
            raise ImportError("ReportLab not installed")
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=0.75*inch,
            leftMargin=0.75*inch,
            topMargin=0.75*inch,
            bottomMargin=0.75*inch
        )
        
        story = []
        
        story.extend(self._build_header(patient_info))
        story.extend(self._build_executive_summary(analysis_results))
        story.extend(self._build_patient_history(patient_info))
        story.extend(self._build_mri_results(analysis_results.get('mri', {})))
        story.extend(self._build_cognitive_results(analysis_results.get('cognitive', {})))
        story.extend(self._build_biomarker_results(analysis_results.get('biomarkers', {})))
        story.extend(self._build_treatment_recommendations(analysis_results.get('clinical_support', {})))
        story.extend(self._build_appendix())
        
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()
    
    def _build_header(self, patient_info: Dict) -> List:
        """Build report header."""
        if not self.styles:
            return []
        
        elements = []
        
        elements.append(Paragraph("NeuroSense AI", self.styles['ReportTitle']))
        elements.append(Paragraph("Alzheimer's Disease Assessment Report", self.styles['SectionTitle']))
        elements.append(Spacer(1, 20))
        
        report_date = datetime.now().strftime("%B %d, %Y")
        
        header_data = [
            ['Patient Name:', patient_info.get('name', 'N/A'), 'Report Date:', report_date],
            ['Patient ID:', patient_info.get('patient_id', 'N/A'), 'Report ID:', patient_info.get('report_id', 'NS-' + datetime.now().strftime('%Y%m%d%H%M'))],
            ['Age:', str(patient_info.get('age', 'N/A')), 'Gender:', patient_info.get('gender', 'N/A')],
            ['Referring Physician:', patient_info.get('physician', 'N/A'), 'Assessment Type:', 'Comprehensive'],
        ]
        
        header_table = Table(header_data, colWidths=[1.5*inch, 2*inch, 1.5*inch, 2*inch])
        header_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#4a5568')),
            ('TEXTCOLOR', (2, 0), (2, -1), colors.HexColor('#4a5568')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LINEBELOW', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        elements.append(header_table)
        elements.append(Spacer(1, 30))
        
        return elements
    
    def _build_executive_summary(self, results: Dict) -> List:
        """Build executive summary section."""
        if not self.styles:
            return []
        
        elements = []
        
        elements.append(Paragraph("Executive Summary", self.styles['SectionTitle']))
        
        stage = results.get('final_stage', results.get('mri', {}).get('stage', 'Unknown'))
        confidence = results.get('final_confidence', results.get('mri', {}).get('confidence', 0))
        
        summary_text = f"""
        This patient presents with <b>{stage}</b> based on comprehensive multimodal analysis. 
        The AI confidence score is <b>{confidence:.1f}%</b>. These findings should be interpreted 
        in conjunction with clinical evaluation, patient history, and additional diagnostic tests.
        """
        
        elements.append(Paragraph(summary_text, self.styles['BodyText']))
        
        risk_level = self._assess_risk_level(results)
        risk_colors = {
            'Low': colors.HexColor('#48bb78'),
            'Moderate': colors.HexColor('#ecc94b'),
            'High': colors.HexColor('#ed8936'),
            'Very High': colors.HexColor('#f56565'),
        }
        
        risk_data = [['Overall Risk Assessment', risk_level]]
        risk_table = Table(risk_data, colWidths=[3*inch, 2*inch])
        risk_table.setStyle(TableStyle([
            ('BACKGROUND', (1, 0), (1, 0), risk_colors.get(risk_level, colors.gray)),
            ('TEXTCOLOR', (0, 0), (0, 0), colors.white),
            ('TEXTCOLOR', (1, 0), (1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#4a5568')),
        ]))
        
        elements.append(Spacer(1, 15))
        elements.append(risk_table)
        elements.append(Spacer(1, 20))
        
        return elements
    
    def _assess_risk_level(self, results: Dict) -> str:
        """Assess overall risk level."""
        stage = results.get('final_stage', '')
        confidence = results.get('final_confidence', 0)
        
        if 'Moderate' in str(stage) or confidence > 85:
            return 'Very High'
        elif 'Mild' in str(stage) and confidence > 70:
            return 'High'
        elif 'Mild' in str(stage):
            return 'Moderate'
        elif 'Very Mild' in str(stage):
            return 'Low'
        return 'Moderate'
    
    def _build_patient_history(self, patient_info: Dict) -> List:
        """Build patient history section."""
        if not self.styles:
            return []
        
        elements = []
        elements.append(Paragraph("Patient History", self.styles['SectionTitle']))
        
        history_data = [
            ['Chief Complaint:', patient_info.get('chief_complaint', 'Cognitive concerns')],
            ['History of Present Illness:', patient_info.get('hpi', 'Patient presents with memory concerns.')],
            ['Past Medical History:', patient_info.get('pmh', 'No significant past medical history.')],
            ['Medications:', patient_info.get('medications', 'None reported.')],
            ['Family History:', patient_info.get('family_history', 'Not specified.')],
        ]
        
        for label, value in history_data:
            elements.append(Paragraph(f"<b>{label}</b>", self.styles['SubSection']))
            elements.append(Paragraph(value, self.styles['BodyText']))
        
        elements.append(Spacer(1, 15))
        return elements
    
    def _build_mri_results(self, mri_results: Dict) -> List:
        """Build MRI results section."""
        if not self.styles:
            return []
        
        elements = []
        elements.append(Paragraph("Neuroimaging Results (MRI)", self.styles['SectionTitle']))
        
        if not mri_results:
            elements.append(Paragraph("MRI analysis not performed or results unavailable.", self.styles['BodyText']))
            return elements
        
        mri_data = [
            ['Finding', 'Result'],
            ['Classification', mri_results.get('stage', 'N/A')],
            ['Confidence', f"{mri_results.get('confidence', 0):.1f}%"],
            ['Severity', mri_results.get('severity', 'N/A')],
        ]
        
        mri_table = Table(mri_data, colWidths=[2*inch, 4*inch])
        mri_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5282')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        elements.append(mri_table)
        
        if mri_results.get('description'):
            elements.append(Spacer(1, 10))
            elements.append(Paragraph(f"<i>{mri_results['description']}</i>", self.styles['BodyText']))
        
        elements.append(Spacer(1, 15))
        return elements
    
    def _build_cognitive_results(self, cognitive_results: Dict) -> List:
        """Build cognitive assessment results."""
        if not self.styles:
            return []
        
        elements = []
        elements.append(Paragraph("Cognitive Assessment", self.styles['SectionTitle']))
        
        mmse = cognitive_results.get('mmse', {})
        moca = cognitive_results.get('moca', {})
        
        cog_data = [
            ['Test', 'Score', 'Classification'],
            ['MMSE', f"{mmse.get('score', 'N/A')}/30", mmse.get('classification', 'N/A')],
            ['MoCA', f"{moca.get('score', 'N/A')}/30", moca.get('classification', 'N/A')],
        ]
        
        cog_table = Table(cog_data, colWidths=[1.5*inch, 1.5*inch, 3*inch])
        cog_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5282')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        elements.append(cog_table)
        elements.append(Spacer(1, 15))
        
        return elements
    
    def _build_biomarker_results(self, biomarker_results: Dict) -> List:
        """Build biomarker results."""
        if not self.styles:
            return []
        
        elements = []
        elements.append(Paragraph("Blood Biomarker Analysis", self.styles['SectionTitle']))
        
        if not biomarker_results or biomarker_results.get('biomarkers', {}).get('total', 0) == 0:
            elements.append(Paragraph("Blood biomarker analysis not performed.", self.styles['BodyText']))
            return elements
        
        risk = biomarker_results.get('risk_assessment', {})
        
        bio_data = [
            ['Biomarker Panel', 'Result'],
            ['Blood Biomarker Score', f"{risk.get('blood_biomarker_score', 0):.1f}/100"],
            ['AD Probability (Blood)', f"{risk.get('ad_probability_from_blood', 0):.1f}%"],
            ['Interpretation', risk.get('interpretation', 'N/A')],
        ]
        
        bio_table = Table(bio_data, colWidths=[2*inch, 4*inch])
        bio_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5282')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        elements.append(bio_table)
        elements.append(Spacer(1, 15))
        
        return elements
    
    def _build_treatment_recommendations(self, clinical_support: Dict) -> List:
        """Build treatment recommendations."""
        if not self.styles:
            return []
        
        elements = []
        elements.append(PageBreak())
        elements.append(Paragraph("Treatment Recommendations", self.styles['SectionTitle']))
        
        if not clinical_support:
            elements.append(Paragraph("Treatment recommendations will be provided by the treating physician.", self.styles['BodyText']))
            return elements
        
        treatments = clinical_support.get('treatment_plan', {})
        
        elements.append(Paragraph("Pharmacological Treatment", self.styles['SubSection']))
        for tx in treatments.get('pharmacological', [])[:3]:
            elements.append(Paragraph(f"<b>{tx.get('treatment', 'N/A')}</b>", self.styles['BodyText']))
            elements.append(Paragraph(f"Reason: {tx.get('reason', 'N/A')}", self.styles['BodyText']))
            elements.append(Spacer(1, 5))
        
        elements.append(Spacer(1, 15))
        elements.append(Paragraph("Non-Pharmacological Interventions", self.styles['SubSection']))
        for ntx in treatments.get('non_pharmacological', [])[:3]:
            elements.append(Paragraph(f"<b>{ntx.get('category', 'N/A')}</b>", self.styles['BodyText']))
            elements.append(Spacer(1, 5))
        
        elements.append(Spacer(1, 15))
        return elements
    
    def _build_appendix(self) -> List:
        """Build appendix with disclaimers."""
        if not self.styles:
            return []
        
        elements = []
        elements.append(PageBreak())
        elements.append(Paragraph("Appendix: Methodology & Disclaimers", self.styles['SectionTitle']))
        
        methods = """
        <b>Methodology:</b><br/>
        This assessment utilizes NeuroSense AI, a multimodal machine learning system that analyzes 
        neuroimaging, cognitive tests, blood biomarkers, and clinical data to provide Alzheimer's 
        disease risk assessment. The system combines multiple AI models including convolutional 
        neural networks for MRI analysis, natural language processing for cognitive assessment, 
        and ensemble methods for final risk calculation.
        """
        elements.append(Paragraph(methods, self.styles['BodyText']))
        
        disclaimer = """
        <b>Important Disclaimer:</b><br/><br/>
        This report is generated by an artificial intelligence system and is intended to assist 
        healthcare professionals in clinical decision-making. It is NOT a definitive diagnosis 
        and should NOT replace clinical judgment.<br/><br/>
        
        Results should be interpreted in conjunction with:<br/>
        - Complete clinical evaluation<br/>
        - Patient history and physical examination<br/>
        - Additional diagnostic tests as indicated<br/>
        - Specialist consultation when appropriate<br/><br/>
        
        NeuroSense AI is a research prototype. Clinical decisions should be made by qualified 
        healthcare professionals. The developers assume no liability for decisions made 
        based on this report.<br/><br/>
        
        For questions about this report, please contact the interpreting physician.
        """
        elements.append(Spacer(1, 20))
        elements.append(Paragraph(disclaimer, self.styles['Disclaimer']))
        
        elements.append(Spacer(1, 30))
        elements.append(Paragraph(f"Report generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} UTC", self.styles['Disclaimer']))
        elements.append(Paragraph("NeuroSense AI v1.0.0", self.styles['Disclaimer']))
        
        return elements
    
    def generate_html_report(self, analysis_results: Dict, patient_info: Dict) -> str:
        """Generate HTML report for web viewing."""
        risk_level = self._assess_risk_level(analysis_results)
        
        html = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>NeuroSense AI - Assessment Report</title>
            <style>
                body {{ font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; line-height: 1.6; }}
                .header {{ background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%); color: white; padding: 30px; border-radius: 10px; }}
                .section {{ margin: 30px 0; padding: 20px; background: #f7fafc; border-radius: 8px; }}
                .section-title {{ color: #1a365d; font-size: 20px; margin-bottom: 15px; border-bottom: 2px solid #2c5282; padding-bottom: 10px; }}
                .risk-{risk_level.lower().replace(' ', '-')} {{ background: {'#48bb78' if 'Low' in risk_level else '#f56565'}; color: white; padding: 15px; border-radius: 5px; text-align: center; font-size: 18px; }}
                table {{ width: 100%; border-collapse: collapse; margin: 15px 0; }}
                th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }}
                th {{ background: #2c5282; color: white; }}
                .disclaimer {{ background: #fff3cd; padding: 20px; border-radius: 5px; margin-top: 30px; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>NeuroSense AI</h1>
                <h2>Alzheimer's Disease Assessment Report</h2>
                <p>Patient: {patient_info.get('name', 'N/A')} | Date: {datetime.now().strftime('%B %d, %Y')}</p>
            </div>
            
            <div class="section">
                <div class="risk-{risk_level.lower().replace(' ', '-')}">
                    <strong>Overall Risk Assessment: {risk_level}</strong>
                </div>
            </div>
            
            <div class="section">
                <h3 class="section-title">Executive Summary</h3>
                <p>This patient presents with <strong>{analysis_results.get('final_stage', 'Unknown')}</strong> 
                based on comprehensive multimodal analysis. AI confidence: <strong>{analysis_results.get('final_confidence', 0):.1f}%</strong></p>
            </div>
            
            <div class="section">
                <h3 class="section-title">MRI Analysis</h3>
                <table>
                    <tr><th>Finding</th><th>Result</th></tr>
                    <tr><td>Classification</td><td>{analysis_results.get('mri', {}).get('stage', 'N/A')}</td></tr>
                    <tr><td>Confidence</td><td>{analysis_results.get('mri', {}).get('confidence', 0):.1f}%</td></tr>
                </table>
            </div>
            
            <div class="section">
                <h3 class="section-title">Cognitive Assessment</h3>
                <p>MMSE Score: {analysis_results.get('cognitive', {}).get('mmse', {}).get('score', 'N/A')}/30</p>
                <p>MoCA Score: {analysis_results.get('cognitive', {}).get('moca', {}).get('score', 'N/A')}/30</p>
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


def generate_clinical_report(analysis_results: Dict, patient_info: Dict, format: str = 'html') -> Any:
    """
    Convenience function to generate clinical report.
    
    Args:
        analysis_results: Complete analysis results
        patient_info: Patient demographics
        format: 'html' or 'pdf'
        
    Returns:
        Report in requested format
    """
    generator = ClinicalReportGenerator()
    
    if format == 'pdf':
        return generator.generate_pdf_report(analysis_results, patient_info)
    else:
        return generator.generate_html_report(analysis_results, patient_info)
