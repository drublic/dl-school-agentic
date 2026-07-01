# Northstar Docs Assistant — Onboarding Guide

## Prerequisites

- Node.js 20+
- Pinecone account + API key
- OpenAI (or compatible) API key for embeddings and chat

## Setup (15 minutes)

1. Clone the workshop repo and run `npm install`.
2. Copy `env.example` → `.env` and fill in `PINECONE_API_KEY` and `OPENAI_API_KEY`.
3. Choose a **dedicated namespace** per developer, e.g. `alex-dev` — never write to `workshop-shared` after the session.
4. Prepare a `corpus.json` with chunked text from your documents (see `data/handbook-corpus.json` for schema).
5. Run the seed script to embed and upsert chunks.
6. Run the deterministic RAG example against your namespace.

## First successful query

Ask: *"What is the max file size per upload?"*  
Expected: answer cites **25 MB** from the Product FAQ.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| Empty retrieval | Wrong namespace or index not seeded | Check `WORKSHOP_PINECONE_NAMESPACE`, re-run seed |
| Wrong chunks | Chunk boundaries split tables/sentences | Increase overlap or chunk by heading |
| Confident wrong answer | No refusal rule in system prompt | Add "answer only from context; refuse if missing" |
| Slow queries | Cold index or large top-k | Reduce `TOP_K` to 3–5 |

## Next steps

Add a golden set of 10 question/section pairs and run them after every corpus change.
