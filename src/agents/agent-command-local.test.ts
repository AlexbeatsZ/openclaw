import { describe, expect, it, vi } from "vitest";
import type { RuntimeEnv } from "../runtime.js";
import { runLocalAgentCommand } from "./agent-command-local.js";
import {
  bindActiveOperatorTurnAuthority,
  type CronCreatorAuthorityCapability,
} from "./cron-creator-authority-context.js";

const mocks = vi.hoisted(() => ({
  prepare: vi.fn(),
  resolveDeps: vi.fn(async () => ({})),
  withAgentPluginRegistry: vi.fn(async ({ run }: { run: () => Promise<unknown> }) => await run()),
}));

vi.mock("./command/prepare.js", () => ({
  prepareAgentCommandExecution: mocks.prepare,
}));

vi.mock("./command/runtime-loaders.js", () => ({
  resolveAgentCommandDeps: mocks.resolveDeps,
}));

vi.mock("./runtime-plugins.js", () => ({
  withAgentPluginRegistry: mocks.withAgentPluginRegistry,
}));

function createPrepared(senderIsOwner: boolean) {
  return {
    cfg: {},
    opts: { runId: "run-local", senderIsOwner },
    runId: "run-local",
    workspaceDir: "/tmp/openclaw-agent-command-local-test",
    runtimePluginSelections: [{ provider: "agy", modelId: "flash", agentId: "main" }],
  };
}

describe("runLocalAgentCommand operator authority", () => {
  it("binds local authority to the exact admitted operator run and revokes it at settlement", async () => {
    mocks.prepare.mockResolvedValueOnce(createPrepared(true));
    let retained: ReturnType<typeof bindActiveOperatorTurnAuthority>;
    let capability: CronCreatorAuthorityCapability | undefined;

    await runLocalAgentCommand({
      opts: { message: "test", runId: "run-local" },
      runtime: {} as RuntimeEnv,
      operatorAuthority: true,
      run: async (prepared) => {
        capability = prepared.opts.cronCreatorAuthorityCapability;
        retained = bindActiveOperatorTurnAuthority(prepared.runId);
        expect(capability?.callerOrigin).toEqual({ kind: "local" });
        expect(retained?.source).toBe("local");
      },
    });

    expect(() => retained?.assertActive()).toThrow();
    expect(capability?.active).toBe(false);
  });

  it("does not mint local authority for a non-owner or system run", async () => {
    for (const testCase of [
      { operatorAuthority: true, senderIsOwner: false },
      { operatorAuthority: false, senderIsOwner: true },
    ]) {
      mocks.prepare.mockResolvedValueOnce(createPrepared(testCase.senderIsOwner));
      await runLocalAgentCommand({
        opts: { message: "test", runId: "run-local" },
        runtime: {} as RuntimeEnv,
        operatorAuthority: testCase.operatorAuthority,
        run: async (prepared) => {
          expect(prepared.opts.cronCreatorAuthorityCapability).toBeUndefined();
          expect(bindActiveOperatorTurnAuthority(prepared.runId)).toBeUndefined();
        },
      });
    }
  });

  it("loads the provider owner selected during command preparation", async () => {
    mocks.prepare.mockResolvedValueOnce(createPrepared(true));

    await runLocalAgentCommand({
      opts: { message: "test", runId: "run-local" },
      runtime: {} as RuntimeEnv,
      run: async () => undefined,
    });

    expect(mocks.withAgentPluginRegistry).toHaveBeenLastCalledWith(
      expect.objectContaining({
        selections: [{ provider: "agy", modelId: "flash", agentId: "main" }],
      }),
    );
  });
});
