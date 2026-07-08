import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import * as TOML from "@iarna/toml";
import { parse as parseJsonc } from "jsonc-parser";
import type {
  DiscoveredAgent,
  DiscoveredAgentMode,
  DiscoveredAgentProvider,
  DiscoveredAgentsResponse,
} from "goblins-shared-constants";

const PROVIDERS: DiscoveredAgentProvider[] = [
  "codex",
  "claude",
  "cursor",
  "opencode",
];

type ProviderState =
  DiscoveredAgentsResponse["providers"][DiscoveredAgentProvider];

export async function discoverProjectAgents(
  projectDir: string,
): Promise<DiscoveredAgentsResponse> {
  const providers: DiscoveredAgentsResponse["providers"] = {
    codex: { available: false, errors: [] },
    claude: { available: false, errors: [] },
    cursor: { available: false, errors: [] },
    opencode: { available: false, errors: [] },
  };

  async function scanProvider(
    provider: DiscoveredAgentProvider,
    scan: () => Promise<DiscoveredAgent[]>,
  ): Promise<DiscoveredAgent[]> {
    try {
      const agents = await scan();
      providers[provider].available = agents.length > 0;
      return agents;
    } catch (error) {
      providers[provider].errors.push(
        error instanceof Error ? error.message : String(error),
      );
      return [];
    }
  }

  const batches = await Promise.all([
    scanProvider("codex", () => scanCodex(projectDir)),
    scanProvider("claude", () => scanClaude(projectDir)),
    scanProvider("cursor", () => scanCursor(projectDir)),
    scanProvider("opencode", () => scanOpenCode(projectDir)),
  ]);

  return {
    agents: applyPrecedence(batches.flat()),
    scannedAt: new Date().toISOString(),
    providers,
  };
}

export async function updateDiscoveredAgentInstructions(input: {
  projectDir: string;
  agentId: string;
  instructions: string;
}): Promise<DiscoveredAgent> {
  const discovered = await discoverProjectAgents(input.projectDir);
  const agent = discovered.agents.find((item) => item.id === input.agentId);
  if (!agent?.sourcePath) {
    throw new Error("Discovered agent is not backed by an editable file");
  }

  const current = await readFile(agent.sourcePath, "utf8");
  await writeFile(
    agent.sourcePath,
    replaceInstructions(current, input.instructions, agent.sourceKind),
  );

  const refreshed = await discoverProjectAgents(input.projectDir);
  return (
    refreshed.agents.find((item) => item.id === input.agentId) ?? {
      ...agent,
      instructions: input.instructions,
      instructionsPreview: preview(input.instructions),
    }
  );
}

async function scanCodex(projectDir: string): Promise<DiscoveredAgent[]> {
  const agents = await scanMarkdownProvider("codex", [
    scopedDir(projectDir, ".codex", "agents"),
    scopedDir(os.homedir(), ".codex", "agents"),
  ]);
  const tomlAgents = await scanTomlProvider("codex", [
    scopedDir(projectDir, ".codex", "agents"),
    scopedDir(os.homedir(), ".codex", "agents"),
  ]);
  const instructions = await scanInstructionFiles("codex", [
    { file: path.join(projectDir, "AGENTS.md"), scope: "project" as const },
    { file: path.join(os.homedir(), ".codex", "AGENTS.md"), scope: "user" as const },
  ]);
  return [...agents, ...tomlAgents, ...instructions];
}

async function scanClaude(projectDir: string): Promise<DiscoveredAgent[]> {
  const agents = await scanMarkdownProvider("claude", [
    scopedDir(projectDir, ".claude", "agents"),
    scopedDir(os.homedir(), ".claude", "agents"),
  ]);
  const instructions = await scanInstructionFiles("claude", [
    { file: path.join(projectDir, "CLAUDE.md"), scope: "project" as const },
    { file: path.join(os.homedir(), ".claude", "CLAUDE.md"), scope: "user" as const },
  ]);
  return [...agents, ...instructions];
}

async function scanCursor(projectDir: string): Promise<DiscoveredAgent[]> {
  const markdownAgents = await scanMarkdownProvider("cursor", [
    scopedDir(projectDir, ".cursor", "agents"),
    scopedDir(os.homedir(), ".cursor", "agents"),
    scopedDir(projectDir, ".cursor", "rules"),
    scopedDir(os.homedir(), ".cursor", "rules"),
  ]);
  return markdownAgents;
}

