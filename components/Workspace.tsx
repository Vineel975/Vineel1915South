"use client";

import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  History,
  Maximize2,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { Analysis, Prototype, Version } from "@/lib/types";
import { LIMITS } from "@/lib/storage";
import { LAYOUT_LABELS, relTime } from "./util";
import Mockup from "./Mockup";
import InsightsPanel from "./InsightsPanel";
import ProgressPanel, { type Stage } from "./ProgressPanel";

export type WorkspaceTab = "mockup" | "insights";

interface GenerationState {
  active: boolean;
  stage: Stage;
  livePreviewHtml: string | null;
  error: string | null;
}

interface Props {
  prototype: Prototype;
  selectedVersionId: string;
  workspaceTab: WorkspaceTab;
  generation: GenerationState;
  onSelectVersion: (id: string) => void;
  onBackHome: () => void;
  onFullscreen: () => void;
  onDownload: () => void;
  onSetTab: (tab: WorkspaceTab) => void;
  onRefine: (prompt: string) => void;
  onCancelGeneration: () => void;
  onRestoreVersion: (id: string) => void;
}

export default function Workspace(props: Props) {
  const {
    prototype,
    selectedVersionId,
    workspaceTab,
    generation,
    onSelectVersion,
    onBackHome,
    onFullscreen,
    onDownload,
    onSetTab,
    onRefine,
    onCancelGeneration,
    onRestoreVersion,
  } = props;

  const versions = prototype.versions;
  const latest = versions[versions.length - 1];
  const selected = useMemo(
    () => versions.find((v) => v.id === selectedVersionId) ?? latest,
    [versions, selectedVersionId, latest]
  );
  const viewingLatest = selected?.id === latest?.id;

  const insightCount =
    (prototype.analysis?.data_gaps.length ?? 0) +
    (prototype.analysis?.systems_needed.length ?? 0);

  return (
    <div className="h-screen flex flex-col bg-[var(--cream)]">
      <TopBar
        prototype={prototype}
        selected={selected}
        latest={latest}
        viewingLatest={viewingLatest}
        onBack={onBackHome}
        onFullscreen={onFullscreen}
        onDownload={onDownload}
      />
      <TabBar
        active={workspaceTab}
        insightCount={insightCount}
        analysisReady={!!prototype.analysis}
        onSet={onSetTab}
      />
      <div className="flex-1 min-h-0 flex">
        <LeftRail
          prototype={prototype}
          selectedVersionId={selected?.id ?? ""}
          viewingLatest={viewingLatest}
          generation={generation}
          latestId={latest?.id ?? ""}
          onRefine={onRefine}
          onCancel={onCancelGeneration}
          onSelectVersion={onSelectVersion}
          onRestoreVersion={onRestoreVersion}
        />
        <main className="flex-1 min-w-0 relative">
          {generation.active ? (
            <div className="absolute inset-0 overflow-auto bg-[var(--cream)]">
              <ProgressPanel
                stage={generation.stage}
                livePreviewHtml={generation.livePreviewHtml}
                error={generation.error}
                onCancel={onCancelGeneration}
              />
            </div>
          ) : workspaceTab === "mockup" ? (
            selected?.spec.html ? (
              <Mockup html={selected.spec.html} title={`mockup-${selected.id}`} />
            ) : (
              <EmptyMockup />
            )
          ) : (
            <InsightsTab analysis={prototype.analysis} />
          )}
        </main>
      </div>
    </div>
  );
}

