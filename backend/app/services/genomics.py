"""
Genomic Sequencer Module
Parses raw DNA sequence files (e.g. 23andMe or Ancestry format) 
to identify key Alzheimer's genetic biomarkers like APOE ε4 and TREM2 variants.
"""

import re
import logging

logger = logging.getLogger(__name__)

class GenomicSequencer:
    """Analyzes raw DNA text data for AD risk alleles."""

    def analyze_dna_text(self, text: str) -> dict:
        """
        Parses a DNA raw data string for APOE and TREM2 variants.
        Looks for standard 23andMe tabular formats:
        rsid   chromosome   position   genotype
        rs429358    19      45411941    CC
        """
        
        # Default fallback if parsing fails
        apoe_status = "Unknown"
        risk_score = 40
        parsed = False

        # rs429358 determines APOE e4 status.
        # Allele 'C' is the high-risk e4 allele. Allele 'T' is the normal e3 allele.
        # Format usually: rs429358  19  45411941  C C (or CC)
        match_apoe = re.search(r'rs429358[\s,]+(?:\d+|chr19)[\s,]+\d+[\s,]+([ATCG][\s,]?[ATCG]?)', text, re.IGNORECASE)
        
        if match_apoe:
            parsed = True
            genotype = match_apoe.group(1).replace(' ', '').replace(',', '').upper()
            c_count = genotype.count('C')
            
            if c_count == 2:
                apoe_status = "Homozygous"
                risk_score = 90
            elif c_count == 1:
                apoe_status = "Heterozygous"
                risk_score = 65
            elif c_count == 0 and len(genotype) >= 1:
                apoe_status = "Negative"
                risk_score = 15
        
        # TREM2 rs75932628 (R47H mutation)
        # Allele 'T' (or 'A' on reverse strand) is the risk allele.
        trem2_status = "Negative"
        match_trem2 = re.search(r'rs75932628[\s,]+(?:\d+|chr6)[\s,]+\d+[\s,]+([ATCG][\s,]?[ATCG]?)', text, re.IGNORECASE)
        
        if match_trem2:
            parsed = True
            genotype2 = match_trem2.group(1).replace(' ', '').replace(',', '').upper()
            if 'T' in genotype2 or 'A' in genotype2: # Accounting for strand swap
                trem2_status = "Positive (Risk Variant)"
            
        summary = (
            f"DNA parsed successfully. APOE Status: {apoe_status}. "
            f"TREM2 R47H: {trem2_status}."
        ) if parsed else "No matching AD alleles found in the provided DNA text."

        return {
            'success': parsed,
            'apoe_e4_status': apoe_status,
            'trem2_status': trem2_status,
            'genetic_risk_score': risk_score,
            'summary': summary
        }

