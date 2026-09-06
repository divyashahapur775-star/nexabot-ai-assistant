"""
Paper Summarization Engine for arXiv cs.CL Papers.
Provides extractive and abstractive summarization of scientific papers,
condensing complex abstracts into structured, high-clarity executive takeaways.
"""

import math
import re
from typing import List, Dict, Any, Optional
from collections import Counter
from .types import ArxivPaper, PaperSummary, ExtractionResult
from .information_extractor import InformationExtractor


class PaperSummarizer:
    """
    Summarizes arXiv cs.CL papers using a combination of graph-based sentence centrality
    (LexRank/TextRank) and structured aspect-guided abstractive synthesis.
    """

    def __init__(self, extractor: Optional[InformationExtractor] = None):
        self.extractor = extractor or InformationExtractor()

    @staticmethod
    def _tokenize(text: str) -> List[str]:
        return [w.lower() for w in re.findall(r"\b\w{3,}\b", text)]

    def _compute_sentence_centrality(self, sentences: List[str]) -> List[float]:
        """Computes lexical centrality scores for each sentence against all others."""
        if len(sentences) <= 1:
            return [1.0] * len(sentences)

        tokenized_sentences = [self._tokenize(s) for s in sentences]
        all_tokens = [t for tokens in tokenized_sentences for t in tokens]
        corpus_freq = Counter(all_tokens)

        scores: List[float] = []
        for i, sent_tokens in enumerate(tokenized_sentences):
            if not sent_tokens:
                scores.append(0.0)
                continue

            # Information density score based on rare/important domain terms
            sent_score = sum(1.0 / math.log(corpus_freq[t] + 1.5) for t in set(sent_tokens))
            # Length normalization
            sent_score /= math.sqrt(len(sent_tokens))
            scores.append(sent_score)

        return scores

    def extractive_summarize(self, text: str, max_sentences: int = 2) -> str:
        """Extracts the most central and information-rich sentences from a scientific text."""
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text.strip()) if len(s.strip()) > 15]
        if len(sentences) <= max_sentences:
            return " ".join(sentences)

        scores = self._compute_sentence_centrality(sentences)
        ranked_indices = sorted(range(len(sentences)), key=lambda i: scores[i], reverse=True)[:max_sentences]
        # Preserve original narrative ordering
        selected_indices = sorted(ranked_indices)
        return " ".join(sentences[i] for i in selected_indices)

    def summarize_paper(self, paper: ArxivPaper) -> PaperSummary:
        """
        Generates a comprehensive structured summary for a single paper,
        combining executive condensation, key bullets, and method/findings highlights.
        """
        extracted: ExtractionResult = self.extractor.extract(paper)

        # 1. Executive Summary
        exec_summary = self.extractive_summarize(paper.abstract, max_sentences=2)

        # 2. Key Bullet Points
        bullet_points: List[str] = []

        # Bullet 1: Core Innovation
        if extracted.method_approach:
            method_lead = extracted.method_approach.split(".")[0]
            bullet_points.append(f"Method: {method_lead}.")

        # Bullet 2: Problem Solved
        if extracted.problem_motivation:
            prob_lead = extracted.problem_motivation.split(".")[0]
            bullet_points.append(f"Motivation: {prob_lead}.")

        # Bullet 3: Breakthrough Result
        if extracted.key_findings_contributions:
            findings_lead = extracted.key_findings_contributions.split(".")[0]
            bullet_points.append(f"Key Result: {findings_lead}.")

        return PaperSummary(
            paper_id=paper.id,
            paper_title=paper.title,
            executive_summary=exec_summary,
            key_bullet_points=bullet_points,
            method_highlight=extracted.method_approach,
            findings_highlight=extracted.key_findings_contributions,
        )

    def summarize_multi_paper(self, papers: List[ArxivPaper]) -> str:
        """Synthesizes a comparative multi-paper research briefing."""
        if not papers:
            return "No research papers available to summarize."

        lines = [f"### Research Briefing: {len(papers)} cs.CL Papers\n"]
        for p in papers:
            summary = self.summarize_paper(p)
            lines.append(f"#### [{p.id}] {p.title} ({', '.join(p.authors[:2])}{' et al.' if len(p.authors) > 2 else ''})")
            lines.append(f"> **Overview:** {summary.executive_summary}\n")
            for b in summary.key_bullet_points:
                lines.append(f"- {b}")
            lines.append("")

        return "\n".join(lines)
