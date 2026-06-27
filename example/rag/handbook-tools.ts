import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  getDocumentById,
  searchDocuments,
} from "../shared/handbook-store.js";

/** LangChain tool bindings — in-process RAG retrieval (not MCP protocol). */
export function createHandbookTools() {
  const searchDocumentsTool = tool(
    async ({ query, filters }) => searchDocuments({ query, filters }),
    {
      name: "search_documents",
      description:
        "Search the employee handbook. Use when the answer may be in HR policy docs.",
      schema: z.object({
        query: z.string(),
        filters: z.record(z.unknown()).optional(),
      }),
    },
  );

  const getDocumentByIdTool = tool(
    async ({ id }) => getDocumentById(id),
    {
      name: "get_document_by_id",
      description: "Fetch full chunk text by document ID.",
      schema: z.object({ id: z.string() }),
    },
  );

  return {
    searchDocuments: searchDocumentsTool,
    getDocumentById: getDocumentByIdTool,
  };
}