async function scanOpenCode(projectDir: string): Promise<DiscoveredAgent[]> {
  const markdownAgents = await scanMarkdownProvider("opencode", [
    scopedDir(projectDir, ".opencode", "agent"),
    scopedDir(projectDir, ".opencode", "agents"),
    scopedDir(os.homedir(), ".config", "opencode", "agent"),
    scopedDir(os.homedir(), ".config", "opencode", "agents"),
  ]);

  const jsonAgents = await scanOpenCodeConfig(projectDir);
  return [...markdownAgents, ...jsonAgents];
}

async function scanInstructionFiles(
  provider: DiscoveredAgentProvider,
  files: Array<{ file: string; scope: "project" | "user" }>,
): Promise<DiscoveredAgent[]> {
  const agents: DiscoveredAgent[] = [];
  for (const item of files) {
    if (!existsSync(item.file)) continue;
    const content = (await readFile(item.file, "utf8")).trim();
    if (!content) continue;
    agents.push(
      buildAgent({
        provider,
        name: "instructions",
        displayName: `${provider} instructions`,
        description: "Root instructions file",
        instructions: content,
        mode: "primary",
        scope: item.scope,
        sourcePath: item.file,
        sourceKind: "markdown",
        metadata: {},
      }),
    );
  }
  return agents;
}

function scopedDir(root: string, ...segments: string[]) {
  const fullPath = path.join(root, ...segments);
  return {
    dir: fullPath,
    scope: root === os.homedir() ? ("user" as const) : ("project" as const),
  };
}

async function scanMarkdownProvider(
  provider: DiscoveredAgentProvider,
  dirs: Array<{ dir: string; scope: "project" | "user" }>,
): Promise<DiscoveredAgent[]> {
  const agents: DiscoveredAgent[] = [];
  for (const item of dirs) {
    const files = await findFiles(item.dir, [".md", ".mdc"]);
    for (const file of files) {
      const content = await readFile(file, "utf8");
      const parsed = parseMarkdownAgent(content);
      const name = parsed.metadata.name || fileNameWithoutExt(file);
      agents.push(
        buildAgent({
          provider,
          name,
          displayName: parsed.metadata.displayName || parsed.metadata.title || name,
          description: parsed.metadata.description,
          instructions: parsed.body,
          model: parsed.metadata.model,
          mode: normalizeMode(parsed.metadata.mode ?? parsed.metadata.type),
          scope: item.scope,
          sourcePath: file,
          sourceKind: "markdown",
          metadata: parsed.metadata,
        }),
      );
    }
  }
  return agents;
}

async function scanTomlProvider(
  provider: DiscoveredAgentProvider,
  dirs: Array<{ dir: string; scope: "project" | "user" }>,
): Promise<DiscoveredAgent[]> {
  const agents: DiscoveredAgent[] = [];
  for (const item of dirs) {
    const files = await findFiles(item.dir, [".toml"]);
    for (const file of files) {
      const content = await readFile(file, "utf8");
      const parsed = TOML.parse(content);
      if (!isRecord(parsed)) continue;
      const name = stringValue(parsed.name) || fileNameWithoutExt(file);
      agents.push(
        buildAgent({
          provider,
          name,
          displayName: stringValue(parsed.display_name) || stringValue(parsed.title) || name,
          description: stringValue(parsed.description),
          instructions: content,
          model: stringValue(parsed.model),
          mode: normalizeMode(parsed.mode ?? parsed.type ?? "subagent"),
          scope: item.scope,
          sourcePath: file,
          sourceKind: "toml",
          metadata: parsed,
        }),
      );
    }
  }
  return agents;
}

async function scanOpenCodeConfig(projectDir: string): Promise<DiscoveredAgent[]> {
  const configPaths = [
    { file: path.join(projectDir, "opencode.json"), scope: "project" as const },
    { file: path.join(projectDir, "opencode.jsonc"), scope: "project" as const },
    {
      file: path.join(os.homedir(), ".config", "opencode", "opencode.json"),
      scope: "user" as const,
    },
    {
      file: path.join(os.homedir(), ".config", "opencode", "opencode.jsonc"),
      scope: "user" as const,
    },
  ];
  const agents: DiscoveredAgent[] = [];
  for (const { file, scope } of configPaths) {
    if (!existsSync(file)) continue;
    const data = parseJsonc(await readFile(file, "utf8"));
    const agentConfig = isRecord(data) && isRecord(data.agent) ? data.agent : null;
    if (!agentConfig) continue;
    for (const [name, value] of Object.entries(agentConfig)) {
      if (!isRecord(value)) continue;
      const instructions =
        stringValue(value.prompt) ||
        stringValue(value.instructions) ||
        stringValue(value.system);
      agents.push(
        buildAgent({
          provider: "opencode",
          name,
          displayName: stringValue(value.name) || name,
          description: stringValue(value.description),
          instructions,
          model: stringValue(value.model),
          mode: normalizeMode(value.mode),
          scope,
          sourcePath: file,
          sourceKind: "json",
          metadata: value,
        }),
      );
    }
  }
  return agents;
}

