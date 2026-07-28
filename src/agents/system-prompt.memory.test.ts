// System prompt memory tests cover opt-out behavior when context engines own
// memory prompt assembly for a run.
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearMemoryPluginState,
  registerMemoryPromptPreparation,
  registerMemoryPromptSection,
} from "../plugins/memory-state.test-fixtures.js";
import {
  prepareAgentMemoryPrompt,
  routeRootMemoryContextThroughTools,
} from "./memory-prompt-prepare.js";
import { buildAgentSystemPrompt } from "./system-prompt.js";

describe("buildAgentSystemPrompt memory guidance", () => {
  afterEach(() => {
    clearMemoryPluginState();
  });

  it("can suppress base memory guidance so context engines own memory prompt assembly", () => {
    registerMemoryPromptSection(() => ["## Memory Recall", "Use memory carefully.", ""]);

    const promptWithMemory = buildAgentSystemPrompt({
      workspaceDir: "/tmp/openclaw",
    });
    const promptWithoutMemory = buildAgentSystemPrompt({
      workspaceDir: "/tmp/openclaw",
      includeMemorySection: false,
    });

    expect(promptWithMemory).toContain("## Memory Recall");
    expect(promptWithoutMemory).not.toContain("## Memory Recall");
  });

  it("passes the active agent context to memory prompt assembly", () => {
    let observedContext:
      | { agentId?: string; agentSessionKey?: string; sandboxed?: boolean }
      | undefined;
    registerMemoryPromptSection((context) => {
      observedContext = context;
      return [
        "## Agent Memory",
        `agent=${context.agentId} session=${context.agentSessionKey} sandboxed=${context.sandboxed}`,
        "",
      ];
    });

    const prompt = buildAgentSystemPrompt({
      workspaceDir: "/tmp/openclaw",
      toolNames: ["memory_search", "memory_get"],
      runtimeInfo: {
        agentId: "marketing-agent",
        sessionKey: "agent:marketing-agent:main",
      },
      sandboxInfo: { enabled: true },
    });

    expect(observedContext).toMatchObject({
      agentId: "marketing-agent",
      agentSessionKey: "agent:marketing-agent:main",
      sandboxed: true,
    });
    expect(prompt).toContain(
      "agent=marketing-agent session=agent:marketing-agent:main sandboxed=true",
    );
  });

  it("hands prepared memory lines to synchronous prompt assembly", async () => {
    const prepare = vi.fn(async () => ["## Prepared Wiki", "Prepared before assembly.", ""]);
    registerMemoryPromptPreparation("memory-wiki", prepare);
    const preparedMemoryPrompt = await prepareAgentMemoryPrompt({
      enabled: true,
      toolNames: ["WIKI_SEARCH"],
      agentId: "main",
      agentSessionKey: "agent:main:main",
    });

    const prompt = buildAgentSystemPrompt({
      workspaceDir: "/tmp/openclaw",
      toolNames: ["WIKI_SEARCH"],
      runtimeInfo: { agentId: "main", sessionKey: "agent:main:main" },
      preparedMemoryPrompt,
    });

    expect(prompt).toContain("## Prepared Wiki\nPrepared before assembly.");
    expect(prepare).toHaveBeenCalledTimes(1);
  });

  it("routes only the workspace root MEMORY.md through memory tools", async () => {
    registerMemoryPromptSection(() => ["## Memory Recall", "Use memory tools.", ""]);
    const preparedMemoryPrompt = await prepareAgentMemoryPrompt({
      enabled: true,
      toolNames: ["memory_search", "memory_get"],
    });
    const workspaceDir = path.resolve("tmp", "openclaw");
    const rootMemoryPath = path.join(workspaceDir, "MEMORY.md");
    const projectMemoryPath = path.join(workspaceDir, "project", "MEMORY.md");
    const soulPath = path.join(workspaceDir, "SOUL.md");

    const contextFiles = routeRootMemoryContextThroughTools({
      workspaceDir,
      preparedMemoryPrompt,
      contextFiles: [
        { path: rootMemoryPath, content: "old durable memory" },
        { path: projectMemoryPath, content: "project-local instructions" },
        { path: soulPath, content: "persona" },
      ],
    });

    expect(contextFiles).toEqual([
      { path: projectMemoryPath, content: "project-local instructions" },
      { path: soulPath, content: "persona" },
    ]);
  });

  it("keeps root MEMORY.md inline when memory tools are unavailable", () => {
    const contextFiles = [{ path: "MEMORY.md", content: "fallback memory" }];
    expect(
      routeRootMemoryContextThroughTools({
        workspaceDir: "/tmp/openclaw",
        contextFiles,
      }),
    ).toEqual(contextFiles);
  });
});
