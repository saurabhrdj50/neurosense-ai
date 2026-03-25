import re


class GenomicSequencer:
    def analyze_dna_text(self, text: str) -> dict:
        apoe_status = "Unknown"
        risk_score = 40
        parsed = False

        match_apoe = re.search(
            r'rs429358[\s,]+(?:\d+|chr19)[\s,]+\d+[\s,]+([ATCG][\s,]?[ATCG]?)',
            text,
            re.IGNORECASE
        )

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

        trem2_status = "Negative"
        match_trem2 = re.search(
            r'rs75932628[\s,]+(?:\d+|chr6)[\s,]+\d+[\s,]+([ATCG][\s,]?[ATCG]?)',
            text,
            re.IGNORECASE
        )

        if match_trem2:
            parsed = True
            genotype2 = match_trem2.group(1).replace(' ', '').replace(',', '').upper()
            if 'T' in genotype2 or 'A' in genotype2:
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
