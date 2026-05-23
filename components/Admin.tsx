"use client";

import { ArrowLeft, Upload } from "lucide-react";
import { useRef } from "react";
import { LIMITS } from "@/lib/storage";

interface Props {
  masterPrompt: string;
  dataReality: string;
  onMasterPromptChange: (v: string) => void;
  onDataRealityChange: (v: string) => void;
  onBack: () => void;
}

export default function Admin({
  masterPrompt,
  dataReality,
  onMasterPromptChange,
  onDataRealityChange,
  onBack,
}: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--tan)] bg-[var(--cream2)] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            <div className="text-base font-semibold text-[var(--charcoal)]">
              Admin Settings
            </div>
            <div className="text-xs text-[var(--charcoal-soft)]">
              Configure the business context applied to every prototype.
            </div>
          </div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-[var(--tan)] bg-white hover:bg-[var(--cream)] text-[var(--charcoal)]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <Section
          title="Master prompt"
          description="Prepended to every AI call as business context."
          right={
            <Counter value={masterPrompt.length} max={LIMITS.maxMasterPrompt} />
          }
        >
          <textarea
            value={masterPrompt}
            onChange={(e) =>
              onMasterPromptChange(e.target.value.slice(0, LIMITS.maxMasterPrompt))
            }
            className="w-full h-72 px-3 py-2.5 rounded-lg border border-[var(--tan)] bg-[var(--cream2)] text-sm font-mono leading-relaxed text-[var(--charcoal)] resize-y focus:outline-none focus:border-[var(--orange)]"
          />
        </Section>

        <Section
          title="Data reality"
          description="Markdown describing what data you have today. Used to ground gap analysis."
          right={
            <div className="flex items-center gap-3">
              <button
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-[var(--tan)] bg-white hover:bg-[var(--cream)] text-[var(--charcoal)]"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload .md
              </button>
              <Counter value={dataReality.length} max={LIMITS.maxDataReality} />
              <input
                ref={fileRef}
                type="file"
                accept=".md,text/markdown,text/plain"
                hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const text = await file.text();
                  onDataRealityChange(text.slice(0, LIMITS.maxDataReality));
                  e.target.value = "";
                }}
              />
            </div>
          }
        >
          <textarea
            value={dataReality}
            onChange={(e) =>
              onDataRealityChange(e.target.value.slice(0, LIMITS.maxDataReality))
            }
            className="w-full h-72 px-3 py-2.5 rounded-lg border border-[var(--tan)] bg-[var(--cream2)] text-sm font-mono leading-relaxed text-[var(--charcoal)] resize-y focus:outline-none focus:border-[var(--orange)]"
          />
        </Section>
      </main>
    </div>
  );
}

function Section({
  title,
  description,
  right,
  children,
}: {
  title: string;
  description: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-[var(--tan)] shadow-sm">
      <div className="px-5 py-3 border-b border-[var(--tan)] flex items-end justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-[var(--charcoal)]">{title}</div>
          <div className="text-xs text-[var(--charcoal-soft)]">{description}</div>
        </div>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Counter({ value, max }: { value: number; max: number }) {
  const close = value > max * 0.9;
  return (
    <span
      className={
        "text-[11px] " + (close ? "text-[var(--amber)]" : "text-[var(--charcoal-soft)]")
      }
    >
      {value.toLocaleString()} / {max.toLocaleString()}
    </span>
  );
}
