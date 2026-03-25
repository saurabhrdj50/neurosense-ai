"""
Tests for GenomicSequencer module.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.genomics import GenomicSequencer


class TestGenomicSequencer:
    def setup_method(self):
        self.seq = GenomicSequencer()

    def test_apoe_homozygous(self):
        """CC genotype at rs429358 → Homozygous, high risk."""
        dna = "rs429358\t19\t45411941\tCC"
        result = self.seq.analyze_dna_text(dna)
        assert result['success'] is True
        assert result['apoe_e4_status'] == 'Homozygous'
        assert result['genetic_risk_score'] == 90

    def test_apoe_heterozygous(self):
        """CT genotype at rs429358 → Heterozygous, moderate risk."""
        dna = "rs429358\t19\t45411941\tCT"
        result = self.seq.analyze_dna_text(dna)
        assert result['success'] is True
        assert result['apoe_e4_status'] == 'Heterozygous'
        assert result['genetic_risk_score'] == 65

    def test_apoe_negative(self):
        """TT genotype at rs429358 → Negative, low risk."""
        dna = "rs429358\t19\t45411941\tTT"
        result = self.seq.analyze_dna_text(dna)
        assert result['success'] is True
        assert result['apoe_e4_status'] == 'Negative'
        assert result['genetic_risk_score'] == 15

    def test_trem2_positive(self):
        """TREM2 rs75932628 with T allele → Positive."""
        dna = "rs429358\t19\t45411941\tTT\nrs75932628\t6\t41129252\tCT"
        result = self.seq.analyze_dna_text(dna)
        assert result['trem2_status'] == 'Positive (Risk Variant)'

    def test_trem2_negative(self):
        """TREM2 rs75932628 with CC genotype → Negative."""
        dna = "rs429358\t19\t45411941\tCC\nrs75932628\t6\t41129252\tCC"
        result = self.seq.analyze_dna_text(dna)
        assert result['trem2_status'] == 'Negative'

    def test_invalid_dna_text(self):
        """Random text should not parse successfully."""
        result = self.seq.analyze_dna_text("Hello world, no DNA here.")
        assert result['success'] is False
        assert result['apoe_e4_status'] == 'Unknown'

    def test_empty_input(self):
        """Empty string should return default values."""
        result = self.seq.analyze_dna_text("")
        assert result['success'] is False
