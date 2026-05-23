export type LayoutPattern =
  | "dashboard"
  | "inbox"
  | "chat"
  | "approval_queue"
  | "report"
  | "sequential";

export type Severity = "high" | "medium" | "low";

export type SystemCategory =
  | "data source"
  | "messaging"
  | "auth"
  | "storage"
  | "ai/ml"
  | "integration"
  | "ui"
  | "other";

export interface StructuredAnswers {
  audience?: string;
  trigger?: string;
  decision?: string;
  frequency?: string;
  success?: string;
}

export interface Spec {
  name: string;
  summary: string;
  layout_pattern: LayoutPattern;
  layout_rationale: string;
  html: string;
}

export interface Version {
  id: string;
  createdAt: number;
  spec: Spec;
  refinementPrompt: string | null;
  parentVersionId: string | null;
}

export interface DataGap {
  title: string;
  detail: string;
  severity: Severity;
}

export interface SystemNeeded {
  title: string;
  detail: string;
  category: SystemCategory;
}

export interface Impact {
  primary_metric: string;
  baseline_estimate: string;
  target_estimate: string;
  annual_value: string;
  confidence: "high" | "medium" | "low";
  assumptions: string[];
}

export interface Analysis {
  data_gaps: DataGap[];
  systems_needed: SystemNeeded[];
  impact: Impact;
}

export interface Prototype {
  id: string;
  name: string;
  description: string;
  structuredAnswers: StructuredAnswers;
  versions: Version[];
  analysis: Analysis | null;
  createdAt: number;
  updatedAt: number;
}

export interface MetadataResult {
  is_workflow?: boolean;
  name: string;
  summary: string;
  layout_pattern: LayoutPattern;
  layout_rationale: string;
}
