"""
Domain-Expert Chatbot for arXiv cs.CL (Computation and Language).
Orchestrates data preparation, vector retrieval, information extraction,
summarization, RAG explanation generation, multi-turn tracking, and scope enforcement.
"""

from typing import List, Dict, Any, Optional
from .types import ArxivPaper, ExtractionResult, PaperSummary, ExplanationResult, RetrievalResult, ScopeResult
from .data_pipeline import ArxivCSCLDataPipeline
from .vector_retriever import ArxivVectorRetriever
from .information_extractor import InformationExtractor
from .summarizer import PaperSummarizer
from .explanation_engine import ExplanationEngine
from .conversation_manager import ConversationManager
from .scope_boundary import ScopeBoundaryClassifier


class ArxivCSCLChatbot:
    """
    Main entry point and orchestrator for the arXiv cs.CL Domain-Expert Chatbot.
    """

    def __init__(
        self,
        dataset_path: Optional[str] = None,
        llm_endpoint: Optional[str] = None,
        max_retrieval_k: int = 4,
    ):
        self.data_pipeline = ArxivCSCLDataPipeline(dataset_path)
        self.retriever = ArxivVectorRetriever()
        self.extractor = InformationExtractor()
        self.summarizer = PaperSummarizer(self.extractor)
        self.explanation_engine = ExplanationEngine(
            extractor=self.extractor,
            summarizer=self.summarizer,
            llm_endpoint=llm_endpoint,
        )
        self.conversation_manager = ConversationManager()
        self.scope_classifier = ScopeBoundaryClassifier()
        self.max_retrieval_k = max_retrieval_k

        # Initialize and build vector index
        self._initialize_index()

    def _initialize_index(self):
        """Loads and indexes the cs.CL papers dataset."""
        papers = self.data_pipeline.load_and_filter_dataset()
        self.retriever.build_index(papers)

    def ask(self, query: str, session_id: str = "default_session") -> ExplanationResult:
        """
        Main query handler:
        1. Evaluates scope boundary (cs.CL vs out-of-scope).
        2. Resolves multi-turn context and conversational coreferences.
        3. Retrieves top-N grounded cs.CL papers.
        4. Extracts problem, method, and empirical findings.
        5. Generates technically rigorous RAG explanation.
        6. Updates session dialogue history.
        """
        # Step 1: Scope Boundary Enforcement
        scope_res: ScopeResult = self.scope_classifier.evaluate_scope(query)
        if not scope_res.is_in_scope:
            response_text = scope_res.suggested_redirect or scope_res.reason
            self.conversation_manager.record_turn(
                session_id=session_id,
                user_query=query,
                resolved_query=query,
                assistant_response=response_text,
                retrieved_papers=[],
            )
            return ExplanationResult(
                response_text=response_text,
                cited_papers=[],
                extracted_aspects=[],
                is_in_scope=False,
                resolved_query=query,
                grounding_confidence=1.0,
            )

        # Step 2: Multi-Turn Context Tracking & Coreference Resolution
        resolved_query = self.conversation_manager.resolve_query_context(session_id, query)

        # Step 3: Information Retrieval over arXiv cs.CL Vector Index
        retrieval_results: List[RetrievalResult] = self.retriever.retrieve_papers(
            resolved_query, top_k=self.max_retrieval_k
        )

        # Step 4 & 5: Information Extraction & RAG Explanation Generation
        conv_context = self.conversation_manager.get_conversation_context_string(session_id)
        explanation: ExplanationResult = self.explanation_engine.generate_explanation(
            user_query=resolved_query,
            retrieved_results=retrieval_results,
            conversation_context=conv_context,
        )

        # Step 6: Update Conversation Dialogue State
        retrieved_papers = [r.paper for r in retrieval_results]
        self.conversation_manager.record_turn(
            session_id=session_id,
            user_query=query,
            resolved_query=resolved_query,
            assistant_response=explanation.response_text,
            retrieved_papers=retrieved_papers,
        )

        return explanation

    def summarize_paper(self, paper_id: str) -> Optional[PaperSummary]:
        """Summarizes a specific paper by arXiv ID."""
        paper = self.retriever.get_paper_by_id(paper_id)
        if not paper:
            return None
        return self.summarizer.summarize_paper(paper)

    def extract_paper_details(self, paper_id: str) -> Optional[ExtractionResult]:
        """Extracts problem, method, and findings for a specific arXiv paper ID."""
        paper = self.retriever.get_paper_by_id(paper_id)
        if not paper:
            return None
        return self.extractor.extract(paper)

    def get_indexed_papers(self) -> List[ArxivPaper]:
        """Returns list of currently indexed cs.CL papers."""
        return self.retriever.papers
