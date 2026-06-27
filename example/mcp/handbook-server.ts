#!/usr/bin/env node
/**
 * MCP example — stdio server exposing handbook tools over the MCP protocol.
 *
 * Cursor, Claude Desktop, or any MCP client spawns this process and calls tools
 * via JSON-RPC. Same Pinecone backend as the RAG example; different wire format.
 *
 * Usage:
 *   npm run example:mcp
 *
 * Cursor config (dl-agentic/.cursor/mcp.json or ~/.cursor/mcp.json):
 *   {
 *     "mcpServers": {
 *       "handbook": {
 *         "command": "npx",
 *         "args": ["tsx", "example/mcp/handbook-server.ts"],
 *         "cwd": "/path/to/dl-agentic",
 *         "envFile": "/path/to/dl-agentic/.env"
 *       }
 *     }
 *   }
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadEnv } from "../shared/load-env.js";
import {
  getDocumentById,
  searchDocuments,
} from "../shared/handbook-store.js";

loadEnv();

if (!process.env.PINECONE_API_KEY) {
  console.error("Missing PINECONE_API_KEY — set in dl-agentic/.env");
  process.exit(1);
}
if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY — set in dl-agentic/.env");
  process.exit(1);
}

const server = new McpServer({
  name: "handbook",
  version: "1.0.0",
});

server.tool(
  "search_documents",
  "Search the employee handbook. Use when the answer may be in HR policy docs.",
  {
    query: z.string(),
    filters: z.record(z.unknown()).optional(),
  },
  async ({ query, filters }) => {
    const hits = await searchDocuments({ query, filters });
    return {
      content: [{ type: "text", text: JSON.stringify(hits, null, 2) }],
    };
  },
);

server.tool(
  "get_document_by_id",
  "Fetch full chunk text by document ID.",
  { id: z.string() },
  async ({ id }) => {
    const text = await getDocumentById(id);
    return {
      content: [{ type: "text", text }],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