function TopBar({
  prototype,
  selected,
  latest,
  viewingLatest,
  onBack,
  onFullscreen,
  onDownload,
}: {
  prototype: Prototype;
  selected: Version | undefined;
  latest: Version | undefined;
  viewingLatest: boolean;
  onBack: () => void;
  onFullscreen: () => void;
  onDownload: () => void;
}) {
  const layout = selected?.spec.layout_pattern ?? latest?.spec.layout_pattern ?? "dashboard";
  const versionIndex = selected
    ? prototype.versions.findIndex((v) => v.id === selected.id) + 1
    : prototype.versions.length;
  const total = prototype.versions.length;

  return (
    <header className="border-b border-[var(--tan)] bg-[var(--cream2)] px-4 py-2 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-[var(--charcoal-soft)] hover:text-[var(--charcoal)]"
        >
          <ArrowLeft className="w-4 h-4" />
          Home
        </button>
        <div className="h-5 w-px bg-[var(--tan)]" />
        <div className="min-w-0 flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--charcoal)] truncate">
            {prototype.name}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--orange)] bg-[var(--orange-50)] border border-[var(--orange-soft)] rounded-full px-2 py-0.5">
            {LAYOUT_LABELS[layout]}
          </span>
          <span className="text-xs text-[var(--charcoal-soft)]">
            v{versionIndex} of {total}
            {!viewingLatest && (
              <span className="ml-1 text-[var(--amber)]">· not latest</span>
            )}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onDownload}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-[var(--tan)] bg-white hover:bg-[var(--cream)]"
          disabled={!selected?.spec.html}
        >
          <Download className="w-3.5 h-3.5" />
          .html
        </button>
        <button
          onClick={onFullscreen}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-[var(--orange)] text-white hover:brightness-95 font-medium"
          disabled={!selected?.spec.html}
        >
          <Maximize2 className="w-3.5 h-3.5" />
          Fullscreen
        </button>
      </div>
    </header>
  );
}

function TabBar({
  active,
  insightCount,
  analysisReady,
  onSet,
}: {
  active: WorkspaceTab;
  insightCount: number;
  analysisReady: boolean;
  onSet: (t: WorkspaceTab) => void;
}) {
  return (
    <div className="border-b border-[var(--tan)] bg-[var(--cream2)] px-4 flex items-center gap-2 flex-shrink-0">
      <Tab
        active={active === "mockup"}
        onClick={() => onSet("mockup")}
        icon={<FileText className="w-3.5 h-3.5" />}
        label="Mockup"
      />
      <Tab
        active={active === "insights"}
        onClick={() => onSet("insights")}
        icon={<TrendingUp className="w-3.5 h-3.5" />}
        label="Insights"
        badge={analysisReady ? insightCount : undefined}
      />
    </div>
  );
}

function Tab({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 " +
        (active
          ? "text-[var(--charcoal)] border-[var(--orange)]"
          : "text-[var(--charcoal-soft)] border-transparent hover:text-[var(--charcoal)]")
      }
    >
      {icon}
      {label}
      {badge !== undefined && (
        <span className="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--orange-50)] text-[var(--orange)] border border-[var(--orange-soft)]">
          {badge}
        </span>
      )}
    </button>
  );
}

