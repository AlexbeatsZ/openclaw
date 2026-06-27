// Agy stream adapter executes the local agy CLI and wraps stdout as an assistant stream.
import { spawn } from "node:child_process";
import type { StreamFn } from "openclaw/plugin-sdk/agent-core";
import { formatErrorMessage } from "openclaw/plugin-sdk/error-runtime";
import type {
  AssistantMessage,
  Context,
  ImageContent,
  Message,
  Model,
  StopReason,
  TextContent,
  ThinkingContent,
  ToolCall,
  Usage,
} from "openclaw/plugin-sdk/llm";
import { createAssistantMessageEventStream } from "openclaw/plugin-sdk/llm";
import type { OpenClawConfig } from "openclaw/plugin-sdk/plugin-entry";
import {
  materializeWindowsSpawnProgram,
  resolveWindowsSpawnProgram,
} from "openclaw/plugin-sdk/windows-spawn";
import { AGY_DEFAULT_MODEL_ID } from "./catalog.js";

export type AgyPluginConfig = {
  command?: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
  maxOutputBytes?: number;
  modelArg?: string;
  promptArg?: string;
  includeSystemPrompt?: boolean;
};

export type AgyCliRunResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
};

export type AgyCliRunner = (request: {
  command: string;
  args: string[];
  cwd?: string;
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
  maxOutputBytes: number;
  signal?: AbortSignal;
}) => Promise<AgyCliRunResult>;

const DEFAULT_AGY_COMMAND = "agy";
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_MAX_OUTPUT_BYTES = 10 * 1024 * 1024;
const CHARS_PER_TOKEN_ESTIMATE = 4;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const result = value.filter((entry): entry is string => typeof entry === "string");
  return result.length > 0 ? result : undefined;
}

function readPositiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function readStringRecord(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const entries = Object.entries(value).filter(
    (entry): entry is [string, string] =>
      typeof entry[0] === "string" && typeof entry[1] === "string",
  );
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

export function readAgyPluginConfig(config?: OpenClawConfig): AgyPluginConfig {
  const pluginConfig = config?.plugins?.entries?.agy?.config;
  if (!isRecord(pluginConfig)) {
    return {};
  }
  return {
    command: readString(pluginConfig.command),
    args: readStringArray(pluginConfig.args),
    cwd: readString(pluginConfig.cwd),
    env: readStringRecord(pluginConfig.env),
    timeoutMs: readPositiveInteger(pluginConfig.timeoutMs),
    maxOutputBytes: readPositiveInteger(pluginConfig.maxOutputBytes),
    modelArg: readString(pluginConfig.modelArg),
    promptArg: readString(pluginConfig.promptArg),
    includeSystemPrompt: readBoolean(pluginConfig.includeSystemPrompt),
  };
}

export function buildAgyCliArgs(params: {
  modelId: string;
  prompt: string;
  config?: AgyPluginConfig;
}): string[] {
  const args = [...(params.config?.args ?? [])];
  const modelId = params.modelId.trim();
  if (modelId && modelId !== AGY_DEFAULT_MODEL_ID) {
    args.push(params.config?.modelArg ?? "--model", modelId);
  }
  args.push(params.config?.promptArg ?? "-p", params.prompt);
  return args;
}

export function formatAgyPrompt(
  context: Context,
  options: { includeSystemPrompt?: boolean } = {},
): string {
  const sections: string[] = [];
  const systemPrompt = options.includeSystemPrompt ? context.systemPrompt?.trim() : undefined;
  if (systemPrompt) {
    sections.push(`System:\n${systemPrompt}`);
  }

  const conversation = context.messages
    .map(formatMessage)
    .filter((entry) => entry.trim().length > 0)
    .join("\n\n");
  if (conversation) {
    sections.push(`Conversation:\n${conversation}`);
  }
  return sections.join("\n\n").trim();
}

function formatMessage(message: Message): string {
  if (message.role === "user") {
    return `User:\n${extractText(message.content)}`;
  }
  if (message.role === "assistant") {
    const text = extractAssistantText(message.content);
    return text ? `Assistant:\n${text}` : "";
  }
  const text = extractText(message.content);
  const prefix = message.toolName ? `Tool result (${message.toolName})` : "Tool result";
  return `${prefix}:\n${text}`;
}

function extractAssistantText(content: Array<TextContent | ThinkingContent | ToolCall>): string {
  const parts: string[] = [];
  for (const part of content) {
    if (part.type === "text") {
      parts.push(part.text);
      continue;
    }
    if (part.type === "thinking") {
      parts.push(`[thinking]\n${part.thinking}`);
      continue;
    }
    if (part.type === "toolCall") {
      parts.push(`[tool call: ${part.name}]\n${safeJson(part.arguments)}`);
    }
  }
  return parts.join("\n\n").trim();
}

function extractText(content: string | Array<TextContent | ImageContent>): string {
  if (typeof content === "string") {
    return content;
  }
  const parts: string[] = [];
  for (const part of content) {
    if (part.type === "text") {
      parts.push(part.text);
    } else if (part.type === "image") {
      parts.push(`[image omitted${part.mimeType ? `: ${part.mimeType}` : ""}]`);
    }
  }
  return parts.join("\n\n").trim();
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function stripAnsi(input: string): string {
  return input
    .replace(/\u001B\][\s\S]*?(?:\u0007|\u001B\\)/g, "")
    .replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, "");
}

