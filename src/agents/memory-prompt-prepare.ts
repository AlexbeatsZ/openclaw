import path from "node:path";
import type { MemoryCitationsMode } from "../config/types.memory.js";
import { CANONICAL_ROOT_MEMORY_FILENAME } from "../memory/root-memory-files.js";
import {
  prepareMemoryPromptSection,
  type PreparedMemoryPromptSection,
} from "../plugins/memory-state.js";
import type { EmbeddedContextFile } from "./embedded-agent-helpers.js";

function normalizeComparablePath(value: string): string {
  const normalized = path.normalize(value);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

/**
 * Keeps root MEMORY.md out of the always-on prompt when the run can retrieve
 * memory explicitly. Durable memory remains available without becoming policy.
 */
export function routeRootMemoryContextThroughTools(params: {
  contextFiles: readonly EmbeddedContextFile[];
  workspaceDir: string;
  preparedMemoryPrompt?: PreparedMemoryPromptSection;
}): EmbeddedContextFile[] {
  const memoryTools = new Set(
    params.preparedMemoryPrompt?.context.availableTools.filter(
      (name) => name === "memory_search" || name === "memory_get",
    ) ?? [],
  );
  if (memoryTools.size === 0) {
    return [...params.contextFiles];
  }
  const rootMemoryPath = normalizeComparablePath(
    path.resolve(params.workspaceDir, CANONICAL_ROOT_MEMORY_FILENAME),
  );
  return params.contextFiles.filter((file) => {
    const candidate = path.isAbsolute(file.path)
      ? file.path
      : path.resolve(params.workspaceDir, file.path);
    return normalizeComparablePath(candidate) !== rootMemoryPath;
  });
}

/** Prepare memory prompt state with the same normalized tool context used by assembly. */
export async function prepareAgentMemoryPrompt(params: {
  enabled: boolean;
  toolNames: Iterable<string>;
  capabilityToolNames?: Iterable<string>;
  citationsMode?: MemoryCitationsMode;
  agentId?: string;
  agentSessionKey?: string;
  sandboxed?: boolean;
}): Promise<PreparedMemoryPromptSection | undefined> {
  if (!params.enabled) {
    return undefined;
  }
  const availableTools = new Set(
    [...params.toolNames, ...(params.capabilityToolNames ?? [])]
      .map((tool) => tool.trim().toLowerCase())
      .filter(Boolean),
  );
  return prepareMemoryPromptSection({
    availableTools,
    citationsMode: params.citationsMode,
    agentId: params.agentId,
    agentSessionKey: params.agentSessionKey,
    sandboxed: params.sandboxed,
  });
}
