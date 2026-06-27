#!/usr/bin/env node
/**
 * RAG example — LangChain agent with in-process retrieval tools.
 *
 * The LLM calls search_documents / get_document_by_id directly in your Node
 * process. Retrieval is augmented generation: embed query → Pinecone → answer.
 *
 * Usage:
 *   npm run example:rag
 *   npm run example:rag -- "How many PTO days do we get?"
 */

import { ChatOpenAI } from "@langchain/openai";
import {
  HumanMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import type { StructuredToolInterface } from "@langchain/core/tools";
import { loadEnv } from "../shared/load-env.js";
import { createHandbookTools } from "./handbook-tools.js";

const DEFAULT_QUESTION =
  "How many remote work days per month are allowed?";

const MAX_STEPS = 8;

function messageContentToString(
  content: BaseMessage["content"] | undefined,
): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if ("text" in part && typeof part.text === "string") return part.text;
        return JSON.stringify(part);
      })
      .join("");
  }
  return content == null ? "" : JSON.stringify(content);
}

async function runAgent(
  llmWithTools: ReturnType<ChatOpenAI["bindTools"]>,
  toolsByName: Record<string, StructuredToolInterface>,
  userQuestion: string,
): Promise<{ answer: string; messages: BaseMessage[] }> {
  const messages: BaseMessage[] = [new HumanMessage(userQuestion)];

  for (let step = 0; step < MAX_STEPS; step++) {
    const response = await llmWithTools.invoke(messages);
    messages.push(response);

    const toolCalls = response.tool_calls ?? [];
    if (!toolCalls.length) {
      return {
        answer: messageContentToString(response.content),
        messages,
      };
    }

    console.log(`\n[step ${step + 1}] tool calls:`);
    for (const call of toolCalls) {
      const selected = toolsByName[call.name];
      if (!selected) {
        throw new Error(`Unknown tool: ${call.name}`);
      }

      console.log(`  → ${call.name}(${JSON.stringify(call.args)})`);
      const result: unknown = await selected.invoke(call.args);
      const content =
        typeof result === "string" ? result : JSON.stringify(result, null, 2);
      console.log(
        `    ${content.length > 240 ? `${content.slice(0, 240)}…` : content}`,
      );

      messages.push(
        new ToolMessage({
          content,
          tool_call_id: call.id ?? `${call.name}-${step}`,
        }),
      );
    }
  }

  throw new Error("Agent exceeded max tool-calling steps");
}

async function main(): Promise<void> {
  loadEnv();

  if (!process.env.PINECONE_API_KEY) {
    throw new Error("Missing PINECONE_API_KEY — set in dl-agentic/.env");
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY — set in dl-agentic/.env");
  }

  const question =
    process.argv.slice(2).join(" ").trim() || DEFAULT_QUESTION;

  const { searchDocuments, getDocumentById } = createHandbookTools();
  const tools = [searchDocuments, getDocumentById];
  const toolsByName = Object.fromEntries(
    tools.map((t) => [t.name, t]),
  ) as Record<string, StructuredToolInterface>;

  const llm = new ChatOpenAI({ model: "gpt-4o-mini" });
  const llmWithTools = llm.bindTools(tools);

  console.log("Pattern: RAG (in-process LangChain tools + Pinecone)\n");
  console.log(`Question: ${question}\n`);

  const { answer } = await runAgent(llmWithTools, toolsByName, question);

  console.log("\n--- Answer ---\n");
  console.log(answer);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
