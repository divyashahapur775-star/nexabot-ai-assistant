"""
Data Preparation & Processing Pipeline for arXiv cs.CL Papers.
Handles raw dataset ingestion (Kaggle JSON/JSONL, local JSON, or arXiv API),
filtering by cs.CL category, text cleaning/normalization, and structured schema mapping.
"""

import os
import re
import json
import gzip
from typing import List, Dict, Any, Optional, Generator
from .types import ArxivPaper


class ArxivCSCLDataPipeline:
    """
    Data preparation pipeline for extracting, filtering, and cleaning arXiv papers
    specifically under the cs.CL (Computation and Language) category.
    """

    def __init__(self, dataset_path: Optional[str] = None):
        default_dataset = os.path.join(os.path.dirname(__file__), "dataset", "cs_cl_papers.json")
        self.dataset_path = dataset_path or default_dataset

    @staticmethod
    def clean_text(text: str) -> str:
        """
        Cleans and normalizes raw arXiv paper text and abstracts:
        - Removes LaTeX math formatting ($...$, \\frac{}{}, \\textbf{})
        - Normalizes multiple whitespace, tabs, and newline artifacts
        - Strips arXiv identifier prefixes and legacy submission headers
        """
        if not text:
            return ""

        # Normalize line breaks and tabs
        cleaned = text.replace("\r\n", " ").replace("\n", " ").replace("\t", " ")

        # Remove common LaTeX formatting commands
        cleaned = re.sub(r"\\[a-zA-Z]+\{([^}]*)\}", r"\1", cleaned)  # e.g., \textbf{text} -> text
        cleaned = re.sub(r"\\[a-zA-Z]+", " ", cleaned)  # e.g., \alpha, \sim -> " "
        cleaned = re.sub(r"\$[^$]+\$", " ", cleaned)  # e.g., $x_i \in \mathbb{R}$ -> " "
        cleaned = re.sub(r"\{([^}]+)\}", r"\1", cleaned)  # e.g., {term} -> term

        # Remove arXiv citation header artifacts (e.g. arXiv:1706.03762v5 [cs.CL])
        cleaned = re.sub(r"arXiv:\d+\.\d+(?:v\d+)?\s*\[[a-zA-Z\.\-]+\]", "", cleaned, flags=re.IGNORECASE)

        # Collapse repeated spaces and trim
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        return cleaned

    @staticmethod
    def clean_authors(raw_authors: Any) -> List[str]:
        """Parses and structures author representations into a clean list of strings."""
        if isinstance(raw_authors, list):
            return [re.sub(r"\s+", " ", str(a)).strip() for a in raw_authors if str(a).strip()]

        if isinstance(raw_authors, str):
            # Parse comma/and separated author string
            authors = re.split(r",\s*|\s+and\s+", raw_authors)
            return [re.sub(r"\s+", " ", a).strip() for a in authors if a.strip()]

        return ["Unknown Author"]

    @staticmethod
    def is_cs_cl(categories: Any) -> bool:
        """
        Checks if a paper belongs to the cs.CL (Computation and Language) category.
        Accepts list of categories or space-separated category strings.
        """
        if isinstance(categories, list):
            return any("cs.CL" in str(cat) or "cs.cl" in str(cat).lower() for cat in categories)
        if isinstance(categories, str):
            cat_list = categories.split()
            return any("cs.CL" in c or "cs.cl" in c.lower() for c in cat_list)
        return False

    def load_and_filter_dataset(self, file_path: Optional[str] = None, max_papers: Optional[int] = None) -> List[ArxivPaper]:
        """
        Loads dataset file (JSON, JSONL, or GZIP), filters strictly for cs.CL,
        cleans text fields, and returns structured ArxivPaper instances.
        """
        target_path = file_path or self.dataset_path
        if not os.path.exists(target_path):
            raise FileNotFoundError(f"arXiv dataset file not found at: {target_path}")

        filtered_papers: List[ArxivPaper] = []

        # Check if file is gzip or regular text
        is_gz = target_path.endswith(".gz")
        open_fn = gzip.open if is_gz else open
        mode = "rt" if is_gz else "r"

        with open_fn(target_path, mode, encoding="utf-8", errors="ignore") as f:
            # Check if file is standard JSON array or JSONL (line-by-line)
            first_char = ""
            if not is_gz:
                pos = f.tell()
                first_char = f.read(1)
                f.seek(pos)

            if first_char == "[":
                # Standard JSON Array format
                raw_data = json.load(f)
                for item in raw_data:
                    if self.is_cs_cl(item.get("categories", "")):
                        paper = self._process_single_record(item)
                        if paper:
                            filtered_papers.append(paper)
                            if max_papers and len(filtered_papers) >= max_papers:
                                break
            else:
                # JSONL format (standard Kaggle arXiv snapshot format)
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        item = json.loads(line)
                        if self.is_cs_cl(item.get("categories", "")):
                            paper = self._process_single_record(item)
                            if paper:
                                filtered_papers.append(paper)
                                if max_papers and len(filtered_papers) >= max_papers:
                                    break
                    except json.JSONDecodeError:
                        continue

        return filtered_papers

    def _process_single_record(self, raw: Dict[str, Any]) -> Optional[ArxivPaper]:
        """Processes and normalizes a single raw record dictionary."""
        paper_id = str(raw.get("id", "")).strip()
        title = str(raw.get("title", "")).strip()
        abstract = str(raw.get("abstract", "")).strip()

        if not paper_id or not title or not abstract:
            return None

        # Category parsing
        raw_cats = raw.get("categories", "cs.CL")
        if isinstance(raw_cats, str):
            categories = raw_cats.split()
        elif isinstance(raw_cats, list):
            categories = [str(c) for c in raw_cats]
        else:
            categories = ["cs.CL"]

        clean_title = self.clean_text(title)
        clean_abstract = self.clean_text(abstract)
        authors = self.clean_authors(raw.get("authors", []))

        # Synthesize combined cleaned text representation for embedding/retrieval
        cleaned_text = f"Title: {clean_title}\nAuthors: {', '.join(authors)}\nCategory: cs.CL\nAbstract: {clean_abstract}"

        return ArxivPaper(
            id=paper_id,
            title=clean_title,
            abstract=clean_abstract,
            authors=authors,
            categories=categories,
            publication_date=str(raw.get("publication_date") or raw.get("update_date") or "2023"),
            doi=raw.get("doi"),
            journal_ref=raw.get("journal_ref"),
            comments=raw.get("comments"),
            cleaned_text=cleaned_text,
        )

    def export_filtered_dataset(self, output_path: str, papers: List[ArxivPaper]) -> str:
        """Exports the filtered and cleaned papers into a structured JSON file."""
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        data = [p.to_dict() for p in papers]
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return output_path