function estimateTokensFromChars(chars: number): number {
  if (!Number.isFinite(chars) || chars <= 0) {
    return 0;
  }
  return Math.max(1, Math.round(chars / CHARS_PER_TOKEN_ESTIMATE));
}

function buildUsage(params: { inputChars: number; outputChars: number }): Usage {
  const input = estimateTokensFromChars(params.inputChars);
  const output = estimateTokensFromChars(params.outputChars);
  return {
    input,
    output,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: input + output,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  };
}

function buildAssistantMessage(params: {
  model: Model;
  text: string;
  stopReason: StopReason;
  usage: Usage;
  errorMessage?: string;
}): AssistantMessage {
  return {
    role: "assistant",
    content: params.text ? [{ type: "text", text: params.text }] : [],
    api: params.model.api,
    provider: params.model.provider,
    model: params.model.id,
    usage: params.usage,
    stopReason: params.stopReason,
    ...(params.errorMessage ? { errorMessage: params.errorMessage } : {}),
    timestamp: Date.now(),
  };
}

export function createAgyStreamFn(
  params: {
    config?: AgyPluginConfig;
    runner?: AgyCliRunner;
  } = {},
): StreamFn {
  const runner = params.runner ?? runAgyCli;
  return (model, context, options) => {
    const stream = createAssistantMessageEventStream();
    const run = async () => {
      const config = params.config ?? {};
      const prompt = formatAgyPrompt(context, {
        includeSystemPrompt: config.includeSystemPrompt === true,
      });
      const modelInfo = model;
      try {
        const result = await runner({
          command: config.command ?? DEFAULT_AGY_COMMAND,
          args: buildAgyCliArgs({ modelId: model.id, prompt, config }),
          cwd: config.cwd,
          env: { ...process.env, ...(config.env ?? {}) },
          timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
          maxOutputBytes: config.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES,
          signal: options?.signal,
        });
        if (result.exitCode !== 0) {
          const stderr = stripAnsi(result.stderr).trim();
          const stdout = stripAnsi(result.stdout).trim();
          throw new Error(
            [
              `agy exited with code ${result.exitCode ?? "null"}${result.signal ? ` (${result.signal})` : ""}`,
              stderr || stdout,
            ]
              .filter(Boolean)
              .join(": "),
          );
        }
        const text = stripAnsi(result.stdout || result.stderr).trim();
        const usage = buildUsage({ inputChars: prompt.length, outputChars: text.length });
        const empty = buildAssistantMessage({
          model: modelInfo,
          text: "",
          stopReason: "stop",
          usage: buildUsage({ inputChars: 0, outputChars: 0 }),
        });
        stream.push({ type: "start", partial: empty });
        stream.push({ type: "text_start", contentIndex: 0, partial: empty });
        if (text) {
          stream.push({ type: "text_delta", contentIndex: 0, delta: text });
        }
        const message = buildAssistantMessage({
          model: modelInfo,
          text,
          stopReason: "stop",
          usage,
        });
        stream.push({ type: "text_end", contentIndex: 0, content: text, partial: message });
        stream.push({ type: "done", reason: "stop", message });
        stream.end(message);
      } catch (error) {
        const stopReason = options?.signal?.aborted ? "aborted" : "error";
        const message = buildAssistantMessage({
          model: modelInfo,
          text: "",
          stopReason,
          usage: buildUsage({ inputChars: prompt.length, outputChars: 0 }),
          errorMessage: formatErrorMessage(error),
        });
        stream.push({ type: "error", reason: stopReason, error: message });
        stream.end(message);
      }
    };
    queueMicrotask(() => void run());
    return stream;
  };
}

export function runAgyCli(request: {
  command: string;
  args: string[];
  cwd?: string;
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
  maxOutputBytes: number;
  signal?: AbortSignal;
}): Promise<AgyCliRunResult> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let stdout = "";
    let stderr = "";
    const program = resolveWindowsSpawnProgram({
      command: request.command,
      env: request.env,
    });
    const invocation = materializeWindowsSpawnProgram(program, request.args);
    const child = spawn(invocation.command, invocation.argv, {
      cwd: request.cwd,
      env: request.env,
      shell: invocation.shell,
      windowsHide: invocation.windowsHide,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const finish = (fn: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      request.signal?.removeEventListener("abort", onAbort);
      fn();
    };

    const killWithError = (message: string) => {
      child.kill();
      finish(() => reject(new Error(message)));
    };

    const appendOutput = (kind: "stdout" | "stderr", chunk: Buffer) => {
      const next = chunk.toString("utf8");
      if (kind === "stdout") {
        stdout += next;
      } else {
        stderr += next;
      }
      if (Buffer.byteLength(stdout) + Buffer.byteLength(stderr) > request.maxOutputBytes) {
        killWithError(`agy output exceeded ${request.maxOutputBytes} bytes`);
      }
    };

    const onAbort = () => killWithError("agy request was aborted");
    const timeout = setTimeout(
      () => killWithError(`agy timed out after ${request.timeoutMs}ms`),
      request.timeoutMs,
    );

    request.signal?.addEventListener("abort", onAbort, { once: true });
    child.stdout?.on("data", (chunk: Buffer) => appendOutput("stdout", chunk));
    child.stderr?.on("data", (chunk: Buffer) => appendOutput("stderr", chunk));
    child.on("error", (error) => finish(() => reject(error)));
    child.on("close", (exitCode, signal) =>
      finish(() =>
        resolve({
          stdout,
          stderr,
          exitCode,
          signal,
        }),
      ),
    );
  });
}
