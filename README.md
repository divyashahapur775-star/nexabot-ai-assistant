PROJECT TITLE: AI Chatbot Suite - Data Science Internship Project

OVERVIEW
--------
This project is a suite of AI-powered chatbot capabilities developed during a Data Science internship, covering six core tasks: sentiment analysis, medical question-answering, dynamic knowledge base expansion, domain-specific research assistance, multi-modal (text + image) understanding, and multilingual conversation support.

TASKS IMPLEMENTED
------------------

1. SENTIMENT ANALYSIS CHATBOT
   Detects positive, negative, and neutral sentiment in user messages and generates emotionally appropriate responses.
   File(s): server/sentimentService.ts

2. MEDICAL Q&A CHATBOT (MedQuAD Dataset)
   A specialized chatbot answering medical questions using the MedQuAD dataset, with retrieval-based answers and basic medical entity recognition (symptoms, diseases, treatments).
   File(s): server/medquadService.ts, server/medquadData.ts
   Note: MedQuAD dataset is embedded directly within medquadData.ts as structured code (not a separate raw data file).

3. DYNAMIC KNOWLEDGE BASE EXPANSION
   Allows new information to be added to the chatbot's knowledge base and incorporated into future responses via vector database updates.
   File(s): dynamic_kb_expansion.py, server/knowledgeEngine.ts, server/firestoreKnowledgeService.ts

4. DOMAIN-EXPERT CHATBOT (arXiv cs.CL Dataset)
   A chatbot trained on the Computational Linguistics (cs.CL) subset of the arXiv dataset, capable of explaining advanced NLP concepts, summarizing research papers, answering follow-up questions, and generating concept visualizations.
   File(s): arxiv_cscl_expert/ (chatbot.py, summarizer.py, explanation_engine.py, information_extractor.py, vector_retriever.py, visualizer.py)
   Dataset: arxiv_cscl_expert/dataset/ (included in this repository)

5. MULTI-MODAL AI ASSISTANT
   Understands and reasons over both text and image inputs, extracting relevant information, maintaining conversational context, and generating evidence-based responses.
   File(s): server/multimodal/

6. MULTILINGUAL CHATBOT
   Extends the chatbot to support multilingual conversations in Hindi, Kannada, and French (in addition to English), with automatic language detection, context retention across language switches, and mixed-language input handling.
   File(s): server/multilingualDialogueEngine.ts, server/multilingualContext.ts, src/pages/MultilingualChat.tsx

TECH STACK
----------
Frontend: React (TypeScript), Vite
Backend: Node.js / Express (TypeScript), Python (for arXiv domain-expert module)
Database: Firestore (knowledge base, user data)
UI Framework: Streamlit (for Task 4 - Domain Expert module)

PROJECT STRUCTURE
------------------
src/                        - Frontend React source code (pages, components, context)
server/                     - Backend services (sentiment, medical QA, knowledge engine, multilingual, multimodal)
arxiv_cscl_expert/          - Python-based domain-expert chatbot (Task 4), including dataset
public/                     - Static assets (images, diagrams)
dynamic_kb_expansion.py     - Knowledge base expansion script (Task 3)
ingest_arxiv_bulk.py        - arXiv data ingestion script
run_cli.py, run_evaluation.py - CLI and evaluation utilities

DATASET
-------
The arXiv cs.CL dataset (cs_cl_papers.json, cs_cl_papers_cleaned.json) is included directly in this repository under arxiv_cscl_expert/dataset/.

A copy is also available on Google Drive as a backup: [INSERT YOUR GOOGLE DRIVE LINK HERE]

Note: The MedQuAD medical Q&A dataset is embedded directly in the source code (server/medquadData.ts) and does not require separate download.

SETUP INSTRUCTIONS
-------------------
1. Clone this repository
2. Install dependencies: npm install
3. For the Python-based domain-expert module, install requirements: pip install -r requirements_task3.txt
4. Set up environment variables using .env.example as a template
5. Run the application: npm run dev

TESTING & VALIDATION
---------------------
All six tasks were systematically tested with structured test cases covering standard functionality, edge cases, and cross-task consistency. Critical bugs identified during testing (in knowledge base retrieval, concept visualization, and image processing) were resolved and reverified.

KNOWN LIMITATIONS
------------------
- In rare cases, medical queries containing urgency-related keywords (Task 2) may trigger an additional customer-support style prompt due to shared keyword-detection logic across modules. This does not affect the accuracy of the underlying medical answer and has been identified for future refinement.

AUTHOR
------
[Your Name]
Data Science Internship - [Internship/Company Name]
[Date]
