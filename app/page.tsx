"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import Home from "@/components/Home";
import NewWorkflow from "@/components/NewWorkflow";
import Workspace, { type WorkspaceTab } from "@/components/Workspace";
import Admin from "@/components/Admin";
import Fullscreen from "@/components/Fullscreen";
import type { Stage } from "@/components/ProgressPanel";
import type { Example } from "@/components/examples";
import {
  classifyMetadata,
  streamHtml,
  generateAnalysis,
  AiTimeoutError,
  AiError,
  NotAWorkflowError,
} from "@/lib/ai";
import NotAWorkflowDialog from "@/components/NotAWorkflowDialog";
import { buildContextBlock } from "@/lib/prompts";
import {
  loadState,
  saveState,
  StorageQuotaError,
  makeId,
  LIMITS,
} from "@/lib/storage";
import type {
  Analysis,
  LayoutPattern,
  Prototype,
  StructuredAnswers,
  Version,
} from "@/lib/types";

type Screen =
  | { kind: "home" }
  | { kind: "new"; prefill?: { description: string; structured: StructuredAnswers } }
  | {
      kind: "workspace";
      prototypeId: string;
      versionId: string;
      tab: WorkspaceTab;
    }
  | { kind: "admin" }
  | { kind: "fullscreen"; prototypeId: string; versionId: string };

interface GenerationState {
  active: boolean;
  stage: Stage;
  livePreviewHtml: string | null;
  error: string | null;
}

const INITIAL_GENERATION: GenerationState = {
  active: false,
  stage: "metadata",
  livePreviewHtml: null,
  error: null,
};

export default function Page() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

