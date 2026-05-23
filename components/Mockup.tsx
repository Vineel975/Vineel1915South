"use client";

import { useEffect, useRef } from "react";

interface Props {
  html: string;
  /** When true (default), only writes if html changed since last write */
  dedupe?: boolean;
  className?: string;
  title?: string;
  scale?: number;
}

/**
 * Renders arbitrary HTML inside an iframe. Throttles writes during streaming.
 */
export default function Mockup({
  html,
  dedupe = true,
  className,
  title = "mockup",
  scale,
}: Props) {
  const ref = useRef<HTMLIFrameElement | null>(null);
  const lastWriteRef = useRef<{ at: number; html: string }>({ at: 0, html: "" });
  const pendingRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const flush = () => {
      const iframe = ref.current;
      const next = pendingRef.current;
      if (!iframe || next == null) return;
      const doc = iframe.contentDocument;
      if (!doc) return;
      if (dedupe && lastWriteRef.current.html === next) return;
      try {
        doc.open();
        doc.write(`<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#FAF7F2;color:#1F1A14;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif;}</style></head><body>${next}</body></html>`);
        doc.close();
      } catch (err) {
        console.warn("Mockup write failed", err);
      }
      lastWriteRef.current = { at: Date.now(), html: next };
    };

    pendingRef.current = html;
    const since = Date.now() - lastWriteRef.current.at;
    if (since >= 60) {
      flush();
    } else if (!timerRef.current) {
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        flush();
      }, 60 - since);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [html, dedupe]);

  if (scale) {
    return (
      <div
        className={className}
        style={{ position: "relative", overflow: "hidden" }}
      >
        <iframe
          ref={ref}
          title={title}
          sandbox="allow-same-origin"
          style={{
            border: 0,
            background: "#FAF7F2",
            width: `${100 / scale}%`,
            height: `${100 / scale}%`,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            pointerEvents: "none",
          }}
        />
      </div>
    );
  }

  return (
    <iframe
      ref={ref}
      title={title}
      sandbox="allow-same-origin"
      className={className}
      style={{ border: 0, background: "#FAF7F2", width: "100%", height: "100%" }}
    />
  );
}
