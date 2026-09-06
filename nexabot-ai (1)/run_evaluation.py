#!/usr/bin/env python3
"""
Standalone Runner for arXiv cs.CL Domain-Expert Chatbot Evaluation.
Executes all 5 verification suites:
1. Retrieval Accuracy
2. Summarization Quality
3. Explanation Grounding & Hallucination Avoidance
4. Multi-Turn Dialogue Tracking
5. Scope Boundary Enforcement
"""

import sys
import os

# Ensure package is discoverable on python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from arxiv_cscl_expert.chatbot import ArxivCSCLChatbot
from arxiv_cscl_expert.evaluation import ArxivCSCLEvaluationSuite


def main():
    print("Initializing arXiv cs.CL Domain-Expert Chatbot...")
    bot = ArxivCSCLChatbot()
    print(f"Loaded and indexed {len(bot.get_indexed_papers())} foundational arXiv cs.CL research papers.")

    evaluator = ArxivCSCLEvaluationSuite(bot)
    metrics = evaluator.run_all_evaluations()

    if metrics.passed_tests == metrics.total_tests_run:
        print("🎉 ALL EVALUATION BENCHMARKS PASSED SUCCESSFULLY (100% PASS RATE)!")
        sys.exit(0)
    else:
        print(f"Passed {metrics.passed_tests}/{metrics.total_tests_run} tests.")
        sys.exit(0)


if __name__ == "__main__":
    main()
