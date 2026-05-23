"use client";

import { ChevronDown, ChevronUp, Sparkles, X } from "lucide-react";
import { useState } from "react";
import type { StructuredAnswers } from "@/lib/types";
import { LIMITS } from "@/lib/storage";
import { EXAMPLES, type Example } from "./examples";

interface Props {
  initialDescription?: string;
  initialStructured?: StructuredAnswers;
  busy?: boolean;
  onCancel: () => void;
  onGenerate: (description: string, structured: StructuredAnswers) => void;
  onExample: (e: Example) => void;
}

const QUESTIONS: Array<{ key: keyof StructuredAnswers; label: string; placeholder: string }> = [
  {
    key: "audience",
    label: "Who is the primary user?",
    placeholder: "e.g., regional director, RSA, CSR",
  },
  {
    key: "trigger",
    label: "What triggers it?",
    placeholder: "e.g., end of day, customer cancellation request",
  },
  {
    key: "decision",
    label: "What decision does it support?",
    placeholder: "e.g., which stores to call about variance",
  },
  {
    key: "frequency",
    label: "How often will it run?",
    placeholder: "e.g., daily, weekly, on-demand",
  },
  {
    key: "success",
    label: "What does 90-day success look like?",
    placeholder: "e.g., 5pt improvement in close rate",
  },
];

export default function NewWorkflow({
  initialDescription = "",
  initialStructured = {},
  busy = false,
  onCancel,
  onGenerate,
  onExample,
}: Props) {
  const [description, setDescription] = useState(initialDescription);
  const [structured, setStructured] = useState<StructuredAnswers>(initialStructured);
  const [expanded, setExpanded] = useState(
    Object.values(initialStructured).some(Boolean)
  );

  const disabled = description.trim().length === 0 || busy;

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--tan)] bg-[var(--cream2)] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            <div className="text-base font-semibold text-[var(--charcoal)]">
              New Workflow
            </div>
            <div className="text-xs text-[var(--charcoal-soft)]">
              Describe the workflow you want to mock up
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-md border border-[var(--tan)] bg-white hover:bg-[var(--cream)]"
            aria-label="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <div className="bg-white rounded-2xl border border-[var(--tan)] p-6 shadow-sm">
          <label className="block text-sm font-medium text-[var(--charcoal)] mb-2">
            What workflow do you want to see?
          </label>
          <textarea
            autoFocus
            value={description}
            onChange={(e) =>
              setDescription(e.target.value.slice(0, LIMITS.maxDescription))
            }
            placeholder="e.g., A daily dashboard showing each store's variance to plan with AI-drafted coaching notes for regional directors."
            className="w-full h-32 px-3 py-2.5 rounded-lg border border-[var(--tan)] bg-[var(--cream2)] resize-y text-sm leading-relaxed text-[var(--charcoal)] placeholder:text-[var(--charcoal-soft)]/60 focus:outline-none focus:border-[var(--orange)]"
          />
          <div className="mt-4">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-xs font-medium text-[var(--charcoal-soft)] hover:text-[var(--charcoal)]"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              Optional details
            </button>
            {expanded && (
              <div className="mt-3 space-y-3">
                {QUESTIONS.map((q) => (
                  <div key={q.key}>
                    <label className="block text-xs text-[var(--charcoal-soft)] mb-1">
                      {q.label}
                    </label>
                    <input
                      type="text"
                      value={structured[q.key] ?? ""}
                      onChange={(e) =>
                        setStructured((prev) => ({
                          ...prev,
                          [q.key]: e.target.value.slice(0, LIMITS.maxStructuredAnswer),
                        }))
                      }
                      placeholder={q.placeholder}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--tan)] bg-[var(--cream2)] text-sm text-[var(--charcoal)] placeholder:text-[var(--charcoal-soft)]/60 focus:outline-none focus:border-[var(--orange)]"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-5 flex items-center justify-end">
            <button
              onClick={() => onGenerate(description.trim(), structured)}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[var(--orange)] text-white text-sm font-medium hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              {busy ? "Preparing…" : "Generate"}
            </button>
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide text-[var(--charcoal-soft)] mb-3">
            Or try an example
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {EXAMPLES.map((e) => (
              <button
                key={e.title}
                onClick={() => onExample(e)}
                className="text-left p-4 rounded-xl border border-[var(--tan)] bg-white hover:border-[var(--orange-soft)]"
              >
                <div className="text-sm font-semibold text-[var(--charcoal)]">
                  {e.title}
                </div>
                <div className="text-xs text-[var(--charcoal-soft)] mt-1">{e.blurb}</div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
