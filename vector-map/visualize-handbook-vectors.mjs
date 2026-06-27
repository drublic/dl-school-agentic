#!/usr/bin/env node
/**
 * Fetch handbook vectors from Pinecone and render a 2D PCA map (HTML).
 *
 * Usage:
 *   npm run visualize:vectors
 *   npm run visualize:vectors -- --open
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const INDEX_NAME = process.env.WORKSHOP_PINECONE_INDEX ?? "handbook";
const NAMESPACE = process.env.WORKSHOP_PINECONE_NAMESPACE ?? "workshop-shared";
const EMBEDDING_MODEL = "text-embedding-3-small";
const OUTPUT_HTML = join(__dirname, "handbook-vector-map.html");
const OUTPUT_DATA = join(__dirname, "handbook-vector-map-data.json");
const OUTPUT_PNG = join(__dirname, "handbook-vector-map.png");

const GOLDEN_QUESTION =
  "How many remote work days per month are we allowed?";

const CHAPTER_COLORS = {
  Welcome: "#2563eb",
  "Office Attendance": "#0891b2",
  "Remote Work": "#0d9488",
  "Paid Time Off": "#7c3aed",
  "Sick Leave": "#9333ea",
  "Health Benefits": "#db2777",
  "Expense Reimbursement": "#e11d48",
  Equipment: "#ea580c",
  "IT Security": "#ca8a04",
  "Parental Leave": "#16a34a",
  "Code of Conduct": "#dc2626",
  default: "#64748b",
};

/** Light theme for slide decks (Notion / Google Slides white backgrounds). */
const THEME = {
  pageBg: "#f8fafc",
  plotBg: "#ffffff",
  text: "#1e293b",
  textMuted: "#64748b",
  legend: "#475569",
  grid: "#e2e8f0",
  zeroLine: "#cbd5e1",
  swatchBorder: "#94a3b8",
  markerStroke: "#ffffff",
  queryStar: "#f59e0b",
  queryStarOutline: "#92400e",
  matchLine: "#d97706",
  labelText: "#334155",
};

function loadEnvLocal() {
  for (const name of [".env.local", ".env"]) {
    const path = join(ROOT, name);
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
    readFileSync(join(ROOT, "data/handbook-corpus.json"), "utf8"),
  );
}

function centerMatrix(vectors) {
  const n = vectors.length;
  const d = vectors[0].length;
  const mean = new Array(d).fill(0);
  for (const v of vectors) {
    for (let j = 0; j < d; j++) mean[j] += v[j];
  }
  for (let j = 0; j < d; j++) mean[j] /= n;
  return {
    centered: vectors.map((v) => v.map((x, j) => x - mean[j])),
    mean,
  };
}

function gramMatrix(centered) {
  const n = centered.length;
  const g = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      let dot = 0;
      for (let k = 0; k < centered[0].length; k++) {
        dot += centered[i][k] * centered[j][k];
      }
      const val = dot / Math.max(n - 1, 1);
      g[i][j] = val;
      g[j][i] = val;
    }
  }
  return g;
}

function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function scale(v, s) {
  return v.map((x) => x * s);
}

function normalize(v) {
  const len = Math.hypot(...v);
  if (len === 0) return v.slice();
  return v.map((x) => x / len);
}

function matVec(m, v) {
  return m.map((row) => dot(row, v));
}

function topEigenpair(g) {
  const n = g.length;
  let v = Array.from({ length: n }, () => Math.random() - 0.5);
  v = normalize(v);
  let lambda = 0;
  for (let iter = 0; iter < 100; iter++) {
    const w = matVec(g, v);
    lambda = dot(v, w);
    v = normalize(w);
  }
  return { lambda, vector: v };
}

function deflate(g, eigenvector, eigenvalue) {
  const n = g.length;
  const out = g.map((row) => row.slice());
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      out[i][j] -= eigenvalue * eigenvector[i] * eigenvector[j];
    }
  }
  return out;
}

function pcaScores(centered, components = 2) {
  const g = gramMatrix(centered);
  const eigenpairs = [];
  let working = g;
  for (let c = 0; c < components; c++) {
    const { lambda, vector } = topEigenpair(working);
    eigenpairs.push({ lambda, vector });
    working = deflate(working, vector, lambda);
  }
  const n = centered.length;
  return Array.from({ length: n }, (_, i) =>
    eigenpairs.map(({ lambda, vector }) => vector[i] * Math.sqrt(Math.max(lambda, 0))),
  );
}

