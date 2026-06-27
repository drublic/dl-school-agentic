#!/usr/bin/env node
/**
 * MCP demo client — spawns handbook-server and calls tools over stdio.
 *
 * Shows the MCP pattern: separate process, JSON-RPC tools, host orchestrates.
 *
 * Usage:
 *   npm run example:mcp:demo
 *   npm run example:mcp:demo -- "How many remote work days per month?"
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadEnv } from "../shared/load-env.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const SERVER_SCRIPT = join(__dirname, "handbook-server.ts");

const DEFAULT_QUESTION =
  "How many remote work days per month are allowed?";

function toolText(result: unknown): string {
  if (
    result &&
    typeof result === "object" &&
    "content" in result &&
    Array.isArray(result.content)
  ) {
    const part = result.content.find(
      (c): c is { type: string; text: string } =>
        typeof c === "object" &&
        c !== null &&
        "type" in c &&
        c.type === "text" &&
        "text" in c &&
        typeof c.text === "string",
    );
    if (part) return part.text;
  }
  return JSON.stringify(result);
}

async function main(): Promise<void> {
  loadEnv();

  const question =
    process.argv.slice(2).join(" ").trim() || DEFAULT_QUESTION;

  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", SERVER_SCRIPT],
    cwd: ROOT,
    env: { ...process.env } as Record<string, string>,
  });

  const client = new Client({ name: "handbook-demo", version: "1.0.0" });
  await client.connect(transport);

  console.log("Pattern: MCP (stdio server + JSON-RPC tool calls)\n");
  console.log(`Question: ${question}\n`);

  const tools = await client.listTools();
  console.log(
    "Available MCP tools:",
    tools.tools.map((t) => t.name).join(", "),
  );

  console.log("\n→ search_documents via MCP…");
  const searchResult = await client.callTool({
    name: "search_documents",
    arguments: { query: question },
  });
  const searchText = toolText(searchResult);
  console.log(
    searchText.length > 400 ? `${searchText.slice(0, 400)}…` : searchText,
  );

  let topId: string | undefined;
  try {
    const hits = JSON.parse(searchText) as Array<{ id: string }>;
    topId = hits.find((h) => h.id !== "none")?.id;
  } catch {
    // non-JSON fallback
  }

  if (topId) {
    console.log(`\n→ get_document_by_id("${topId}") via MCP…`);
    const docResult = await client.callTool({
      name: "get_document_by_id",
      arguments: { id: topId },
    });
    console.log(toolText(docResult));
  }

  await client.close();
  console.log("\n(MCP demo stops after retrieval — the host LLM would synthesize the answer.)");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
