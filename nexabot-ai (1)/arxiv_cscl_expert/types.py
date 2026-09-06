"""
Data models and typed representations for the arXiv cs.CL Domain-Expert Chatbot.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
import json


@dataclass
class ArxivPaper:
    """Represents a clean, structured arXiv paper categorized under cs.CL."""
    id: str
    title: str
    abstract: str
    authors: List[str]
    categories: List[str]
    publication_date: str
    doi: Optional[str] = None
    journal_ref: Optional[str] = None
    comments: Optional[str] = None
    cleaned_text: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "abstract": self.abstract,
            "authors": self.authors,
            "categories": self.categories,
            "publication_date": self.publication_date,
            "doi": self.doi,
            "journal_ref": self.journal_ref,
            "comments": self.comments,
            "cleaned_text": self.cleaned_text,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ArxivPaper":
        return cls(
            id=str(data.get("id", "")),
            title=str(data.get("title", "")).strip(),
            abstract=str(data.get("abstract", "")).strip(),
            authors=data.get("authors") if isinstance(data.get("authors"), list) else [str(data.get("authors", ""))],
            categories=data.get("categories") if isinstance(data.get("categories"), list) else str(data.get("categories", "cs.CL")).split(),
            publication_date=str(data.get("publication_date") or data.get("update_date") or "Unknown"),
            doi=data.get("doi"),
            journal_ref=data.get("journal_ref"),
            comments=data.get("comments"),
            cleaned_text=str(data.get("cleaned_text", "")),
        )


@dataclass
class RetrievalResult:
    """Result of vector similarity search over indexed cs.CL papers."""
    paper: ArxivPaper
    score: float
    matched_snippets: List[str] = field(default_factory=list)


@dataclass
class ExtractionResult:
    """Structured extraction of problem, method, and key findings from a paper."""
    paper_id: str
    paper_title: str
    problem_motivation: str
    method_approach: str
    key_findings_contributions: str
    confidence_score: float = 1.0


@dataclass
class PaperSummary:
    """Concise abstractive and extractive summary of paper(s)."""
    paper_id: str
    paper_title: str
    executive_summary: str
    key_bullet_points: List[str]
    method_highlight: str
    findings_highlight: str


@dataclass
class ScopeResult:
    """Scope validation result indicating whether query belongs to cs.CL domain."""
    is_in_scope: bool
    confidence: float
    detected_domains: List[str]
    reason: str
    suggested_redirect: Optional[str] = None


@dataclass
class ExplanationResult:
    """Final grounded answer and research explanation generated for user."""
    response_text: str
    cited_papers: List[Dict[str, str]]
    extracted_aspects: List[ExtractionResult]
    is_in_scope: bool
    resolved_query: str
    grounding_confidence: float


@dataclass
class DialogueTurn:
    """Single turn in a multi-turn conversation."""
    turn_id: int
    user_query: str
    resolved_query: str
    assistant_response: str
    retrieved_paper_ids: List[str]
    active_topic: str
    timestamp: float


@dataclass
class ConversationSession:
    """Tracks session-level dialogue history, active topics, and paper references."""
    session_id: str
    turns: List[DialogueTurn] = field(default_factory=list)
    active_topic: Optional[str] = None
    active_paper_ids: List[str] = field(default_factory=list)
    discussed_concepts: List[str] = field(default_factory=list)


@dataclass
class EvaluationMetrics:
    """Automated benchmark evaluation metrics across all 5 test dimensions."""
    retrieval_precision_at_k: float
    retrieval_recall_at_k: float
    retrieval_mrr: float
    summarization_coverage: float
    summarization_conciseness: float
    explanation_grounding_score: float
    explanation_hallucination_rate: float
    multi_turn_resolution_accuracy: float
    scope_boundary_accuracy: float
    scope_boundary_precision: float
    scope_boundary_recall: float
    total_tests_run: int
    passed_tests: int
