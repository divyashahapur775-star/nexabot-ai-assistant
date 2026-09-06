"""
Scope Boundary Classifier for arXiv cs.CL (Computation and Language) Domain.
Detects whether incoming queries belong to NLP / Computation & Language,
or fall outside the specialized knowledge boundary (e.g., biology, astrophysics, medicine, finance).
"""

import re
from typing import List, Dict, Any, Tuple
from .types import ScopeResult


class ScopeBoundaryClassifier:
    """
    Validates domain scope for user questions.
    Ensures the assistant operates strictly as an expert in arXiv cs.CL research
    and gracefully declines out-of-scope queries with appropriate boundaries.
    """

    # Comprehensive vocabulary of Computation and Language (cs.CL) subtopics
    CS_CL_KEYWORDS = {
        "nlp", "natural language processing", "computational linguistics", "linguistics",
        "transformer", "transformers", "attention", "self-attention", "multi-head attention",
        "bert", "gpt", "gpt-3", "gpt-4", "t5", "roberta", "llama", "mamba", "distilbert",
        "lora", "qlora", "adapter", "parameter-efficient", "peft", "fine-tuning", "pre-training",
        "language model", "language models", "llm", "llms", "large language model",
        "token", "tokens", "tokenization", "byte-pair encoding", "bpe", "wordpiece", "sentencepiece",
        "embedding", "embeddings", "word2vec", "glove", "sentence-bert", "sbert", "vector space",
        "machine translation", "nmt", "translation", "bleu", "rouge", "bertscore", "meteor",
        "summarization", "abstractive", "extractive", "question answering", "qa", "squad", "reading comprehension",
        "information extraction", "named entity recognition", "ner", "relation extraction",
        "sentiment analysis", "parsing", "dependency parsing", "constituency parsing", "part of speech", "pos tagging",
        "rlhf", "dpo", "reinforcement learning from human feedback", "direct preference optimization", "constitutional ai",
        "prompt", "prompting", "chain-of-thought", "cot", "in-context learning", "few-shot", "zero-shot",
        "flashattention", "kv cache", "speculative decoding", "beam search", "nucleus sampling", "temperature",
        "retrieval-augmented generation", "rag", "dense passage retrieval", "dpr", "vector search",
        "dialogue", "dialogue systems", "conversational agent", "chatbot", "intent classification",
        "morphology", "syntax", "semantics", "pragmatics", "discourse", "phonetics", "speech recognition", "asr",
        "arxiv", "cs.cl", "sequence-to-sequence", "seq2seq", "encoder-decoder", "masked language model",
    }

    # Distinctly out-of-scope domains
    OUT_OF_SCOPE_DOMAINS: Dict[str, List[str]] = {
        "Biology / Medicine": [
            "dna", "rna", "crispr", "cellular respiration", "photosynthesis", "mitochondria",
            "cardiology", "oncology", "chemotherapy", "antibiotics", "protein folding", "genetics",
            "anatomy", "vaccine", "blood pressure", "diabetes", "coronary", "artery", "heart disease",
            "disease", "symptom", "diagnosis", "surgery", "patient", "clinical trial", "pharmacology"
        ],
        "Astrophysics / Planetary Science": [
            "black hole", "exoplanet", "dark matter", "dark energy", "supernova",
            "hubble constant", "gravitational wave", "stellar evolution", "neutron star",
            "astronomy", "schwarzschild", "galaxy", "telescope", "cosmology"
        ],
        "Chemistry / Materials Science": [
            "covalent bond", "stoichiometry", "titration", "organic synthesis", "polymers",
            "crystallography", "electrolysis", "enthalpy", "catalyst", "chemical reaction",
            "molecule", "atom", "periodic table"
        ],
        "Culinary & Food Preparation": [
            "sourdough", "bread", "starter", "bake", "baking", "cook", "cooking", "recipe",
            "cake", "pasta", "chef", "ingredient", "kitchen", "culinary"
        ],
        "General Non-CS / Lifestyle & Finance": [
            "stock market", "real estate", "celebrity", "sports betting", "football score",
            "travel itinerary", "car engine repair", "airline ticket", "weather forecast"
        ],
    }

    def evaluate_scope(self, query: str) -> ScopeResult:
        """
        Classifies whether a query is within the cs.CL domain.
        Returns a ScopeResult indicating scope status, confidence, and explanation.
        """
        query_lower = query.lower()
        tokens = re.findall(r"\b[a-zA-Z0-9_\-\.]{2,}\b", query_lower)

        # 1. Check for distinct out-of-scope domain indicators
        detected_out_domains: List[str] = []
        for domain_name, domain_keywords in self.OUT_OF_SCOPE_DOMAINS.items():
            for kw in domain_keywords:
                if re.search(r"\b" + re.escape(kw) + r"\b", query_lower):
                    detected_out_domains.append(domain_name)
                    break

        # 2. Check for in-scope cs.CL domain keywords
        matched_cs_cl = []
        for kw in self.CS_CL_KEYWORDS:
            if re.search(r"\b" + re.escape(kw) + r"\b", query_lower):
                matched_cs_cl.append(kw)

        # Decision Logic:
        # If out-of-scope terms exist and NO strong cs.CL keywords are present -> Out of Scope
        if detected_out_domains and not matched_cs_cl:
            out_domain_str = ", ".join(set(detected_out_domains))
            return ScopeResult(
                is_in_scope=False,
                confidence=0.96,
                detected_domains=list(set(detected_out_domains)),
                reason=f"The question pertains to {out_domain_str}, which falls outside arXiv cs.CL (Computation and Language).",
                suggested_redirect=(
                    f"I am a specialized research assistant grounded exclusively in the arXiv **cs.CL** "
                    f"(Computation and Language / NLP) literature. I cannot provide answers on {out_domain_str}. "
                    f"Please ask an NLP/Computation & Language research question (e.g., 'Explain the Transformer attention mechanism', "
                    f"'How does LoRA reduce fine-tuning memory?', or 'Compare BERT vs RoBERTa')."
                ),
            )

        # If strong cs.CL keywords are present -> In Scope
        if matched_cs_cl:
            return ScopeResult(
                is_in_scope=True,
                confidence=0.95,
                detected_domains=["cs.CL (Computation and Language)"],
                reason=f"Matched NLP/CL concepts: {', '.join(matched_cs_cl[:4])}",
            )

        # For conversational greetings or generic questions without out-of-scope flags
        is_greeting = any(g in query_lower for g in ["hello", "hi", "hey", "help", "who are you", "what can you do"])
        if is_greeting:
            return ScopeResult(
                is_in_scope=True,
                confidence=0.90,
                detected_domains=["General Dialogue / cs.CL Assistant"],
                reason="Conversational greeting directed at the research assistant.",
            )

        # Ambiguous query without strong indicators -> Default to in-scope with mild confidence
        return ScopeResult(
            is_in_scope=True,
            confidence=0.70,
            detected_domains=["cs.CL Exploration"],
            reason="Query evaluated against cs.CL corpus.",
        )