function LeftRail({
  prototype,
  selectedVersionId,
  viewingLatest,
  generation,
  latestId,
  onRefine,
  onCancel,
  onSelectVersion,
  onRestoreVersion,
}: {
  prototype: Prototype;
  selectedVersionId: string;
  viewingLatest: boolean;
  generation: GenerationState;
  latestId: string;
  onRefine: (prompt: string) => void;
  onCancel: () => void;
  onSelectVersion: (id: string) => void;
  onRestoreVersion: (id: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  const selected = prototype.versions.find((v) => v.id === selectedVersionId);
  const selectedIndex =
    prototype.versions.findIndex((v) => v.id === selectedVersionId) + 1;
  const canRefine =
    !generation.active &&
    viewingLatest &&
    prompt.trim().length > 0 &&
    prototype.versions.length < LIMITS.maxVersionsPerPrototype;

  return (
    <aside
      className="w-[360px] flex-shrink-0 border-r border-[var(--tan)] bg-[var(--cream2)] flex flex-col"
      style={{ minWidth: 360 }}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-5">
          {/* Refine */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--orange)] mb-1">
              Refine this prototype
            </div>
            <div className="text-xs text-[var(--charcoal-soft)] mb-2">
              Tell the AI what to change. Each refine creates a new version.
            </div>
            <textarea
              value={prompt}
              onChange={(e) =>
                setPrompt(e.target.value.slice(0, LIMITS.maxDescription))
              }
              placeholder={
                viewingLatest
                  ? "e.g., make the chart show the last 7 days"
                  : "Switch to the latest version to refine."
              }
              disabled={!viewingLatest || generation.active}
              className="w-full h-24 px-3 py-2 text-sm rounded-lg border border-[var(--tan)] bg-white text-[var(--charcoal)] resize-y placeholder:text-[var(--charcoal-soft)]/60 focus:outline-none focus:border-[var(--orange)] disabled:opacity-60"
            />
            {generation.active ? (
              <button
                onClick={onCancel}
                className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-[var(--red)] text-[var(--red)] bg-white hover:bg-[var(--red-soft)]"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
            ) : (
              <button
                onClick={() => {
                  if (canRefine) {
                    onRefine(prompt.trim());
                    setPrompt("");
                  }
                }}
                disabled={!canRefine}
                className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-[var(--orange)] text-white font-medium hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate new version
              </button>
            )}
            {!viewingLatest && (
              <div className="mt-2 text-[11px] text-[var(--charcoal-soft)]">
                Viewing v{selectedIndex}.{" "}
                <button
                  onClick={() => onSelectVersion(latestId)}
                  className="underline text-[var(--orange)]"
                >
                  Switch to latest
                </button>{" "}
                or restore this version below.
              </div>
            )}
            {!viewingLatest && selected && (
              <button
                onClick={() => onRestoreVersion(selected.id)}
                className="mt-2 w-full px-3 py-2 text-xs rounded-lg border border-[var(--tan)] bg-white hover:bg-[var(--cream)] text-[var(--charcoal)]"
              >
                Restore v{selectedIndex} as latest
              </button>
            )}
          </div>

          {/* Version history */}
          <div>
            <button
              onClick={() => setHistoryOpen((v) => !v)}
              className="w-full inline-flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--tan)] bg-white hover:bg-[var(--cream)]"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-[var(--charcoal)]">
                <History className="w-4 h-4" />
                Version History
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--orange-50)] text-[var(--orange)] border border-[var(--orange-soft)]">
                  {prototype.versions.length}
                </span>
              </span>
              {historyOpen ? (
                <ChevronUp className="w-4 h-4 text-[var(--charcoal-soft)]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[var(--charcoal-soft)]" />
              )}
            </button>
            {historyOpen && (
              <div className="mt-2 space-y-1 max-h-64 overflow-y-auto pr-1">
                {[...prototype.versions].reverse().map((v, idx) => {
                  const vNum = prototype.versions.length - idx;
                  const isSelected = v.id === selectedVersionId;
                  const isLatest = v.id === latestId;
                  return (
                    <button
                      key={v.id}
                      onClick={() => onSelectVersion(v.id)}
                      className={
                        "w-full text-left p-2.5 rounded-lg border " +
                        (isSelected
                          ? "border-[var(--orange)] bg-white"
                          : "border-[var(--tan)] bg-white/60 hover:bg-white")
                      }
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-[var(--orange-50)] text-[var(--orange)] border border-[var(--orange-soft)]">
                          v{vNum}
                        </span>
                        {isLatest && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--olive-soft)] text-[var(--olive)] border border-[var(--olive-soft)]">
                            Latest
                          </span>
                        )}
                        <span className="text-[11px] text-[var(--charcoal-soft)] ml-auto">
                          {relTime(v.createdAt)}
                        </span>
                      </div>
                      <div className="mt-1.5 text-xs text-[var(--charcoal-soft)] line-clamp-2">
                        {v.refinementPrompt || "Initial version"}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Original description */}
          <div className="rounded-lg bg-white border border-[var(--tan)] p-3">
            <div className="text-[10px] uppercase tracking-wide text-[var(--charcoal-soft)] mb-1">
              Original description
            </div>
            <div className="text-xs text-[var(--charcoal)] whitespace-pre-wrap leading-relaxed">
              {prototype.description}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function EmptyMockup() {
  return (
    <div className="h-full flex items-center justify-center text-sm text-[var(--charcoal-soft)]">
      No mockup for this version.
    </div>
  );
}

function InsightsTab({ analysis }: { analysis: Analysis | null }) {
  if (!analysis) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-[var(--charcoal-soft)]">
        No insights available yet for this prototype.
      </div>
    );
  }
  return <InsightsPanel analysis={analysis} />;
}
