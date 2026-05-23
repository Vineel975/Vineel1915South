"use client";

import type { Analysis } from "@/lib/types";
import { AlertTriangle, Plug, TrendingUp } from "lucide-react";

interface Props {
  analysis: Analysis;
}

const SEV_COLOR: Record<string, string> = {
  high: "var(--red)",
  medium: "var(--amber)",
  low: "var(--charcoal-soft)",
};

export default function InsightsPanel({ analysis }: Props) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-5">
        <Card
          title="Data gaps"
          icon={<AlertTriangle className="w-4 h-4" />}
          accent="var(--amber)"
          accentSoft="var(--amber-soft)"
        >
          {analysis.data_gaps?.length ? (
            <ul className="space-y-3">
              {analysis.data_gaps.map((g, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: SEV_COLOR[g.severity] ?? "var(--charcoal-soft)" }}
                  />
                  <div>
                    <div className="text-sm font-medium text-[var(--charcoal)]">
                      {g.title}
                    </div>
                    <div className="text-xs text-[var(--charcoal-soft)] mt-0.5">
                      {g.detail}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </Card>

        <Card
          title="Other systems needed"
          icon={<Plug className="w-4 h-4" />}
          accent="var(--info)"
          accentSoft="var(--info-soft)"
        >
          {analysis.systems_needed?.length ? (
            <ul className="space-y-3">
              {analysis.systems_needed.map((s, i) => (
                <li key={i}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--charcoal)]">
                      {s.title}
                    </span>
                    <span
                      className="text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                      style={{
                        background: "var(--cream)",
                        color: "var(--charcoal-soft)",
                        border: "1px solid var(--tan)",
                      }}
                    >
                      {s.category}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--charcoal-soft)] mt-0.5">
                    {s.detail}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </Card>

        <Card
          title="Potential impact"
          icon={<TrendingUp className="w-4 h-4" />}
          accent="var(--olive)"
          accentSoft="var(--olive-soft)"
        >
          {analysis.impact ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <KV label="Primary metric" value={analysis.impact.primary_metric} />
                <KV
                  label="Annual value"
                  value={analysis.impact.annual_value}
                  highlight
                />
                <KV label="Baseline" value={analysis.impact.baseline_estimate} />
                <KV label="Target" value={analysis.impact.target_estimate} />
              </div>
              {analysis.impact.assumptions?.length ? (
                <div className="mt-4">
                  <div className="text-xs uppercase tracking-wide text-[var(--charcoal-soft)] mb-1.5">
                    Assumptions
                  </div>
                  <ul className="space-y-1.5">
                    {analysis.impact.assumptions.map((a, i) => (
                      <li
                        key={i}
                        className="text-xs text-[var(--charcoal-soft)] flex gap-2"
                      >
                        <span className="text-[var(--olive)]">•</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : (
            <Empty />
          )}
        </Card>
      </div>
    </div>
  );
}

function Card({
  title,
  icon,
  children,
  accent,
  accentSoft,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  accent: string;
  accentSoft: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-[var(--tan)] overflow-hidden shadow-sm">
      <div
        className="px-4 py-2.5 flex items-center gap-2 border-b border-[var(--tan)]"
        style={{ background: accentSoft, color: accent }}
      >
        {icon}
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function KV({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg p-3 border border-[var(--tan)]" style={{ background: "var(--cream2)" }}>
      <div className="text-[10px] uppercase tracking-wide text-[var(--charcoal-soft)]">
        {label}
      </div>
      <div
        className={
          "text-sm font-medium mt-1 " +
          (highlight ? "text-[var(--olive)] text-base" : "text-[var(--charcoal)]")
        }
      >
        {value || "—"}
      </div>
    </div>
  );
}

function Empty() {
  return <div className="text-xs text-[var(--charcoal-soft)]">No items.</div>;
}
