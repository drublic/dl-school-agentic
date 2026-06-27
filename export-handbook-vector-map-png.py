#!/usr/bin/env python3
"""Render handbook-vector-map-data.json to PNG for slide decks."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from matplotlib.patches import FancyArrowPatch

ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "handbook-vector-map-data.json"
OUTPUT_PATH = ROOT / "handbook-vector-map.png"

CHAPTER_COLORS = {
    "Welcome": "#2563eb",
    "Office Attendance": "#0891b2",
    "Remote Work": "#0d9488",
    "Paid Time Off": "#7c3aed",
    "Sick Leave": "#9333ea",
    "Health Benefits": "#db2777",
    "Expense Reimbursement": "#e11d48",
    "Equipment": "#ea580c",
    "IT Security": "#ca8a04",
    "Parental Leave": "#16a34a",
    "Code of Conduct": "#dc2626",
}

THEME = {
    "page_bg": "#f8fafc",
    "plot_bg": "#ffffff",
    "text": "#1e293b",
    "text_muted": "#64748b",
    "legend": "#475569",
    "grid": "#e2e8f0",
    "spine": "#cbd5e1",
    "marker_stroke": "#ffffff",
    "label_text": "#334155",
    "query_star": "#f59e0b",
    "query_star_outline": "#92400e",
    "match_line": "#d97706",
}


def main() -> None:
    data_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DATA_PATH
    out_path = Path(sys.argv[2]) if len(sys.argv) > 2 else OUTPUT_PATH

    data = json.loads(data_path.read_text(encoding="utf-8"))
    points = data["points"]
    query = data.get("queryPoint")
    nearest = data.get("nearest")

    fig, ax = plt.subplots(figsize=(12, 7), facecolor=THEME["page_bg"])
    ax.set_facecolor(THEME["plot_bg"])

    sections = sorted({p["section"] for p in points})
    for section in sections:
        group = [p for p in points if p["section"] == section]
        color = CHAPTER_COLORS.get(section, "#64748b")
        ax.scatter(
            [p["x"] for p in group],
            [p["y"] for p in group],
            s=120,
            c=color,
            edgecolors=THEME["marker_stroke"],
            linewidths=1.5,
            zorder=3,
            label=section,
        )
        for p in group:
            ax.annotate(
                f"§{p['sectionId']}",
                (p["x"], p["y"]),
                textcoords="offset points",
                xytext=(0, 10),
                ha="center",
                fontsize=9,
                color=THEME["label_text"],
                fontweight="bold",
            )

    if query and nearest:
        ax.scatter(
            [query["x"]],
            [query["y"]],
            s=220,
            c=THEME["query_star"],
            marker="*",
            edgecolors=THEME["query_star_outline"],
            linewidths=1.5,
            zorder=4,
        )
        ax.annotate(
            "?",
            (query["x"], query["y"]),
            ha="center",
            va="center",
            fontsize=11,
            color=THEME["query_star_outline"],
            fontweight="bold",
            zorder=5,
        )
        arrow = FancyArrowPatch(
            (query["x"], query["y"]),
            (nearest["x"], nearest["y"]),
            arrowstyle="-|>",
            mutation_scale=12,
            linestyle=(0, (4, 3)),
            linewidth=1.8,
            color=THEME["match_line"],
            zorder=2,
        )
        ax.add_patch(arrow)

    ax.set_xlabel("PC1", color=THEME["text_muted"])
    ax.set_ylabel("PC2", color=THEME["text_muted"])
    ax.tick_params(colors=THEME["text_muted"])
    for spine in ax.spines.values():
        spine.set_color(THEME["spine"])
    ax.grid(True, color=THEME["grid"], linewidth=0.8)
    ax.set_title(
        "Employee handbook · embedding map (text-embedding-3-small → PCA 2D)",
        color=THEME["text"],
        fontsize=13,
        pad=12,
    )

    legend_handles = [
        Line2D(
            [0],
            [0],
            marker="o",
            color="w",
            markerfacecolor=CHAPTER_COLORS.get(s, "#64748b"),
            markersize=8,
            label=s,
        )
        for s in sections
    ]
    if query:
        legend_handles.append(
            Line2D(
                [0],
                [0],
                marker="*",
                color="w",
                markerfacecolor=THEME["query_star"],
                markersize=12,
                label="Golden question",
            )
        )
    ax.legend(
        handles=legend_handles,
        loc="upper center",
        bbox_to_anchor=(0.5, -0.12),
        ncol=4,
        frameon=False,
        fontsize=8,
        labelcolor=THEME["legend"],
    )

    subtitle = (
        f"Pinecone index `{data.get('indexName', 'handbook')}` · "
        f"namespace `{data.get('namespace', 'workshop-shared')}` · "
        f"{len(points)} chunks · ★ → §{nearest['sectionId']} {nearest['section']}"
        if nearest
        else f"{len(points)} handbook chunks"
    )
    fig.text(0.5, 0.02, subtitle, ha="center", color=THEME["text_muted"], fontsize=9)

    fig.tight_layout(rect=(0, 0.06, 1, 1))
    fig.savefig(out_path, dpi=160, facecolor=fig.get_facecolor(), bbox_inches="tight")
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
