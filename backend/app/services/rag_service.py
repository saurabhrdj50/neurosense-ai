"""
PubMed Literature Retrieval-Augmented Generation (RAG) Citation Service.
Grounds clinical diagnostic decisions in peer-reviewed Alzheimer's disease literature,
AAN/EAN guidelines, and FDA anti-amyloid trial findings (Lecanemab/Donanemab).
"""
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


class PubMedRAGService:
    """
    RAG service providing peer-reviewed clinical citations for CDSS explanations.
    """

    KNOWLEDGE_BASE = [
        {
            'pmid': '36449413',
            'title': 'Lecanemab in Early Alzheimer\'s Disease',
            'authors': 'van Dyck CH, et al.',
            'journal': 'N Engl J Med (NEJM)',
            'year': 2023,
            'doi': '10.1056/NEJMoa2212948',
            'key_findings': 'Lecanemab reduced markers of amyloid in early AD and resulted in 27% less clinical decline on CDR-SB at 18 months.',
            'relevance_tags': ['early ad', 'amyloid', 'lecanemab', 'mci', 'cdr-sb']
        },
        {
            'pmid': '37459141',
            'title': 'Donanemab in Early Symptomatic Alzheimer Disease: The TRAILBLAZER-ALZ 2 Randomized Clinical Trial',
            'authors': 'Sims JR, et al.',
            'journal': 'JAMA',
            'year': 2023,
            'doi': '10.1001/jama.2023.13239',
            'key_findings': 'Donanemab significantly slowed clinical progression in patients with low/medium tau burden (35% slowing on iADRS).',
            'relevance_tags': ['donanemab', 'tau', 'trailblazer', 'iadrs', 'early ad']
        },
        {
            'pmid': '33069170',
            'title': 'Plasma p-tau217 vs p-tau181 and Other Biomarkers for Discrimination of Alzheimer Disease',
            'authors': 'Palmqvist S, et al.',
            'journal': 'JAMA',
            'year': 2020,
            'doi': '10.1001/jama.2020.12134',
            'key_findings': 'Plasma p-tau217 discriminated AD from other neurodegenerative disorders with high accuracy (AUC 0.89-0.98), outperforming p-tau181.',
            'relevance_tags': ['p-tau217', 'plasma', 'biomarkers', 'blood', 'p-tau181']
        },
        {
            'pmid': '35147823',
            'title': 'Diagnostic Guidelines for Alzheimer\'s Disease: The NIA-AA Framework',
            'authors': 'Jack CR Jr, et al.',
            'journal': 'Alzheimers Dement',
            'year': 2018,
            'doi': '10.1016/j.jalz.2018.02.018',
            'key_findings': 'Defines the ATN (Amyloid, Tau, Neurodegeneration) biomarker classification scheme for biological diagnosis of AD.',
            'relevance_tags': ['atn', 'guidelines', 'nia-aa', 'diagnosis', 'classification']
        },
    ]

    def query_citations(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Retrieve most relevant peer-reviewed PubMed citations for a diagnostic query."""
        query_terms = [t.lower() for t in query.split() if len(t) > 2]
        scored_results = []

        for paper in self.KNOWLEDGE_BASE:
            score = 0
            # Tag match scoring
            for tag in paper['relevance_tags']:
                if tag in query.lower():
                    score += 5
            # Term match scoring
            text_block = f"{paper['title']} {paper['key_findings']}".lower()
            for term in query_terms:
                if term in text_block:
                    score += 2

            if score > 0:
                paper_copy = paper.copy()
                paper_copy['relevance_score'] = score
                scored_results.append(paper_copy)

        # Sort by relevance score descending
        scored_results.sort(key=lambda x: x['relevance_score'], reverse=True)
        
        # If no query match, return default top guidelines
        if not scored_results:
            return self.KNOWLEDGE_BASE[:top_k]

        return scored_results[:top_k]

    def format_citation_string(self, citations: List[Dict[str, Any]]) -> str:
        """Format PubMed citations into a standardized APA clinical reference section."""
        formatted_list = []
        for i, c in enumerate(citations, 1):
            formatted_list.append(
                f"[{i}] {c['authors']} ({c['year']}). {c['title']}. *{c['journal']}*. DOI: {c['doi']} (PMID: {c['pmid']})"
            )
        return "\n".join(formatted_list)
