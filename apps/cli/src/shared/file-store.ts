import crypto from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import YAML from "yaml";

export type MarkdownRecord<T> = { data: T; body: string; filePath: string };

export type RegisteredProject = { id: string; location: string };
export const daemonRoot = () => path.join(homedir(), ".goblins");
export const projectsRegistryFile = () => path.join(daemonRoot(), "projects.json");
export const goblinsRoot = (projectDir = process.cwd()) => path.join(projectDir, ".goblins");
export const goalsRoot = (projectDir = process.cwd()) => path.join(goblinsRoot(projectDir), "goals");
export const auditRoot = () => path.join(daemonRoot(), "audit");
export const projectFile = (projectDir = process.cwd()) => path.join(goblinsRoot(projectDir), "project.md");
export const goalDir = (id: string, projectDir = process.cwd()) => path.join(goalsRoot(projectDir), id);
export const goalFile = (id: string, projectDir = process.cwd()) => path.join(goalDir(id, projectDir), "goal.md");
export const ticketFile = (goalId: string, id: string, projectDir = process.cwd()) =>
  path.join(goalDir(goalId, projectDir), `ticket-${id}.md`);

export function now(): Date {
  return new Date();
}

export function id(): string {
  return crypto.randomUUID();
}

export async function ensureStore(projectDir = process.cwd(), register = true): Promise<void> {
  const location = path.resolve(projectDir);
  await Promise.all([
    mkdir(goalsRoot(location), { recursive: true }),
    mkdir(auditRoot(), { recursive: true }),
  ]);
  let project = (await readMarkdown<RegisteredProject>(projectFile(location)))?.data;
  if (!project) {
    const timestamp = now();
    project = {
      id: id(),
      name: path.basename(location),
      location,
      description: "Goblins project",
      createdAt: timestamp,
      updatedAt: timestamp,
    } as RegisteredProject;
    await writeMarkdown(projectFile(location), project, "Goblins project metadata.");
  }
  if (register) await registerProject({ id: project.id, location });
}

export async function registeredProjects(): Promise<RegisteredProject[]> {
  try {
    return JSON.parse(await readFile(projectsRegistryFile(), "utf8")) as RegisteredProject[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function registerProject(project: RegisteredProject): Promise<void> {
  const projects = await registeredProjects();
  const normalized = { ...project, location: path.resolve(project.location) };
  const next = projects.filter((item) => item.id !== project.id && path.resolve(item.location) !== normalized.location);
  next.push(normalized);
  await writeJson(projectsRegistryFile(), next);
}

export async function unregisterProject(projectId: string): Promise<void> {
  await writeJson(projectsRegistryFile(), (await registeredProjects()).filter((item) => item.id !== projectId));
}

export async function readMarkdown<T>(filePath: string): Promise<MarkdownRecord<T> | null> {
  try {
    const source = await readFile(filePath, "utf8");
    const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
    if (!match) throw new Error(`Invalid Markdown frontmatter: ${filePath}`);
    return { data: reviveDates(YAML.parse(match[1]!) as T), body: match[2]!.trim(), filePath };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function writeMarkdown<T extends object>(
  filePath: string,
  data: T,
  body = "",
): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const serialized = YAML.stringify(toPlain(data), { lineWidth: 0 }).trimEnd();
  const content = `---\n${serialized}\n---\n${body.trim()}${body.trim() ? "\n" : ""}`;
  const temporary = `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await writeFile(temporary, content, "utf8");
  await rename(temporary, filePath);
}

export async function markdownFiles(directory: string): Promise<string[]> {
  try {
    return (await readdir(directory, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => path.join(directory, entry.name));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function goalDirectories(): Promise<string[]> {
  const projects = await registeredProjects();
  const groups = await Promise.all(projects.map(async (project) => {
    try {
      return (await readdir(goalsRoot(project.location), { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.join(goalsRoot(project.location), entry.name));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }));
  return groups.flat();
}

export async function removePath(target: string): Promise<void> {
  await rm(target, { recursive: true, force: true });
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, filePath);
}

function toPlain(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toPlain);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, toPlain(child)]));
  }
  return value;
}

function reviveDates<T>(value: T): T {
  const dateKeys = /(?:At|Date)$/;
  if (Array.isArray(value)) return value.map(reviveDates) as T;
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (typeof child === "string" && dateKeys.test(key) && !Number.isNaN(Date.parse(child))) {
        (value as Record<string, unknown>)[key] = new Date(child);
      } else {
        (value as Record<string, unknown>)[key] = reviveDates(child);
      }
    }
  }
  return value;
}
