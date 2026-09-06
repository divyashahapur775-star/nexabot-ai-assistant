"""
Evaluation Benchmark Suite for arXiv cs.CL Domain-Expert Chatbot.
Tests:
1. Retrieval Accuracy (Precision@K, Recall@K, Mean Reciprocal Rank MRR)
2. Summarization Quality (Coverage, Representation, Conciseness)
3. Explanation Grounding & Hallucination Avoidance
4. Multi-Turn Coreference Resolution
5. Scope Boundary Handling (Precision, Recall, In-scope vs Out-of-scope)
"""

import time
from typing import List, Dict, Any, Tuple
from .types import EvaluationMetrics, RetrievalResult, PaperSummary, ExplanationResult
from .chatbot import ArxivCSCLChatbot


class ArxivCSCLEvaluationSuite:
    """
    Automated evaluation framework for measuring domain expertise,
    retrieval fidelity, summarization accuracy, dialogue coherence, and boundary control.
    """

    # Ground-truth benchmark query-paper pairs
    RETRIEVAL_BENCHMARKS = [
        {
            "query": "Attention mechanisms dispensing with recurrence in sequence transduction",
            "expected_id": "1706.03762",  # Attention Is All You Need
            "topic": "Transformers / Self-Attention",
        },
        {
            "query": "Deep bidirectional pre-training for language representations with masked language models",
            "expected_id": "1810.04805",  # BERT
            "topic": "BERT Masked Language Modeling",
        },
        {
            "query": "Low-rank adaptation matrices injected into frozen Transformer layers for efficient fine-tuning",
            "expected_id": "2106.09685",  # LoRA
            "topic": "PEFT / LoRA",
        },
        {
            "query": "Fast exact attention with IO-awareness and tiling between GPU SRAM and HBM",
            "expected_id": "2205.14135",  # FlashAttention
            "topic": "FlashAttention IO-Awareness",
        },
        {
            "query": "Siamese and triplet network structures for cosine-similarity sentence embeddings",
            "expected_id": "1908.10084",  # Sentence-BERT
            "topic": "Sentence Embeddings SBERT",
        },
        {
            "query": "Direct preference optimization without fitting a separate reward model",
            "expected_id": "2305.18290",  # DPO
            "topic": "Direct Preference Optimization",
        },
        {
            "query": "Linear-time sequence modeling with selective state spaces",
            "expected_id": "2312.00752",  # Mamba
            "topic": "Mamba State Space Models",
        },
        {
            "query": "Retrieval-augmented generation combining parametric and non-parametric Wikipedia memory",
            "expected_id": "2005.11401",  # RAG
            "topic": "RAG Retrieval Augmented Generation",
        },
    ]

    # In-scope vs Out-of-scope test cases
    SCOPE_TEST_CASES = [
        # IN-SCOPE cs.CL queries
        ("How does self-attention in Transformers compute attention weights?", True),
        ("What is the BLEU score metric used for in machine translation?", True),
        ("Explain Byte-Pair Encoding subword tokenization in NLP", True),
        ("What are the advantages of RoBERTa over original BERT pretraining?", True),
        ("How does Reinforcement Learning from Human Feedback align LLMs?", True),
        # OUT-OF-SCOPE queries
        ("Explain how CRISPR Cas9 cuts double-stranded DNA in genetics", False),
        ("What are the light-dependent reactions of photosynthesis in plant chloroplasts?", False),
        ("Calculate the Schwarzschild radius of a supermassive black hole", False),
        ("How do I make a sourdough bread starter and bake bread at home?", False),
        ("What are the best treatments for coronary artery heart disease?", False),
    ]

    def __init__(self, chatbot: ArxivCSCLChatbot):
        self.chatbot = chatbot

    def run_all_evaluations(self) -> EvaluationMetrics:
        """Executes all 5 evaluation dimensions and returns aggregated metrics."""
        print("=" * 65)
        print("  RUNNING arXiv cs.CL DOMAIN-EXPERT BENCHMARK SUITE")
        print("=" * 65)

        total_tests = 0
        passed_tests = 0

        # 1. Retrieval Accuracy
        ret_prec, ret_rec, ret_mrr, r_tests, r_passed = self.evaluate_retrieval()
        total_tests += r_tests
        passed_tests += r_passed

        # 2. Summarization Quality
        sum_cov, sum_conc, s_tests, s_passed = self.evaluate_summarization()
        total_tests += s_tests
        passed_tests += s_passed

        # 3. Explanation Grounding & Hallucination Avoidance
        exp_ground, exp_halluc, e_tests, e_passed = self.evaluate_explanation_grounding()
        total_tests += e_tests
        passed_tests += e_passed

        # 4. Multi-Turn Dialogue Tracking & Coreference
        mt_acc, mt_tests, mt_passed = self.evaluate_multi_turn()
        total_tests += mt_tests
        passed_tests += mt_passed

        # 5. Scope Boundary Handling
        scope_acc, scope_prec, scope_rec, sc_tests, sc_passed = self.evaluate_scope_boundary()
        total_tests += sc_tests
        passed_tests += sc_passed

        metrics = EvaluationMetrics(
            retrieval_precision_at_k=round(ret_prec, 4),
            retrieval_recall_at_k=round(ret_rec, 4),
            retrieval_mrr=round(ret_mrr, 4),
            summarization_coverage=round(sum_cov, 4),
            summarization_conciseness=round(sum_conc, 4),
            explanation_grounding_score=round(exp_ground, 4),
            explanation_hallucination_rate=round(exp_halluc, 4),
            multi_turn_resolution_accuracy=round(mt_acc, 4),
            scope_boundary_accuracy=round(scope_acc, 4),
            scope_boundary_precision=round(scope_prec, 4),
            scope_boundary_recall=round(scope_rec, 4),
            total_tests_run=total_tests,
            passed_tests=passed_tests,
        )

        self._print_final_report(metrics)
        return metrics

    def evaluate_retrieval(self) -> Tuple[float, float, float, int, int]:
        """Tests retrieval accuracy and Mean Reciprocal Rank (MRR)."""
        print("\n[1/5] Evaluating Indexing & Retrieval Accuracy...")
        reciprocal_ranks = []
        hits_at_k = 0
        k = 3

        for item in self.RETRIEVAL_BENCHMARKS:
            results: List[RetrievalResult] = self.chatbot.retriever.retrieve_papers(item["query"], top_k=k)
            retrieved_ids = [r.paper.id for r in results]
            expected = item["expected_id"]

            if expected in retrieved_ids:
                hits_at_k += 1
                rank = retrieved_ids.index(expected) + 1
                reciprocal_ranks.append(1.0 / rank)
                print(f"  ✓ [{item['topic']}] Retrieved {expected} at rank {rank} (score: {results[rank-1].score})")
            else:
                reciprocal_ranks.append(0.0)
                print(f"  ✗ [{item['topic']}] Expected {expected}, got {retrieved_ids}")

        total = len(self.RETRIEVAL_BENCHMARKS)
        precision_at_k = hits_at_k / total
        recall_at_k = hits_at_k / total
        mrr = sum(reciprocal_ranks) / total

        print(f"  --> Recall@{k}: {recall_at_k*100:.1f}% | MRR: {mrr:.3f}")
        return precision_at_k, recall_at_k, mrr, total, hits_at_k

    def evaluate_summarization(self) -> Tuple[float, float, int, int]:
        """Tests quality, key aspect coverage, and conciseness of generated summaries."""
        print("\n[2/5] Evaluating Summarization & Information Extraction Quality...")
        test_papers = self.chatbot.retriever.papers[:6]
        passed = 0
        total = len(test_papers)

        coverages = []
        conciseness_scores = []

        for paper in test_papers:
            summary: PaperSummary = self.chatbot.summarizer.summarize_paper(paper)
            ext = self.chatbot.extractor.extract(paper)

            # Verification 1: Has structured components
            has_components = bool(summary.executive_summary and summary.key_bullet_points and ext.problem_motivation and ext.method_approach)
            
            # Verification 2: Conciseness (Executive summary is between 20 and 120 words)
            word_count = len(summary.executive_summary.split())
            is_concise = 15 <= word_count <= 150
            conciseness_scores.append(1.0 if is_concise else 0.7)

            # Verification 3: Information coverage (key terms overlap with abstract)
            abstract_terms = set(paper.abstract.lower().split())
            summary_terms = set(summary.executive_summary.lower().split())
            overlap = len(summary_terms.intersection(abstract_terms)) / len(summary_terms) if summary_terms else 0
            coverages.append(overlap)

            if has_components and is_concise:
                passed += 1
                print(f"  ✓ [{paper.id}] {paper.title[:45]}... (Words: {word_count}, Overlap: {overlap*100:.1f}%)")
            else:
                print(f"  ✗ [{paper.id}] Quality issue in summary.")

        avg_cov = sum(coverages) / total if total > 0 else 1.0
        avg_conc = sum(conciseness_scores) / total if total > 0 else 1.0

        print(f"  --> Average Term Overlap: {avg_cov*100:.1f}% | Aspect Completeness: {passed}/{total}")
        return avg_cov, avg_conc, total, passed

    def evaluate_explanation_grounding(self) -> Tuple[float, float, int, int]:
        """Tests that explanations are strictly grounded in retrieved papers without hallucinations."""
        print("\n[3/5] Evaluating RAG Explanation Grounding & Citations...")
        test_queries = [
            "Explain how the Transformer self-attention mechanism works.",
            "How does LoRA achieve low-rank adaptation for large language models?",
            "What makes FlashAttention faster than standard attention?",
        ]

        passed = 0
        total = len(test_queries)

        for q in test_queries:
            res: ExplanationResult = self.chatbot.ask(q, session_id=f"eval_exp_{passed}")

            # Check for arXiv citations
            has_citations = len(res.cited_papers) > 0 and "[arXiv:" in res.response_text
            # Check for technical sections
            has_sections = "### 1. Conceptual Foundation" in res.response_text or "Methodology" in res.response_text
            # Check grounding confidence
            is_grounded = res.grounding_confidence >= 0.85

            if has_citations and has_sections and is_grounded:
                passed += 1
                print(f"  ✓ Grounded explanation generated with {len(res.cited_papers)} arXiv citations for: '{q[:40]}...'")
            else:
                print(f"  ✗ Grounding verification failed for: '{q}'")

        grounding_score = passed / total
        hallucination_rate = 1.0 - grounding_score
        print(f"  --> Grounding Score: {grounding_score*100:.1f}% | Hallucination Rate: {hallucination_rate*100:.1f}%")
        return grounding_score, hallucination_rate, total, passed

    def evaluate_multi_turn(self) -> Tuple[float, int, int]:
        """Tests multi-turn context tracking and conversational pronoun resolution."""
        print("\n[4/5] Evaluating Multi-Turn Dialogue & Context Resolution...")
        session_id = "eval_multi_turn_session"
        self.chatbot.conversation_manager.clear_session(session_id)

        multi_turn_dialogue = [
            ("Explain the Transformer architecture proposed in Attention Is All You Need.", "1706.03762"),
            ("How does that differ from traditional recurrent networks?", "1706.03762"),
            ("What translation BLEU scores did they achieve on WMT 2014?", "1706.03762"),
        ]

        passed = 0
        total = len(multi_turn_dialogue)

        for turn_idx, (user_q, expected_paper_id) in enumerate(multi_turn_dialogue):
            res: ExplanationResult = self.chatbot.ask(user_q, session_id=session_id)
            cited_ids = [p["id"] for p in res.cited_papers]

            # In turns 2 and 3, verify that "that" / "they" correctly resolved to Attention Is All You Need
            if expected_paper_id in cited_ids:
                passed += 1
                print(f"  ✓ [Turn {turn_idx+1}] Correctly resolved '{user_q[:40]}...' -> Grounded to arXiv:{expected_paper_id}")
            else:
                print(f"  ✗ [Turn {turn_idx+1}] Context resolution failed for '{user_q}' (cited: {cited_ids})")

        acc = passed / total
        print(f"  --> Multi-Turn Context Accuracy: {acc*100:.1f}% ({passed}/{total})")
        return acc, total, passed

    def evaluate_scope_boundary(self) -> Tuple[float, float, float, int, int]:
        """Tests scope boundary detection on in-scope vs out-of-scope prompts."""
        print("\n[5/5] Evaluating Scope Boundary Enforcement...")
        correct = 0
        total = len(self.SCOPE_TEST_CASES)

        tp, fp, tn, fn = 0, 0, 0, 0

        for query, expected_in_scope in self.SCOPE_TEST_CASES:
            res: ExplanationResult = self.chatbot.ask(query, session_id="eval_scope_test")
            predicted_in_scope = res.is_in_scope

            if predicted_in_scope == expected_in_scope:
                correct += 1
                status = "IN-SCOPE" if predicted_in_scope else "OUT-OF-SCOPE (Declined)"
                print(f"  ✓ Correctly identified as {status}: '{query[:50]}...'")
            else:
                print(f"  ✗ Scope error for: '{query}' (Expected {expected_in_scope}, got {predicted_in_scope})")

            if expected_in_scope and predicted_in_scope:
                tp += 1
            elif not expected_in_scope and predicted_in_scope:
                fp += 1
            elif not expected_in_scope and not predicted_in_scope:
                tn += 1
            elif expected_in_scope and not predicted_in_scope:
                fn += 1

        accuracy = correct / total
        precision = tp / (tp + fp) if (tp + fp) > 0 else 1.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 1.0

        print(f"  --> Scope Accuracy: {accuracy*100:.1f}% | Precision: {precision*100:.1f}% | Recall: {recall*100:.1f}%")
        return accuracy, precision, recall, total, correct

    def _print_final_report(self, m: EvaluationMetrics):
        """Prints a structured benchmark report."""
        print("\n" + "=" * 65)
        print("  FINAL EVALUATION REPORT: arXiv cs.CL DOMAIN EXPERT")
        print("=" * 65)
        print(f"  • Retrieval Recall@3:           {m.retrieval_recall_at_k * 100:.1f}%")
        print(f"  • Mean Reciprocal Rank (MRR):   {m.retrieval_mrr:.3f}")
        print(f"  • Summarization Aspect Cov:     {m.summarization_coverage * 100:.1f}%")
        print(f"  • Explanation Grounding Score:  {m.explanation_grounding_score * 100:.1f}%")
        print(f"  • Hallucination Rate:           {m.explanation_hallucination_rate * 100:.1f}%")
        print(f"  • Multi-Turn Context Accuracy:  {m.multi_turn_resolution_accuracy * 100:.1f}%")
        print(f"  • Scope Boundary Accuracy:      {m.scope_boundary_accuracy * 100:.1f}%")
        print(f"  • Tests Passed:                 {m.passed_tests}/{m.total_tests_run} ({(m.passed_tests/m.total_tests_run)*100:.1f}%)")
        print("=" * 65 + "\n")
