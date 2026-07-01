# Northstar Docs Assistant — Product FAQ

## What is it?

Northstar Docs Assistant is an internal tool that answers questions from company handbooks and policy PDFs. It uses retrieval-augmented generation: your documents are chunked, embedded, and searched at query time — the model never "learns" the PDF by training.

## Pricing (internal pilot)

- **Pilot tier**: free for teams under 10 users through Q4 2026
- **Production**: €2 per 1,000 queries + embedding storage costs
- **Enterprise**: custom VPC deployment, SSO required

## Limits

- Max file size per upload: **25 MB**
- Supported formats: PDF, Markdown, plain text
- Max chunks per index: **50,000** on pilot tier
- Rate limit: **60 queries/minute** per API key

## Data handling

Documents stay in your Pinecone index in the region you choose. Query text is sent to the configured LLM provider for answer generation. We do not use customer content to train foundation models.

## Support

Slack: `#docs-assistant` · Email: docs-assistant@northstar-labs.example
