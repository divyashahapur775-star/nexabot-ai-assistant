#!/usr/bin/env python3
"""
Interactive CLI for arXiv cs.CL Domain-Expert Chatbot.
Allows researchers and students to query NLP/Computation and Language concepts,
summarize arXiv papers, and engage in multi-turn dialogues grounded in cs.CL literature.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from arxiv_cscl_expert.chatbot import ArxivCSCLChatbot


def main():
    print("=" * 65)
    print("  arXiv cs.CL Domain-Expert Chatbot (NLP & Computation/Language)")
    print("  Type your research question or 'exit' / 'quit' to end.")
    print("  Type 'eval' to run the automated benchmark test suite.")
    print("  Type 'list' to see indexed papers in the cs.CL corpus.")
    print("=" * 65 + "\n")

    bot = ArxivCSCLChatbot()
    session_id = "cli_researcher_session"
    papers = bot.get_indexed_papers()
    print(f"✅ Ready: {len(papers)} cs.CL papers indexed in vector store.\n")

    while True:
        try:
            query = input("\n[Researcher ❯] ").strip()
            if not query:
                continue

            if query.lower() in ["exit", "quit", "q"]:
                print("\nExiting arXiv cs.CL Chatbot. Happy researching!")
                break

            if query.lower() == "eval":
                from arxiv_cscl_expert.evaluation import ArxivCSCLEvaluationSuite
                evaluator = ArxivCSCLEvaluationSuite(bot)
                evaluator.run_all_evaluations()
                continue

            if query.lower() == "list":
                print(f"\n--- Indexed cs.CL Papers ({len(papers)}) ---")
                for p in papers:
                    authors_short = ", ".join(p.authors[:2]) + (" et al." if len(p.authors) > 2 else "")
                    print(f"• [{p.id}] {p.title} ({authors_short}, {p.publication_date[:4]})")
                continue

            print("\n[Thinking & Retrieving from cs.CL Corpus...]")
            res = bot.ask(query, session_id=session_id)
            print("\n" + res.response_text)

        except (KeyboardInterrupt, EOFError):
            print("\nSession ended.")
            break


if __name__ == "__main__":
    main()
