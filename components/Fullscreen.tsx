"use client";

import { Download, Minimize2 } from "lucide-react";
import Mockup from "./Mockup";
import { LAYOUT_LABELS } from "./util";
import type { LayoutPattern } from "@/lib/types";

interface Props {
  name: string;
  html: string;
  layout: LayoutPattern;
  onExit: () => void;
  onDownload: () => void;
}

export default function Fullscreen({ name, html, layout, onExit, onDownload }: Props) {
  return (
    <div className="h-screen flex flex-col bg-[var(--cream)]">
      <header className="flex items-center justify-between px-4 py-2 border-b border-[var(--tan)] bg-[var(--cream2)] flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onExit}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-[var(--tan)] bg-white hover:bg-[var(--cream)]"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            Exit
          </button>
          <span className="text-sm font-semibold text-[var(--charcoal)] truncate">
            {name}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--orange)] bg-[var(--orange-50)] border border-[var(--orange-soft)] rounded-full px-2 py-0.5">
            {LAYOUT_LABELS[layout]}
          </span>
        </div>
        <button
          onClick={onDownload}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-[var(--tan)] bg-white hover:bg-[var(--cream)]"
        >
          <Download className="w-3.5 h-3.5" />
          Download HTML
        </button>
      </header>
      <div className="flex-1 min-h-0">
        <Mockup html={html} title="fullscreen-mockup" />
      </div>
    </div>
  );
}
