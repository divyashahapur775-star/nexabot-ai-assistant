"""
Multi-Turn Conversation and Context Tracking Manager.
Maintains session state, dialogue history, active topics, and paper references.
Performs anaphora resolution and query rewriting for follow-up questions
(e.g., "How does that differ from RNNs?", "What were their benchmark results?").
"""

import re
import time
from typing import List, Dict, Any, Optional
from .types import ConversationSession, DialogueTurn, ArxivPaper


class ConversationManager:
    """
    Tracks multi-turn dialogue context across user interaction sessions.
    Resolves conversational pronouns, context references, and ordinal paper mentions.
    """

    PRONOUN_PATTERNS = [
        r"\bthat\b",
        r"\bit\b",
        r"\bthis\b",
        r"\bthese\b",
        r"\bthey\b",
        r"\btheir\s+(?:approach|method|paper|results|findings|model)\b",
        r"\bthe\s+previous\s+(?:paper|model|work|method)\b",
        r"\bthe\s+(?:first|second|third|last)\s+(?:paper|one|method)\b",
    ]

    def __init__(self):
        self.sessions: Dict[str, ConversationSession] = {}

    def get_or_create_session(self, session_id: str) -> ConversationSession:
        """Retrieves existing session state or initializes a new one."""
        if session_id not in self.sessions:
            self.sessions[session_id] = ConversationSession(session_id=session_id)
        return self.sessions[session_id]

    def resolve_query_context(self, session_id: str, raw_query: str) -> str:
        """
        Resolves coreference and anaphoric references in follow-up questions
        using recent session history.
        Example:
          Turn 1: "Explain the Transformer attention mechanism in Attention Is All You Need"
          Turn 2: "How does that differ from RNNs?"
          Resolved Query: "How does Transformer attention mechanism differ from Recurrent Neural Networks (RNNs)?"
        """
        session = self.get_or_create_session(session_id)
        if not session.turns:
            return raw_query.strip()

        last_turn = session.turns[-1]
        active_topic = session.active_topic or last_turn.active_topic
        query_lower = raw_query.lower()

        # Check for coreference pronouns
        has_pronoun = any(re.search(p, query_lower) for p in self.PRONOUN_PATTERNS)
        is_short_followup = len(raw_query.split()) <= 7 and ("how" in query_lower or "what" in query_lower or "why" in query_lower or "compare" in query_lower or "differ" in query_lower)

        resolved_query = raw_query.strip()

        if (has_pronoun or is_short_followup) and active_topic:
            # Ordinal paper reference resolution
            if "first paper" in query_lower or "the first one" in query_lower:
                if len(session.active_paper_ids) >= 1:
                    resolved_query = f"Regarding arXiv paper {session.active_paper_ids[0]}: {raw_query}"
            elif "second paper" in query_lower or "the second one" in query_lower:
                if len(session.active_paper_ids) >= 2:
                    resolved_query = f"Regarding arXiv paper {session.active_paper_ids[1]}: {raw_query}"
            elif "previous paper" in query_lower or "last paper" in query_lower:
                if session.active_paper_ids:
                    resolved_query = f"Regarding arXiv paper {session.active_paper_ids[0]}: {raw_query}"
            else:
                # Replace pronouns like "that", "it", "this" with active topic
                subbed = re.sub(r"\bthat\b", active_topic, resolved_query, flags=re.IGNORECASE)
                subbed = re.sub(r"\bit\b", active_topic, subbed, flags=re.IGNORECASE)
                subbed = re.sub(r"\bthis\s+method\b", active_topic, subbed, flags=re.IGNORECASE)
                subbed = re.sub(r"\btheir\s+approach\b", f"{active_topic} approach", subbed, flags=re.IGNORECASE)

                if subbed == resolved_query:
                    # Append active topic context
                    resolved_query = f"{raw_query} (in context of {active_topic})"
                else:
                    resolved_query = subbed

        return resolved_query

    def record_turn(
        self,
        session_id: str,
        user_query: str,
        resolved_query: str,
        assistant_response: str,
        retrieved_papers: List[ArxivPaper],
    ):
        """Records completed turn, updates active topic and active paper references."""
        session = self.get_or_create_session(session_id)
        turn_id = len(session.turns) + 1

        # Extract dominant topic from retrieved papers or user query
        paper_ids = [p.id for p in retrieved_papers]
        if retrieved_papers:
            active_topic = retrieved_papers[0].title
        else:
            active_topic = resolved_query

        # Update session state
        session.active_topic = active_topic
        session.active_paper_ids = paper_ids
        if active_topic not in session.discussed_concepts:
            session.discussed_concepts.append(active_topic)

        turn = DialogueTurn(
            turn_id=turn_id,
            user_query=user_query,
            resolved_query=resolved_query,
            assistant_response=assistant_response,
            retrieved_paper_ids=paper_ids,
            active_topic=active_topic,
            timestamp=time.time(),
        )
        session.turns.append(turn)

    def get_conversation_context_string(self, session_id: str, max_turns: int = 3) -> str:
        """Formats the last N turns as context for prompt injection."""
        session = self.get_or_create_session(session_id)
        if not session.turns:
            return ""

        context_turns = session.turns[-max_turns:]
        lines = []
        for t in context_turns:
            lines.append(f"User (Turn {t.turn_id}): {t.user_query}")
            # Truncate lengthy assistant replies to fit context window
            resp_summary = t.assistant_response.split("\n\n")[0][:250]
            lines.append(f"Assistant: {resp_summary}...")
        return "\n".join(lines)

    def clear_session(self, session_id: str):
        """Resets session history."""
        if session_id in self.sessions:
            del self.sessions[session_id]
