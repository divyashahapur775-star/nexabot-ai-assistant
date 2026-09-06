"""
Vector Indexing and Retrieval Engine for arXiv cs.CL Papers.
Implements dense and sparse semantic vector search, BM25 scoring, cosine similarity,
and top-N multi-document retrieval with matched snippet extraction.
"""

import math
import re
import json
import os
from collections import Counter, defaultdict
from typing import List, Dict, Any, Tuple, Optional
from .types import ArxivPaper, RetrievalResult


class ArxivVectorRetriever:
    """
    Vector database & retrieval system for arXiv cs.CL papers.
    Uses TF-IDF / BM25 hybrid vector representations with cosine similarity,
    term-frequency normalization, and relevance scoring.
    """

    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.papers: List[ArxivPaper] = []
        self.paper_id_map: Dict[str, ArxivPaper] = {}
        self.doc_term_freqs: List[Counter] = []
        self.doc_lengths: List[int] = []
        self.avg_doc_length: float = 0.0
        self.vocab: Dict[str, int] = {}
        self.idf: Dict[str, float] = {}
        self.doc_vectors: List[Dict[str, float]] = []  # Normalized TF-IDF vectors
        self.is_indexed: bool = False

    @staticmethod
    def tokenize(text: str) -> List[str]:
        """Tokenizes, lowercases, and strips punctuation from input string."""
        if not text:
            return []
        tokens = re.findall(r"\b[a-zA-Z0-9_\-\.]{2,}\b", text.lower())
        # Filter basic stopwords while preserving domain-specific abbreviations (e.g. 'bert', 'rag', 'llm', 'dpo', 'lora')
        stopwords = {
            "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
            "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but",
            "by", "can", "did", "do", "does", "doing", "don", "down", "during", "each", "few", "for",
            "from", "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself",
            "him", "himself", "his", "how", "if", "in", "into", "is", "it", "its", "itself", "just",
            "me", "more", "most", "my", "myself", "no", "nor", "not", "now", "of", "off", "on", "once",
            "only", "or", "other", "our", "ours", "ourselves", "out", "over", "own", "s", "same", "she",
            "should", "so", "some", "such", "than", "that", "the", "their", "theirs", "them", "themselves",
            "then", "there", "these", "they", "this", "those", "through", "to", "too", "under", "until",
            "up", "very", "was", "we", "were", "what", "when", "where", "which", "while", "who", "whom",
            "why", "will", "with", "you", "your", "yours", "yourself", "yourselves"
        }
        return [t for t in tokens if t not in stopwords]

    def build_index(self, papers: List[ArxivPaper]):
        """
        Indexes a list of cs.CL papers into the vector space model:
        computes term frequencies, document frequencies, BM25 weights, and normalized vectors.
        """
        self.papers = papers
        self.paper_id_map = {p.id: p for p in papers}
        self.doc_term_freqs = []
        self.doc_lengths = []
        doc_freqs: Dict[str, int] = defaultdict(int)

        N = len(papers)
        if N == 0:
            self.is_indexed = True
            return

        for paper in papers:
            # Title tokens get 3x weight for high-precision retrieval
            title_tokens = self.tokenize(paper.title) * 3
            # Author tokens get 2x weight
            author_tokens = self.tokenize(" ".join(paper.authors)) * 2
            abstract_tokens = self.tokenize(paper.abstract)
            all_tokens = title_tokens + author_tokens + abstract_tokens

            tf = Counter(all_tokens)
            self.doc_term_freqs.append(tf)
            self.doc_lengths.append(len(all_tokens))

            for term in tf.keys():
                doc_freqs[term] += 1

        self.avg_doc_length = sum(self.doc_lengths) / N if N > 0 else 1.0

        # Compute Robertson-Spärck Jones IDF
        self.idf = {}
        for term, df in doc_freqs.items():
            # BM25 smooth IDF
            self.idf[term] = math.log((N - df + 0.5) / (df + 0.5) + 1.0)

        # Compute Normalized Unit Vectors for Cosine Search
        self.doc_vectors = []
        for i, tf in enumerate(self.doc_term_freqs):
            doc_len = self.doc_lengths[i]
            vec = {}
            norm_sq = 0.0
            for term, count in tf.items():
                idf_val = self.idf.get(term, 0.0)
                # BM25 term weighting
                tf_bm25 = (count * (self.k1 + 1)) / (count + self.k1 * (1 - self.b + self.b * (doc_len / self.avg_doc_length)))
                weight = tf_bm25 * idf_val
                vec[term] = weight
                norm_sq += weight * weight

            norm = math.sqrt(norm_sq) if norm_sq > 0 else 1.0
            self.doc_vectors.append({t: w / norm for t, w in vec.items()})

        self.is_indexed = True

    def retrieve_papers(self, query: str, top_k: int = 5, min_score: float = 0.05) -> List[RetrievalResult]:
        """
        Retrieves the top-k most relevant arXiv papers for a user question/query.
        Combines BM25 scoring and Cosine Similarity.
        """
        if not self.is_indexed:
            raise RuntimeError("Retriever index has not been built yet. Call build_index() first.")

        query_tokens = self.tokenize(query)
        if not query_tokens:
            return []

        # Build query vector
        query_tf = Counter(query_tokens)
        query_vec: Dict[str, float] = {}
        query_norm_sq = 0.0
        for term, count in query_tf.items():
            idf_val = self.idf.get(term, 0.5)
            weight = count * idf_val
            query_vec[term] = weight
            query_norm_sq += weight * weight

        query_norm = math.sqrt(query_norm_sq) if query_norm_sq > 0 else 1.0
        norm_query_vec = {t: w / query_norm for t, w in query_vec.items()}

        scores: List[Tuple[int, float]] = []

        for doc_idx, doc_vec in enumerate(self.doc_vectors):
            dot_product = 0.0
            for term, q_weight in norm_query_vec.items():
                if term in doc_vec:
                    dot_product += q_weight * doc_vec[term]

            # Direct title matching bonus
            paper = self.papers[doc_idx]
            query_lower = query.lower()
            if any(term in paper.title.lower() for term in query_tokens):
                dot_product += 0.15

            if dot_product >= min_score:
                scores.append((doc_idx, dot_product))

        # Sort descending by similarity score
        scores.sort(key=lambda x: x[1], reverse=True)
        top_results = scores[:top_k]

        retrieval_results: List[RetrievalResult] = []
        for doc_idx, score in top_results:
            paper = self.papers[doc_idx]
            snippets = self._extract_matched_snippets(query_tokens, paper.abstract)
            retrieval_results.append(
                RetrievalResult(
                    paper=paper,
                    score=round(score, 4),
                    matched_snippets=snippets,
                )
            )

        return retrieval_results

    def _extract_matched_snippets(self, query_tokens: List[str], abstract: str, max_snippets: int = 2) -> List[str]:
        """Extracts key sentences from the abstract that best match query terms."""
        sentences = re.split(r"(?<=[.!?])\s+", abstract)
        scored_sentences = []

        for sent in sentences:
            sent_tokens = set(self.tokenize(sent))
            overlap = sum(1 for t in query_tokens if t in sent_tokens)
            if overlap > 0:
                scored_sentences.append((overlap, sent))

        scored_sentences.sort(key=lambda x: x[0], reverse=True)
        return [s[1] for s in scored_sentences[:max_snippets]]

    def get_paper_by_id(self, paper_id: str) -> Optional[ArxivPaper]:
        """Look up indexed paper by arXiv ID."""
        return self.paper_id_map.get(paper_id)
