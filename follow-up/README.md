# Follow-up: Build your own RAG app

Optional task after the workshop — for everyone who wants to go deeper.

## Goal

Index **your own** documents in **your own** Pinecone namespace and answer questions from them with a small RAG chain. Same pipeline as today, new corpus.

## Starter documents (or bring your own)

This folder includes two fictional docs you can use as-is:

| File | Use for |
|------|---------|
| `documents/product-faq.md` | Product features, pricing, limits |
| `documents/onboarding-guide.md` | Setup steps, troubleshooting |

Or replace them with 2–3 PDFs/Markdown files from your domain (team wiki export, policy notes, API readme).

## Steps

1. **Prepare chunks** — Split each doc into sections (~300–800 tokens). Add metadata: `source`, `section`, `page` (if applicable).
2. **Create a corpus file** — Copy `data/handbook-corpus.json` → `follow-up/my-corpus.json` and replace `chunks` with your text.
3. **Seed your namespace** — Use a **personal** Pinecone namespace (not `workshop-shared`):

   ```bash
   WORKSHOP_PINECONE_NAMESPACE=your-name-dev npm run seed -- follow-up/my-corpus.json
   ```

   (Extend `seed/seed-handbook-vectors.mjs` to accept a corpus path, or duplicate the script once.)

4. **Wire retrieval** — Fork `example/rag/deterministic-chain.ts` → `follow-up/my-rag.ts`. Point `searchDocuments` at your namespace (env var or new store module).
5. **Query** — Run 5 questions you care about + 1 question **not** in the docs (refusal test).
6. **Stretch** — Add citations in the answer template; log `chunk_ids` and scores.

## Done when

- [ ] At least 2 documents indexed under your namespace
- [ ] `npm run …` returns an answer with a quote from the right section
- [ ] One unanswerable question gets a clear refusal (not a hallucination)

## References

- Workshop repo: `example/rag/deterministic-chain.ts`, `example/shared/handbook-store.ts`
- LangChain.js retrieval: https://js.langchain.com/docs/how_to/#retrieval
- Pinecone quickstart: https://docs.pinecone.io/guides/get-started/quickstart
