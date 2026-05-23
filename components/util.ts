import type { LayoutPattern } from "@/lib/types";

export function relTime(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  const days = Math.floor(diff / 86_400_000);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export const LAYOUT_LABELS: Record<LayoutPattern, string> = {
  dashboard: "Dashboard",
  inbox: "Inbox",
  chat: "Chat",
  approval_queue: "Approval queue",
  report: "Report",
  sequential: "Sequential",
};