async function findFiles(dir: string, extensions: string[]): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return findFiles(fullPath, extensions);
      if (entry.isFile() && extensions.includes(path.extname(entry.name))) {
        return [fullPath];
      }
      return [];
    }),
  );
  return files.flat();
}

function parseMarkdownAgent(content: string): {
  metadata: Record<string, string>;
  body: string;
} {
  if (!content.startsWith("---")) return { metadata: {}, body: content.trim() };
  const end = content.indexOf("\n---", 3);
  if (end === -1) return { metadata: {}, body: content.trim() };
  const frontmatter = content.slice(3, end).trim();
  const body = content.slice(end + 4).trim();
  return { metadata: parseKeyValueBlock(frontmatter), body };
}

function parseKeyValueBlock(value: string): Record<string, string> {
  const metadata: Record<string, string> = {};
  for (const line of value.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!match) continue;
    const key = match[1];
    const rawValue = match[2];
    if (!key || rawValue === undefined) continue;
    metadata[key] = rawValue.replace(/^['"]|['"]$/g, "").trim();
  }
  return metadata;
}

function replaceInstructions(
  content: string,
  instructions: string,
  sourceKind: DiscoveredAgent["sourceKind"],
): string {
  if (sourceKind === "toml") {
    return `${instructions.trim()}\n`;
  }
  if (!content.startsWith("---")) return `${instructions.trim()}\n`;
  const end = content.indexOf("\n---", 3);
  if (end === -1) return `${instructions.trim()}\n`;
  return `${content.slice(0, end + 4).trimEnd()}\n\n${instructions.trim()}\n`;
}

function buildAgent(input: {
  provider: DiscoveredAgentProvider;
  name: string;
  displayName: string;
  description?: string;
  instructions?: string;
  model?: string;
  mode: DiscoveredAgentMode;
  scope: "project" | "user";
  sourcePath: string;
  sourceKind: "markdown" | "json" | "toml";
  metadata: Record<string, unknown>;
}): DiscoveredAgent {
  const id = [
    input.provider,
    input.scope,
    input.sourcePath,
    input.name,
  ].join(":");
  const instructions = input.instructions?.trim();
  return {
    id,
    provider: input.provider,
    name: input.name,
    displayName: input.displayName,
    description: input.description,
    instructions,
    instructionsPreview: instructions ? preview(instructions) : undefined,
    model: input.model,
    mode: input.mode,
    scope: input.scope,
    sourcePath: input.sourcePath,
    sourceKind: input.sourceKind,
    metadata: input.metadata,
    validation: {
      valid: Boolean(instructions),
      warnings: instructions ? [] : ["No instructions were found."],
      errors: [],
    },
    precedenceRank: input.scope === "project" ? 0 : 1,
  };
}

function applyPrecedence(agents: DiscoveredAgent[]): DiscoveredAgent[] {
  const byKey = new Map<string, DiscoveredAgent[]>();
  for (const agent of agents) {
    const key = `${agent.provider}:${agent.name}`;
    const group = byKey.get(key) ?? [];
    group.push(agent);
    byKey.set(key, group);
  }
  for (const group of byKey.values()) {
    group.sort((a, b) => a.precedenceRank - b.precedenceRank);
    const winner = group[0];
    if (!winner) continue;
    for (const shadowed of group.slice(1)) {
      shadowed.shadowedBy = winner.id;
    }
  }
  return agents.sort((a, b) => {
    if (a.precedenceRank !== b.precedenceRank) {
      return a.precedenceRank - b.precedenceRank;
    }
    return a.displayName.localeCompare(b.displayName);
  });
}

function normalizeMode(value: unknown): DiscoveredAgentMode {
  if (value === "primary" || value === "subagent" || value === "all") {
    return value;
  }
  return "unknown";
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function fileNameWithoutExt(file: string): string {
  return path.basename(file, path.extname(file));
}

function preview(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 220);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
