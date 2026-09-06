# arXiv cs.CL Domain-Expert Chatbot Package
"""
Domain-Expert Chatbot grounded in arXiv cs.CL (Computation and Language) research papers.
Provides data preparation, vector indexing & retrieval, information extraction,
summarization, RAG explanation generation, multi-turn context tracking,
scope boundary handling, and automated evaluation.
"""

from .types import (
    ArxivPaper,
    ExtractionResult,
    PaperSummary,
    ExplanationResult,
    DialogueTurn,
    ConversationSession,
    RetrievalResult,
    ScopeResult,
    EvaluationMetrics,
)
from .data_pipeline import ArxivCSCLDataPipeline
from .vector_retriever import ArxivVectorRetriever
from .information_extractor import InformationExtractor
from .summarizer import PaperSummarizer
from .explanation_engine import ExplanationEngine
from .conversation_manager import ConversationManager
from .scope_boundary import ScopeBoundaryClassifier
from .chatbot import ArxivCSCLChatbot

__all__ = [
    "ArxivPaper",
    "ExtractionResult",
    "PaperSummary",
    "ExplanationResult",
    "DialogueTurn",
    "ConversationSession",
    "RetrievalResult",
    "ScopeResult",
    "EvaluationMetrics",
    "ArxivCSCLDataPipeline",
    "ArxivVectorRetriever",
    "InformationExtractor",
    "PaperSummarizer",
    "ExplanationEngine",
    "ConversationManager",
    "ScopeBoundaryClassifier",
    "ArxivCSCLChatbot",
]
