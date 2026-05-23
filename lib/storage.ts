import type { Prototype } from "./types";
import { DEFAULT_MASTER_PROMPT, DEFAULT_DATA_REALITY } from "./prompts";

const API = "/api/state";

// Legacy localStorage keys (used only for one-time migration).
const LEGACY_PROTOS = "protos_1915s_v4";
const LEGACY_MASTER = "admin_prompt_1915s_v1";
const LEGACY_DATA_REALITY = "data_reality_1915s_v1";
const MIGRATION_FLAG = "migrated_to_server_v1";

export const LIMITS = {
  maxPrototypes: 100,
  maxVersionsPerPrototype: 30,
  maxDescription: 5000,
  maxMasterPrompt: 50_000,
  maxDataReality: 100_000,
  maxStructuredAnswer: 500,
};

export class StorageQuotaError extends Error {
  constructor() {
    super("Server payload is too large. Delete some prototypes to free space.");
    this.name = "StorageQuotaError";
  }
}

export interface AppState {
  prototypes: Prototype[];
  masterPrompt: string;
  dataReality: string;
  updatedAt: number;
}

interface ServerState {
  prototypes: Prototype[];
  masterPrompt: string | null;
  dataReality: string | null;
  updatedAt: number;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readLegacyLocal(): {
  prototypes: Prototype[];
  masterPrompt: string | null;
  dataReality: string | null;
} {
  if (!isBrowser()) {
    return { prototypes: [], masterPrompt: null, dataReality: null };
  }
  let prototypes: Prototype[] = [];
  try {
    const raw = window.localStorage.getItem(LEGACY_PROTOS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) prototypes = parsed as Prototype[];
    }
  } catch {
    /* ignore */
  }
  const masterPrompt =
    (isBrowser() && window.localStorage.getItem(LEGACY_MASTER)) || null;
  const dataReality =
    (isBrowser() && window.localStorage.getItem(LEGACY_DATA_REALITY)) || null;
  return { prototypes, masterPrompt, dataReality };
}

function clearLegacyLocal() {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(LEGACY_PROTOS);
    window.localStorage.removeItem(LEGACY_MASTER);
    window.localStorage.removeItem(LEGACY_DATA_REALITY);
    window.localStorage.setItem(MIGRATION_FLAG, "1");
  } catch {
    /* ignore */
  }
}

function migrationAlreadyDone(): boolean {
  if (!isBrowser()) return true;
  try {
    return window.localStorage.getItem(MIGRATION_FLAG) === "1";
  } catch {
    return true;
  }
}

async function fetchServerState(): Promise<ServerState> {
  const res = await fetch(API, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Server load failed: ${res.status}`);
  }
  return (await res.json()) as ServerState;
}

async function writeServerState(state: ServerState): Promise<void> {
  const body = JSON.stringify(state);
  const res = await fetch(API, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body,
  });
  if (res.status === 413) throw new StorageQuotaError();
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Server save failed: ${res.status} ${text.slice(0, 200)}`);
  }
}

/**
 * Loads state from the server. On first run, migrates any prior localStorage
 * data up to the server and clears it.
 */
export async function loadState(): Promise<AppState> {
  let server = await fetchServerState();

  if (
    isBrowser() &&
    !migrationAlreadyDone() &&
    server.prototypes.length === 0 &&
    !server.masterPrompt &&
    !server.dataReality
  ) {
    const legacy = readLegacyLocal();
    const hasLegacy =
      legacy.prototypes.length > 0 || legacy.masterPrompt || legacy.dataReality;
    if (hasLegacy) {
      const migrated: ServerState = {
        prototypes: legacy.prototypes,
        masterPrompt: legacy.masterPrompt,
        dataReality: legacy.dataReality,
        updatedAt: Date.now(),
      };
      try {
        await writeServerState(migrated);
        server = migrated;
      } catch (err) {
        console.warn("Migration write failed; keeping legacy local:", err);
      }
    }
    clearLegacyLocal();
  }

  return {
    prototypes: server.prototypes,
    masterPrompt: server.masterPrompt ?? DEFAULT_MASTER_PROMPT,
    dataReality: server.dataReality ?? DEFAULT_DATA_REALITY,
    updatedAt: server.updatedAt,
  };
}

export async function saveState(state: AppState): Promise<void> {
  const clipped: ServerState = {
    prototypes: state.prototypes.slice(0, LIMITS.maxPrototypes),
    masterPrompt: state.masterPrompt.slice(0, LIMITS.maxMasterPrompt),
    dataReality: state.dataReality.slice(0, LIMITS.maxDataReality),
    updatedAt: Date.now(),
  };
  await writeServerState(clipped);
}

export function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
