#!/usr/bin/env python3
"""
Bulk Ingestion Script for arXiv cs.CL (Computation and Language) Dataset.
Queries the official Cornell University arXiv API (export.arxiv.org)
and fetches hundreds of verified cs.CL research papers.
Cleans, structures, and indexes metadata (Title, Abstract, Authors, ID, Publication Date, DOI).
"""

import urllib.request
import xml.etree.ElementTree as ET
import json
import time
import os
import re

ATOM_NS = "{http://www.w3.org/2005/Atom}"
ARXIV_NS = "{http://arxiv.org/schemas/atom}"

def clean_text(text: str) -> str:
    if not text:
        return ""
    # Strip non-printable and binary control characters
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def parse_entry(entry: ET.Element) -> dict:
    # Extract ID
    raw_id = entry.find(f"{ATOM_NS}id").text.strip()
    arxiv_id = raw_id.split("/abs/")[-1].split("v")[0] if "/abs/" in raw_id else raw_id
    
    # Title
    title = clean_text(entry.find(f"{ATOM_NS}title").text)
    
    # Abstract
    summary = clean_text(entry.find(f"{ATOM_NS}summary").text)
    
    # Published Date
    published = clean_text(entry.find(f"{ATOM_NS}published").text)[:10]
    
    # Authors
    authors = []
    for author_elem in entry.findall(f"{ATOM_NS}author"):
        name_elem = author_elem.find(f"{ATOM_NS}name")
        if name_elem is not None and name_elem.text:
            authors.append(clean_text(name_elem.text))
            
    # Categories
    categories = []
    for cat_elem in entry.findall(f"{ATOM_NS}category"):
        term = cat_elem.attrib.get("term")
        if term:
            categories.append(term)
            
    # Primary Category
    primary_cat_elem = entry.find(f"{ARXIV_NS}primary_category")
    if primary_cat_elem is not None:
        primary_cat = primary_cat_elem.attrib.get("term", "")
        if primary_cat and primary_cat not in categories:
            categories.insert(0, primary_cat)
            
    # DOI
    doi_elem = entry.find(f"{ARXIV_NS}doi")
    doi = doi_elem.text.strip() if doi_elem is not None and doi_elem.text else ""
    
    # Journal Ref
    jref_elem = entry.find(f"{ARXIV_NS}journal_ref")
    journal_ref = jref_elem.text.strip() if jref_elem is not None and jref_elem.text else ""

    return {
        "id": arxiv_id,
        "title": title,
        "abstract": summary,
        "authors": authors,
        "categories": categories if categories else ["cs.CL"],
        "publication_date": published,
        "doi": doi,
        "journal_ref": journal_ref
    }

def fetch_arxiv_batch(search_query: str, start: int = 0, max_results: int = 100) -> list:
    url = f"http://export.arxiv.org/api/query?search_query={search_query}&start={start}&max_results={max_results}&sortBy=submittedDate&sortOrder=descending"
    headers = {"User-Agent": "ArxivCSCLIngestionBot/1.0 (nlp-research-agent)"}
    req = urllib.request.Request(url, headers=headers)
    
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                xml_data = response.read()
                root = ET.fromstring(xml_data)
                entries = root.findall(f"{ATOM_NS}entry")
                papers = [parse_entry(e) for e in entries]
                return papers
        except Exception as e:
            print(f"  [Attempt {attempt+1}] Fetch error: {e}. Retrying in 3s...")
            time.sleep(3)
    return []

def main():
    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "arxiv_cscl_expert", "dataset")
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, "cs_cl_papers.json")
    
    print("=" * 65)
    print("  BULK INGESTION: Cornell University arXiv cs.CL Dataset")
    print("=" * 65)
    
    existing_papers = {}
    if os.path.exists(output_file):
        try:
            with open(output_file, "r", encoding="utf-8") as f:
                current_data = json.load(f)
                for p in current_data:
                    existing_papers[p["id"]] = p
            print(f"Loaded {len(existing_papers)} existing seed papers.")
        except Exception as e:
            print(f"Error reading existing file: {e}")

    # Fetch multiple pages of cs.CL papers from the live arXiv API
    target_count = 350
    start = 0
    batch_size = 100
    
    print(f"Initiating live harvesting from arXiv API for cat:cs.CL (Target: {target_count}+ papers)...")
    
    while start < target_count:
        print(f"Fetching batch from offset {start} to {start + batch_size}...")
        batch = fetch_arxiv_batch(search_query="cat:cs.CL", start=start, max_results=batch_size)
        if not batch:
            print("No more records returned or network timeout.")
            break
            
        for paper in batch:
            if "cs.CL" in paper["categories"] or any(c.startswith("cs.CL") for c in paper["categories"]):
                existing_papers[paper["id"]] = paper
                
        print(f"  --> Ingested {len(batch)} papers. Total unique cs.CL papers now: {len(existing_papers)}")
        start += batch_size
        time.sleep(1.5)  # Politeness interval for arXiv API rate limits

    # Also query key topical subsets in cs.CL to guarantee high-diversity coverage
    subsets = [
        "cat:cs.CL+AND+all:transformer",
        "cat:cs.CL+AND+all:translation",
        "cat:cs.CL+AND+all:summarization",
        "cat:cs.CL+AND+all:speech",
        "cat:cs.CL+AND+all:sentiment",
        "cat:cs.CL+AND+all:retrieval",
        "cat:cs.CL+AND+all:parsing"
    ]
    for sub in subsets:
        print(f"Fetching topical subset: {sub}...")
        batch = fetch_arxiv_batch(search_query=sub, start=0, max_results=30)
        for paper in batch:
            existing_papers[paper["id"]] = paper
        print(f"  --> Total unique papers: {len(existing_papers)}")
        time.sleep(1.5)

    all_papers = list(existing_papers.values())
    
    # Save formatted JSON dataset
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(all_papers, f, indent=2, ensure_ascii=False)
        
    print("\n" + "=" * 65)
    print(f"✅ BULK INGESTION COMPLETED: {len(all_papers)} real arXiv cs.CL papers saved to {output_file}")
    print("=" * 65)

if __name__ == "__main__":
    main()
