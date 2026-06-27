#!/usr/bin/env node
/**
 * Embed handbook-corpus.json chunks and upsert to Pinecone.
 *
 * Usage:
 *   pnpm seed
 *   node seed-handbook-vectors.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));

const INDEX_NAME = process.env.WORKSHOP_PINECONE_INDEX ?? "handbook";
const NAMESPACE = process.env.WORKSHOP_PINECONE_NAMESPACE ?? "workshop-shared";
const CLOUD = process.env.WORKSHOP_PINECONE_CLOUD ?? "aws";
const REGION = process.env.WORKSHOP_PINECONE_REGION ?? "us-east-1";
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIM = 1536;

function loadEnvLocal() {
  for (const name of [".env.local", ".env"]) {
    const path = join(__dirname, name);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined || process.env[key] === "") {
      process.env[key] = val;
    }
    }
  }
}

function loadCorpus() {
  return JSON.parse(
    readFileSync(join(__dirname, "handbook-corpus.json"), "utf8"),
  );
}

async function ensureIndex(pc) {
  const existing = await pc.listIndexes();
  const names = existing.indexes?.map((i) => i.name) ?? [];
  if (names.includes(INDEX_NAME)) {
    const desc = await pc.describeIndex(INDEX_NAME);
    if (desc.dimension !== EMBEDDING_DIM) {
      throw new Error(
        `Index ${INDEX_NAME} has dimension ${desc.dimension}, expected ${EMBEDDING_DIM}`,
      );
    }
    console.log(`Using existing index "${INDEX_NAME}" (${desc.dimension}d)`);
    return;
  }

  console.log(`Creating index "${INDEX_NAME}" (${EMBEDDING_DIM}d, cosine)…`);
  await pc.createIndex({
    name: INDEX_NAME,
    dimension: EMBEDDING_DIM,
    metric: "cosine",
    spec: {
      serverless: {
        cloud: CLOUD,
        region: REGION,
      },
    },
    waitUntilReady: true,
  });
  console.log(`✓ Index "${INDEX_NAME}" ready`);
}

async function embedBatch(openai, texts) {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });
  return response.data
    .sort((a, b) => a.index - b.index)
    .map((row) => row.embedding);
}

function chunkMetadata(chunk, doc) {
  const meta = {
    doc,
    page: chunk.page,
    section: chunk.section,
    section_id: chunk.section_id,
    chunk_text: chunk.chunk_text,
  };
  if (chunk._note) meta._note = chunk._note;
  return meta;
}

async function main() {
  loadEnvLocal();

  const pineconeKey = process.env.PINECONE_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!pineconeKey) {
    throw new Error("Missing PINECONE_API_KEY — set in dl-agentic/.env or .env.local");
  }
  if (!openaiKey) {
    throw new Error("Missing OPENAI_API_KEY — set in dl-agentic/.env or .env.local");
  }

  if (!process.argv.includes("--skip-pdf")) {
    console.log("Regenerating employee_handbook.pdf…");
    execSync("python3 generate-handbook-pdf.py", {
      cwd: __dirname,
      stdio: "inherit",
    });
  }

  const corpus = loadCorpus();
  const chunks = corpus.chunks;
  console.log(`Embedding ${chunks.length} chunks from ${corpus.doc}…`);

  const { Pinecone } = await import("@pinecone-database/pinecone");
  const { default: OpenAI } = await import("openai");

  const pc = new Pinecone({ apiKey: pineconeKey });
  const openai = new OpenAI({ apiKey: openaiKey });

  await ensureIndex(pc);

  const indexHost = (await pc.describeIndex(INDEX_NAME)).host;
  const index = pc.index(INDEX_NAME, indexHost);
  const ns = index.namespace(NAMESPACE);

  const texts = chunks.map((c) => c.chunk_text);
  const embeddings = await embedBatch(openai, texts);

  const vectors = chunks.map((chunk, i) => ({
    id: chunk.id,
    values: embeddings[i],
    metadata: chunkMetadata(chunk, corpus.doc),
  }));

  console.log(`Upserting ${vectors.length} vectors to ${INDEX_NAME}/${NAMESPACE}…`);
  await ns.upsert(vectors);

  const fetched = await ns.fetch(chunks.map((c) => c.id));
  const records = fetched.records ?? {};
  const missing = chunks.filter((c) => !records[c.id]?.values?.length);
  if (missing.length) {
    throw new Error(`Upsert verification failed: ${missing.map((c) => c.id).join(", ")}`);
  }

  console.log(`✓ Synced ${vectors.length} handbook vectors to Pinecone`);
  for (const chunk of chunks) {
    console.log(`  · ${chunk.id} (p.${chunk.page}, ${chunk.section})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