function App() {
  const [hydrated, setHydrated] = useState(false);
  const [prototypes, setPrototypes] = useState<Prototype[]>([]);
  const [masterPrompt, setMasterPrompt] = useState<string>("");
  const [dataReality, setDataReality] = useState<string>("");
  const [screen, setScreen] = useState<Screen>({ kind: "home" });
  const [generation, setGeneration] = useState<GenerationState>(INITIAL_GENERATION);
  const [toast, setToast] = useState<string | null>(null);
  const [notWorkflowOpen, setNotWorkflowOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);
  const prototypesRef = useRef<Prototype[]>([]);
  const masterPromptRef = useRef<string>("");
  const dataRealityRef = useRef<string>("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial hydration: pull from the server
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await loadState();
        if (cancelled) return;
        setPrototypes(s.prototypes);
        setMasterPrompt(s.masterPrompt);
        setDataReality(s.dataReality);
        prototypesRef.current = s.prototypes;
        masterPromptRef.current = s.masterPrompt;
        dataRealityRef.current = s.dataReality;
        setHydrated(true);
      } catch (err) {
        if (cancelled) return;
        setToast(
          `Could not load saved state: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
        setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Mirror to refs (so async generation always sees the latest)
  useEffect(() => {
    prototypesRef.current = prototypes;
  }, [prototypes]);
  useEffect(() => {
    masterPromptRef.current = masterPrompt;
  }, [masterPrompt]);
  useEffect(() => {
    dataRealityRef.current = dataReality;
  }, [dataReality]);

  // Debounced server save whenever any persisted slice changes
  useEffect(() => {
    if (!hydrated) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      saveState({
        prototypes: prototypesRef.current,
        masterPrompt: masterPromptRef.current,
        dataReality: dataRealityRef.current,
        updatedAt: Date.now(),
      }).catch((err) => {
        if (err instanceof StorageQuotaError) setToast(err.message);
        else
          setToast(
            `Save failed: ${err instanceof Error ? err.message : String(err)}`
          );
      });
    }, 800);
    return () => {
      // Note: we deliberately do NOT clear the timer here, so the save still
      // fires after the user stops typing or navigates between screens.
    };
  }, [prototypes, masterPrompt, dataReality, hydrated]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const cancelGeneration = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setGeneration(INITIAL_GENERATION);
  }, []);

  const startGeneration = useCallback(
    async (opts: {
      description: string;
      structured: StructuredAnswers;
      refine?: {
        prototypeId: string;
        baseVersionId: string;
        refinementPrompt: string;
      };
    }) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const myRun = ++runIdRef.current;
      const isCurrent = () => runIdRef.current === myRun;

      const context = buildContextBlock({
        masterPrompt: masterPromptRef.current,
        dataReality: dataRealityRef.current,
        structured: opts.structured,
      });

      setGeneration({ active: true, stage: "metadata", livePreviewHtml: null, error: null });

      try {
        let name: string;
        let summary: string;
        let layout: LayoutPattern;
        let rationale: string;
        let prototypeId: string;
        let parentVersion: Version | null = null;

        if (opts.refine) {
          const proto = prototypesRef.current.find((p) => p.id === opts.refine!.prototypeId);
          if (!proto) throw new AiError("Prototype not found");
          const base = proto.versions.find((v) => v.id === opts.refine!.baseVersionId);
          if (!base) throw new AiError("Base version not found");
          name = proto.name;
          summary = base.spec.summary;
          layout = base.spec.layout_pattern;
          rationale = base.spec.layout_rationale;
          prototypeId = proto.id;
          parentVersion = base;
        } else {
          if (prototypesRef.current.length >= LIMITS.maxPrototypes) {
            throw new AiError(
              `Prototype limit reached (${LIMITS.maxPrototypes}). Delete some to continue.`
            );
          }
          const meta = await classifyMetadata({
            description: opts.description,
            context,
            signal: controller.signal,
          });
          if (!isCurrent()) return;
          name = meta.name;
          summary = meta.summary;
          layout = meta.layout_pattern;
          rationale = meta.layout_rationale;
          prototypeId = makeId("proto");

          const now = Date.now();
          const stub: Prototype = {
            id: prototypeId,
            name,
            description: opts.description,
            structuredAnswers: opts.structured,
            versions: [],
            analysis: null,
            createdAt: now,
            updatedAt: now,
          };
          setPrototypes((prev) => [stub, ...prev]);
          setScreen({
            kind: "workspace",
            prototypeId,
            versionId: "",
            tab: "mockup",
          });
        }

        // ---- Stage 2 + 3: HTML and Analysis run in parallel ----
        if (!isCurrent()) return;
        setGeneration((g) => ({ ...g, stage: "html", livePreviewHtml: "" }));

        let analysisDone = false;
        const analysisPromise: Promise<Analysis | null> = opts.refine
          ? Promise.resolve(null)
          : generateAnalysis({
              description: opts.description,
              context,
              name,
              summary,
              layout,
              signal: controller.signal,
            })
              .then((a) => {
                analysisDone = true;
                if (isCurrent()) {
                  setPrototypes((prev) =>
                    prev.map((p) =>
                      p.id === prototypeId ? { ...p, analysis: a } : p
                    )
                  );
                }
                return a;
              })
              .catch((err) => {
                analysisDone = true;
                if ((err as Error)?.name === "AbortError") return null;
                console.warn("Analysis failed", err);
                if (isCurrent()) {
                  setToast("Analysis failed — mockup saved without insights.");
                }
                return null;
              });

        const { html, truncated } = await streamHtml({
          description: opts.description,
          context,
          layout,
          rationale,
          name,
          summary,
          refinementPrompt: opts.refine?.refinementPrompt,
          previousHtml: parentVersion?.spec.html,
          signal: controller.signal,
          onChunk: (partial) => {
            if (!isCurrent()) return;
            setGeneration((g) => ({ ...g, livePreviewHtml: partial }));
          },
        });

        if (!isCurrent()) return;

        if (truncated) {
          setToast("Mockup may be incomplete — the model hit its token limit.");
        }

        const newVersion: Version = {
          id: makeId("ver"),
          createdAt: Date.now(),
          spec: {
            name,
            summary,
            layout_pattern: layout,
            layout_rationale: rationale,
            html,
          },
          refinementPrompt: opts.refine?.refinementPrompt ?? null,
          parentVersionId: parentVersion?.id ?? null,
        };

        setPrototypes((prev) =>
          prev.map((p) => {
            if (p.id !== prototypeId) return p;
            const versions = [...p.versions, newVersion].slice(
              -LIMITS.maxVersionsPerPrototype
            );
            return { ...p, name, versions, updatedAt: Date.now() };
          })
        );
        setScreen((s) =>
          s.kind === "workspace" && s.prototypeId === prototypeId
            ? { ...s, versionId: newVersion.id }
            : s
        );

        // If analysis is still running, advance the stage indicator and wait
        // for it before clearing the progress panel. Otherwise (refinement or
        // analysis already done) finish immediately.
        if (!opts.refine && !analysisDone) {
          if (!isCurrent()) return;
          setGeneration((g) => ({ ...g, stage: "analysis" }));
          await analysisPromise;
        }

        if (!isCurrent()) return;
        setGeneration(INITIAL_GENERATION);
      } catch (err) {
        if (!isCurrent()) return;
        if ((err as Error)?.name === "AbortError") return;
        if (err instanceof NotAWorkflowError) {
          setGeneration(INITIAL_GENERATION);
          setNotWorkflowOpen(true);
          return;
        }
        let msg: string;
        if (err instanceof AiTimeoutError) msg = `${err.stage} timed out. Try again.`;
        else if (err instanceof AiError)
          msg = err.message + (err.detail ? `: ${err.detail}` : "");
        else msg = (err as Error)?.message ?? "Unknown error";
        setGeneration({
          active: true,
          stage: "metadata",
          livePreviewHtml: null,
          error: msg,
        });
      }
    },
    []
  );

  const handleExample = useCallback((e: Example) => {
    setScreen({
      kind: "new",
      prefill: { description: e.description, structured: e.structured ?? {} },
    });
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      setPrototypes((prev) => prev.filter((p) => p.id !== id));
      if (
        (screen.kind === "workspace" || screen.kind === "fullscreen") &&
        screen.prototypeId === id
      ) {
        setScreen({ kind: "home" });
      }
    },
    [screen]
  );

  const downloadHtml = useCallback((name: string, html: string) => {
    const blob = new Blob(
      [
        `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(
          name
        )}</title></head><body>${html}</body></html>`,
      ],
      { type: "text/html" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(name)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  const restoreVersion = useCallback((prototypeId: string, versionId: string) => {
    setPrototypes((prev) =>
      prev.map((p) => {
        if (p.id !== prototypeId) return p;
        const idx = p.versions.findIndex((v) => v.id === versionId);
        const src = p.versions[idx];
        if (!src) return p;
        const clone: Version = {
          id: makeId("ver"),
          createdAt: Date.now(),
          spec: { ...src.spec },
          refinementPrompt: `Restored from v${idx + 1}`,
          parentVersionId: src.id,
        };
        return {
          ...p,
          versions: [...p.versions, clone].slice(-LIMITS.maxVersionsPerPrototype),
          updatedAt: Date.now(),
        };
      })
    );
    setScreen((s) =>
      s.kind === "workspace" && s.prototypeId === prototypeId
        ? { ...s, versionId: "" }
        : s
    );
  }, []);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--charcoal-soft)] text-sm">
        Loading…
      </div>
    );
  }

  let content: React.ReactNode = null;

  if (screen.kind === "home") {
    content = (
      <Home
        prototypes={prototypes}
        onNew={() => setScreen({ kind: "new" })}
        onOpenAdmin={() => setScreen({ kind: "admin" })}
        onOpen={(id) =>
          setScreen({ kind: "workspace", prototypeId: id, versionId: "", tab: "mockup" })
        }
        onDelete={handleDelete}
        onExample={handleExample}
      />
    );
  } else if (screen.kind === "new") {
    content = (
      <NewWorkflow
        initialDescription={screen.prefill?.description ?? ""}
        initialStructured={screen.prefill?.structured ?? {}}
        busy={generation.active}
        onCancel={() => {
          cancelGeneration();
          setScreen({ kind: "home" });
        }}
        onGenerate={(description, structured) => {
          startGeneration({ description, structured });
        }}
        onExample={handleExample}
      />
    );
  } else if (screen.kind === "admin") {
    content = (
      <Admin
        masterPrompt={masterPrompt}
        dataReality={dataReality}
        onMasterPromptChange={setMasterPrompt}
        onDataRealityChange={setDataReality}
        onBack={() => setScreen({ kind: "home" })}
      />
    );
  } else if (screen.kind === "workspace") {
    const proto = prototypes.find((p) => p.id === screen.prototypeId);
    if (!proto) {
      content = <NotFound onHome={() => setScreen({ kind: "home" })} />;
    } else {
      const latest = proto.versions[proto.versions.length - 1];
      const selectedId = screen.versionId || latest?.id || "";
      content = (
        <Workspace
          prototype={proto}
          selectedVersionId={selectedId}
          workspaceTab={screen.tab}
          generation={generation}
          onSelectVersion={(id) =>
            setScreen((s) => (s.kind === "workspace" ? { ...s, versionId: id } : s))
          }
          onBackHome={() => {
            cancelGeneration();
            setScreen({ kind: "home" });
          }}
          onFullscreen={() => {
            const v = proto.versions.find((vv) => vv.id === selectedId);
            if (!v) return;
            setScreen({
              kind: "fullscreen",
              prototypeId: proto.id,
              versionId: v.id,
            });
          }}
          onDownload={() => {
            const v = proto.versions.find((vv) => vv.id === selectedId);
            if (!v) return;
            downloadHtml(proto.name, v.spec.html);
          }}
          onSetTab={(tab) =>
            setScreen((s) => (s.kind === "workspace" ? { ...s, tab } : s))
          }
          onRefine={(prompt) => {
            startGeneration({
              description: proto.description,
              structured: proto.structuredAnswers,
              refine: {
                prototypeId: proto.id,
                baseVersionId: latest?.id ?? selectedId,
                refinementPrompt: prompt,
              },
            });
          }}
          onCancelGeneration={cancelGeneration}
          onRestoreVersion={(id) => restoreVersion(proto.id, id)}
        />
      );
    }
  } else if (screen.kind === "fullscreen") {
    const proto = prototypes.find((p) => p.id === screen.prototypeId);
    const v = proto?.versions.find((vv) => vv.id === screen.versionId);
    if (!proto || !v) {
      content = <NotFound onHome={() => setScreen({ kind: "home" })} />;
    } else {
      content = (
        <Fullscreen
          name={proto.name}
          html={v.spec.html}
          layout={v.spec.layout_pattern}
          onExit={() =>
            setScreen({
              kind: "workspace",
              prototypeId: proto.id,
              versionId: v.id,
              tab: "mockup",
            })
          }
          onDownload={() => downloadHtml(proto.name, v.spec.html)}
        />
      );
    }
  }

  return (
    <>
      {content}
      <NotAWorkflowDialog
        open={notWorkflowOpen}
        onClose={() => setNotWorkflowOpen(false)}
      />
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-[var(--tan)] bg-white shadow-lg px-4 py-3 text-sm text-[var(--charcoal)]">
          {toast}
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-xs text-[var(--charcoal-soft)] underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </>
  );
}

function NotFound({ onHome }: { onHome: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-lg font-semibold text-[var(--charcoal)]">
          Prototype not found
        </div>
        <button
          onClick={onHome}
          className="mt-4 px-3 py-2 rounded-lg bg-[var(--orange)] text-white text-sm"
        >
          Go home
        </button>
      </div>
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;"
  );
}

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "mockup"
  );
}