function projectQuery(queryVec, mean, centered, scores) {
  const centeredQuery = queryVec.map((x, j) => x - mean[j]);
  const n = centered.length;
  const d = centered[0].length;

  // Reconstruct PC axes in embedding space from scores
  const axes = [];
  for (let pc = 0; pc < 2; pc++) {
    const axis = new Array(d).fill(0);
    for (let i = 0; i < n; i++) {
      const weight = scores[i][pc];
      for (let j = 0; j < d; j++) axis[j] += weight * centered[i][j];
    }
    axes.push(normalize(axis));
  }

  return [dot(centeredQuery, axes[0]), dot(centeredQuery, axes[1])];
}

function cosineSimilarity(a, b) {
  let dotProd = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dotProd += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dotProd / (Math.sqrt(na) * Math.sqrt(nb));
}

function truncate(text, max = 120) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}

function buildHtml({ corpus, points, queryPoint, nearest, indexName, namespace }) {
  const traces = [
    {
      type: "scatter",
      mode: "markers+text",
      name: "Handbook chunks",
      x: points.map((p) => p.x),
      y: points.map((p) => p.y),
      text: points.map((p) => `§${p.sectionId}`),
      textposition: "top center",
      textfont: { color: THEME.labelText, size: 11 },
      marker: {
        size: 14,
        color: points.map(
          (p) => CHAPTER_COLORS[p.section] ?? CHAPTER_COLORS.default,
        ),
        line: { color: THEME.markerStroke, width: 1.5 },
      },
      hovertemplate: points.map(
        (p) =>
          `<b>§${p.sectionId} ${p.section}</b><br>Page ${p.page}<br>${truncate(p.text)}<br>id: ${p.id}<extra></extra>`,
      ),
    },
  ];

  if (queryPoint) {
    traces.push({
      type: "scatter",
      mode: "markers+text",
      name: "Golden question",
      x: [queryPoint.x],
      y: [queryPoint.y],
      text: ["?"],
      textposition: "middle center",
      marker: {
        size: 18,
        color: THEME.queryStar,
        symbol: "star",
        line: { color: THEME.queryStarOutline, width: 2 },
      },
      hovertemplate: `<b>Query</b><br>${GOLDEN_QUESTION}<br>Nearest: §${nearest.sectionId} ${nearest.section} (${nearest.similarity.toFixed(3)})<extra></extra>`,
    });

    traces.push({
      type: "scatter",
      mode: "lines",
      name: "Nearest match",
      x: [queryPoint.x, nearest.x],
      y: [queryPoint.y, nearest.y],
      line: { color: THEME.matchLine, width: 2, dash: "dot" },
      hoverinfo: "skip",
    });
  }

  const legendSections = [...new Set(points.map((p) => p.section))].sort();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Handbook vector map · ${indexName}</title>
  <script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
      background: ${THEME.pageBg};
      color: ${THEME.text};
    }
    header {
      padding: 1.25rem 1.5rem 0.5rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 { margin: 0 0 0.35rem; font-size: 1.35rem; }
    p { margin: 0.25rem 0; color: ${THEME.textMuted}; font-size: 0.95rem; }
    #chart { width: 100%; height: calc(100vh - 170px); }
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1rem;
      padding: 0 1.5rem 1rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    .legend span {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.8rem;
      color: ${THEME.legend};
    }
    .swatch {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      border: 1px solid ${THEME.swatchBorder};
    }
  </style>
</head>
<body>
  <header>
    <h1>Employee handbook · embedding map</h1>
    <p>Pinecone index <strong>${indexName}</strong> · namespace <strong>${namespace}</strong> · ${EMBEDDING_MODEL} (${points[0]?.dim ?? 1536}d → PCA 2D)</p>
    <p>${points.length} vectors from <code>${corpus.doc}</code> (${corpus.version}). Hover for chunk text; star = golden test question.</p>
  </header>
  <div class="legend">
    ${legendSections
      .map(
        (s) =>
          `<span><i class="swatch" style="background:${CHAPTER_COLORS[s] ?? CHAPTER_COLORS.default}"></i>${s}</span>`,
      )
      .join("")}
  </div>
  <div id="chart"></div>
  <script>
    const data = ${JSON.stringify(traces)};
    const layout = {
      paper_bgcolor: "${THEME.pageBg}",
      plot_bgcolor: "${THEME.plotBg}",
      font: { color: "${THEME.text}" },
      margin: { l: 48, r: 24, t: 24, b: 48 },
      xaxis: {
        title: "PC1",
        zerolinecolor: "${THEME.zeroLine}",
        gridcolor: "${THEME.grid}",
      },
      yaxis: {
        title: "PC2",
        zerolinecolor: "${THEME.zeroLine}",
        gridcolor: "${THEME.grid}",
      },
      showlegend: true,
      legend: { orientation: "h", y: 1.08, x: 0 },
    };
    Plotly.newPlot("chart", data, layout, { responsive: true, displayModeBar: true });
  </script>
</body>
</html>`;
}

async function embedText(openai, text) {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return response.data[0].embedding;
}

async function main() {
  loadEnvLocal();
  const openFlag = process.argv.includes("--open");

  const pineconeKey = process.env.PINECONE_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!pineconeKey) {
    throw new Error("Missing PINECONE_API_KEY in dl-agentic/.env or .env.local");
  }
  if (!openaiKey) {
    throw new Error("Missing OPENAI_API_KEY in dl-agentic/.env or .env.local");
  }

  const corpus = loadCorpus();
  const chunks = corpus.chunks.filter(
    (c) => c.id !== "handbook-p12-bad-parse-decoy",
  );
  const ids = chunks.map((c) => c.id);

  const { Pinecone } = await import("@pinecone-database/pinecone");
  const { default: OpenAI } = await import("openai");

  const pc = new Pinecone({ apiKey: pineconeKey });
  const openai = new OpenAI({ apiKey: openaiKey });

  const indexHost = (await pc.describeIndex(INDEX_NAME)).host;
  const index = pc.index(INDEX_NAME, indexHost);

  console.log(`Fetching ${ids.length} vectors from ${INDEX_NAME}/${NAMESPACE}…`);
  const fetched = await index.namespace(NAMESPACE).fetch(ids);
  const records = fetched.records ?? {};

  const missing = ids.filter((id) => !records[id]?.values?.length);
  if (missing.length) {
    throw new Error(
      `Missing vectors in Pinecone: ${missing.join(", ")}. Run npm run seed first.`,
    );
  }

  const vectors = ids.map((id) => records[id].values);
  const metadataById = Object.fromEntries(
    ids.map((id, i) => [id, { ...chunks[i], ...records[id].metadata }]),
  );

  const { centered, mean } = centerMatrix(vectors);
  const scores = pcaScores(centered, 2);

  const points = ids.map((id, i) => {
    const m = metadataById[id];
    return {
      id,
      x: scores[i][0],
      y: scores[i][1],
      page: m.page,
      section: m.section,
      sectionId: m.section_id,
      text: m.chunk_text,
      dim: vectors[i].length,
    };
  });

  console.log(`Embedding golden question for overlay…`);
  const queryVec = await embedText(openai, GOLDEN_QUESTION);
  const [qx, qy] = projectQuery(queryVec, mean, centered, scores);

  let best = { id: ids[0], similarity: -1 };
  for (let i = 0; i < ids.length; i++) {
    const sim = cosineSimilarity(queryVec, vectors[i]);
    if (sim > best.similarity) {
      best = { id: ids[i], similarity: sim };
    }
  }
  const nearestPoint = points.find((p) => p.id === best.id);

  const html = buildHtml({
    corpus,
    points,
    queryPoint: { x: qx, y: qy },
    nearest: { ...nearestPoint, similarity: best.similarity },
    indexName: INDEX_NAME,
    namespace: NAMESPACE,
  });

  writeFileSync(OUTPUT_HTML, html, "utf8");
  writeFileSync(
    OUTPUT_DATA,
    JSON.stringify(
      {
        corpus: { doc: corpus.doc, version: corpus.version },
        indexName: INDEX_NAME,
        namespace: NAMESPACE,
        goldenQuestion: GOLDEN_QUESTION,
        points,
        queryPoint: { x: qx, y: qy },
        nearest: { ...nearestPoint, similarity: best.similarity },
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(`✓ Wrote ${OUTPUT_HTML}`);
  console.log(`✓ Wrote ${OUTPUT_DATA}`);

  try {
    execSync(
      `python3 "${join(__dirname, "export-handbook-vector-map-png.py")}" "${OUTPUT_DATA}" "${OUTPUT_PNG}"`,
      { stdio: "inherit" },
    );
  } catch {
    console.warn("PNG export skipped (install matplotlib: pip3 install matplotlib)");
  }

  console.log(
    `  Golden question nearest: ${best.id} (cosine ${best.similarity.toFixed(4)})`,
  );

  if (openFlag) {
    execSync(`open "${OUTPUT_HTML}"`, { stdio: "inherit" });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
