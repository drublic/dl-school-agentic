# Workshop examples: RAG vs MCP

Both examples search the same **employee handbook** vectors in Pinecone. The difference is **how tools are exposed to the LLM**.

## RAG (`example/rag/`)

**Retrieval-Augmented Generation** — retrieval tools run **in-process** inside your app.

```
User question → LangChain agent → search_documents() → Pinecone → LLM answer
```

- Tools are LangChain `tool()` bindings (TypeScript functions in memory)
- Your code owns the agent loop (`bindTools` → invoke → `ToolMessage`)
- Best for: apps you control end-to-end (API routes, scripts, agents)

```bash
npm run example:rag
npm run example:rag -- "How many PTO days do full-time employees get?"
```

## MCP (`example/mcp/`)

**Model Context Protocol** — tools run in a **separate server process** over stdio JSON-RPC.

```
User question → MCP host (Cursor, etc.) → handbook-server → Pinecone → host LLM
```

- Tools are declared on an `McpServer`; clients discover and call them remotely
- Same `search_documents` / `get_document_by_id` names, different wire format
- Best for: IDE integrations, reusable tool servers, multi-client setups

```bash
# Run server (stdio — for MCP hosts)
npm run example:mcp

# Demo client that spawns the server and calls tools
npm run example:mcp:demo
```

### Wire up in Cursor

Add to `~/.cursor/mcp.json` (adjust paths):

```json
{
  "mcpServers": {
    "handbook": {
      "command": "npx",
      "args": ["tsx", "example/mcp/handbook-server.ts"],
      "cwd": "/absolute/path/to/dl-agentic",
      "envFile": "/absolute/path/to/dl-agentic/.env"
    }
  }
}
```

## Shared code (`example/shared/`)

| Module | Role |
|--------|------|
| `handbook-store.ts` | Pinecone search + fetch (used by both patterns) |
| `load-env.ts` | Loads `dl-agentic/.env` |
| `types.ts` | Corpus + search result types |

Prerequisites: `npm run seed`, `PINECONE_API_KEY` + `OPENAI_API_KEY` in `.env`.
