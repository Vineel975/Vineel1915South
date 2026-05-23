"use client";

import { Plus, Settings, Wand2, X, Sparkles } from "lucide-react";
import { useState } from "react";
import type { Prototype } from "@/lib/types";
import Mockup from "./Mockup";
import { LAYOUT_LABELS, relTime } from "./util";
import { EXAMPLES, type Example } from "./examples";

interface Props {
  prototypes: Prototype[];
  onNew: () => void;
  onOpenAdmin: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onExample: (e: Example) => void;
}

export default function Home({
  prototypes,
  onNew,
  onOpenAdmin,
  onOpen,
  onDelete,
  onExample,
}: Props) {
  return (
    <div className="min-h-screen">
      <TopBar onNew={onNew} onOpenAdmin={onOpenAdmin} />
      <main className="max-w-6xl mx-auto px-6 py-8">
        {prototypes.length === 0 ? (
          <EmptyState onNew={onNew} onExample={onExample} />
        ) : (
          <Populated
            prototypes={prototypes}
            onOpen={onOpen}
            onDelete={onDelete}
            onExample={onExample}
            onNew={onNew}
          />
        )}
      </main>
    </div>
  );
}

function TopBar({ onNew, onOpenAdmin }: { onNew: () => void; onOpenAdmin: () => void }) {
  return (
    <header className="border-b border-[var(--tan)] bg-[var(--cream2)] sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "var(--orange-50)", border: "1px solid var(--orange-soft)" }}
          >
            <Wand2 className="w-5 h-5 text-[var(--orange)]" />
          </div>
          <div>
            <div className="text-base font-semibold text-[var(--charcoal)] leading-tight">
              Workflow Prototyper
            </div>
            <div className="text-[10px] font-semibold tracking-[0.18em] text-[var(--orange)]">
              1915 SOUTH
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAdmin}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-[var(--tan)] bg-white hover:bg-[var(--cream)] text-[var(--charcoal)]"
          >
            <Settings className="w-4 h-4" />
            Admin
          </button>
          <button
            onClick={onNew}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm rounded-lg bg-[var(--orange)] text-white hover:brightness-95 font-medium"
          >
            <Plus className="w-4 h-4" />
            New Workflow
          </button>
        </div>
      </div>
    </header>
  );
}

function EmptyState({
  onNew,
  onExample,
}: {
  onNew: () => void;
  onExample: (e: Example) => void;
}) {
  return (
    <div className="space-y-8">
      <div
        className="rounded-2xl p-10 border border-[var(--tan)]"
        style={{
          background:
            "linear-gradient(135deg, var(--orange-50) 0%, var(--cream2) 50%, var(--olive-soft) 100%)",
        }}
      >
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/70 text-xs font-medium text-[var(--orange)] mb-4 border border-[var(--orange-soft)]">
            <Sparkles className="w-3.5 h-3.5" />
            For 1915 South leadership
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold text-[var(--charcoal)] leading-tight">
            Describe a workflow. See it before you build it.
          </h1>
          <p className="mt-4 text-base text-[var(--charcoal-soft)] max-w-xl">
            Type a workflow idea in plain English. In about a minute you have a
            clickable mockup, the data gaps you'd need to close, the systems
            you'd need to wire up, and an order-of-magnitude impact estimate.
          </p>
          <div className="mt-6">
            <button
              onClick={onNew}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--orange)] text-white font-medium hover:brightness-95"
            >
              <Plus className="w-4 h-4" />
              Start your first workflow
            </button>
          </div>
        </div>
      </div>
      <ExampleRow onExample={onExample} />
    </div>
  );
}

function Populated({
  prototypes,
  onOpen,
  onDelete,
  onExample,
  onNew,
}: {
  prototypes: Prototype[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onExample: (e: Example) => void;
  onNew: () => void;
}) {
  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--charcoal)]">Your prototypes</h1>
          <div className="text-sm text-[var(--charcoal-soft)]">
            {prototypes.length} saved
          </div>
        </div>
        <button
          onClick={onNew}
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--tan)] bg-white text-sm hover:bg-[var(--cream)]"
        >
          <Plus className="w-4 h-4" />
          New
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {prototypes.map((p) => (
          <Card key={p.id} p={p} onOpen={onOpen} onDelete={onDelete} />
        ))}
      </div>
      <ExampleRow onExample={onExample} />
    </div>
  );
}

function Card({
  p,
  onOpen,
  onDelete,
}: {
  p: Prototype;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const latest = p.versions[p.versions.length - 1];
  const layout = latest?.spec.layout_pattern ?? "dashboard";
  return (
    <div
      onClick={() => onOpen(p.id)}
      className="group cursor-pointer relative bg-white rounded-xl border border-[var(--tan)] overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="h-32 relative border-b border-[var(--tan)] bg-[var(--cream)]">
        {latest?.spec.html ? (
          <Mockup
            html={latest.spec.html}
            scale={0.4}
            className="absolute inset-0 w-full h-full"
            title={`thumb-${p.id}`}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--charcoal-soft)]">
            (no preview)
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[var(--charcoal)] truncate">
              {p.name}
            </div>
            <span className="inline-block mt-1 text-[10px] font-medium uppercase tracking-wide text-[var(--orange)] bg-[var(--orange-50)] border border-[var(--orange-soft)] rounded-full px-2 py-0.5">
              {LAYOUT_LABELS[layout]}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete "${p.name}"?`)) onDelete(p.id);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[var(--red-soft)] text-[var(--charcoal-soft)] hover:text-[var(--red)]"
            aria-label="Delete prototype"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p
          className="mt-2 text-xs text-[var(--charcoal-soft)] overflow-hidden"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {p.description}
        </p>
        <div className="mt-3 flex items-center gap-3 text-[11px] text-[var(--charcoal-soft)]">
          <span>{relTime(p.updatedAt)}</span>
          <span>·</span>
          <span>{p.versions.length} version{p.versions.length === 1 ? "" : "s"}</span>
          {p.analysis?.impact?.annual_value && (
            <>
              <span>·</span>
              <span className="text-[var(--olive)] font-medium">
                {p.analysis.impact.annual_value}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ExampleRow({ onExample }: { onExample: (e: Example) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-[var(--charcoal-soft)] mb-3">
        Or try an example
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {EXAMPLES.map((e, i) => (
          <button
            key={e.title}
            onClick={() => onExample(e)}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            className="text-left p-4 rounded-xl border border-[var(--tan)] bg-white hover:border-[var(--orange-soft)] transition-colors"
            style={hover === i ? { boxShadow: "0 1px 0 var(--orange-soft)" } : {}}
          >
            <div className="text-sm font-semibold text-[var(--charcoal)]">{e.title}</div>
            <div className="text-xs text-[var(--charcoal-soft)] mt-1">{e.blurb}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
