"use client";

import { Loader2, Target, Paintbrush, BarChart3, X } from "lucide-react";
import Mockup from "./Mockup";

export type Stage = "metadata" | "html" | "analysis" | "done";

interface Props {
  stage: Stage;
  livePreviewHtml: string | null;
  error?: string | null;
  onCancel?: () => void;
}

const STAGES: Array<{
  key: Stage;
  emoji: string;
  Icon: typeof Target;
  title: string;
  hint: string;
}> = [
  {
    key: "metadata",
    emoji: "🎯",
    Icon: Target,
    title: "Picking the right layout",
    hint: "Classifying the workflow",
  },
  {
    key: "html",
    emoji: "🎨",
    Icon: Paintbrush,
    title: "Drafting the mockup",
    hint: "Generating HTML you'll see streaming",
  },
  {
    key: "analysis",
    emoji: "📊",
    Icon: BarChart3,
    title: "Gaps, systems, impact",
    hint: "Analyzing what this would take",
  },
];

function stageStatus(active: Stage, k: Stage): "done" | "active" | "pending" {
  const order: Stage[] = ["metadata", "html", "analysis", "done"];
  const a = order.indexOf(active);
  const i = order.indexOf(k);
  if (a > i) return "done";
  if (a === i) return "active";
  return "pending";
}

export default function ProgressPanel({
  stage,
  livePreviewHtml,
  error,
  onCancel,
}: Props) {
  return (
    <div className="w-full max-w-4xl mx-auto p-8">
      <div className="bg-white rounded-2xl border border-[var(--tan)] overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--tan)]">
          <div className="text-sm font-medium text-[var(--charcoal)]">
            Building your prototype
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex items-center gap-1 text-xs text-[var(--charcoal-soft)] hover:text-[var(--red)]"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
          )}
        </div>
        <div className="px-6 py-5 space-y-3">
          {STAGES.map((s) => {
            const status = stageStatus(stage, s.key);
            return (
              <div key={s.key} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                  style={{
                    background:
                      status === "done"
                        ? "var(--olive-soft)"
                        : status === "active"
                          ? "var(--orange-50)"
                          : "var(--cream)",
                    border: "1px solid var(--tan)",
                  }}
                >
                  {status === "active" ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--orange)]" />
                  ) : status === "done" ? (
                    <span className="text-[var(--olive)]">✓</span>
                  ) : (
                    <span>{s.emoji}</span>
                  )}
                </div>
                <div className="flex-1">
                  <div
                    className={
                      "text-sm " +
                      (status === "pending"
                        ? "text-[var(--charcoal-soft)]"
                        : "text-[var(--charcoal)] font-medium")
                    }
                  >
                    {s.title}
                  </div>
                  <div className="text-xs text-[var(--charcoal-soft)]">{s.hint}</div>
                </div>
              </div>
            );
          })}
        </div>
        {error && (
          <div className="px-6 py-4 border-t border-[var(--tan)] bg-[var(--red-soft)]">
            <div className="text-sm font-medium text-[var(--red)]">{error}</div>
          </div>
        )}
        {livePreviewHtml && stage !== "metadata" && (
          <div className="border-t border-[var(--tan)] bg-[var(--cream2)]">
            <div className="px-6 py-3 text-xs uppercase tracking-wide text-[var(--charcoal-soft)]">
              Live preview
            </div>
            <div className="h-72 border-t border-[var(--tan)]">
              <Mockup html={livePreviewHtml} title="streaming-preview" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
