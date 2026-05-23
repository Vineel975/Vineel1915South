"use client";

import { Wand2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function NotAWorkflowDialog({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(31, 26, 20, 0.4)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-w-md w-full bg-white rounded-2xl border border-[var(--tan)] shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "var(--orange-50)",
              border: "1px solid var(--orange-soft)",
            }}
          >
            <Wand2 className="w-5 h-5 text-[var(--orange)]" />
          </div>
          <div className="min-w-0">
            <div className="text-base font-semibold text-[var(--charcoal)]">
              Hey, I can only build a prototype.
            </div>
            <p className="mt-1.5 text-sm text-[var(--charcoal-soft)]">
              Try describing a workflow, view, or tool you&apos;d like mocked up —
              for example, &quot;a daily dashboard of every store&apos;s variance
              with AI-drafted coaching notes&quot;.
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg bg-[var(--orange)] text-white text-sm font-medium hover:brightness-95"
            autoFocus
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
