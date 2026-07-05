import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import type {
  WorkflowDocument,
  WorkflowPreset,
} from "goblins-shared-constants";
import {
  BadRequestError,
  NotFoundError,
} from "../../../shared/utils/http-errors.util";

const PRESET_METADATA: Record<
  string,
  Pick<WorkflowPreset, "name" | "description" | "teamType">
> = {
  "software-development": {
    name: "Software Development",
    description: "TDD-oriented delivery workflow for engineering teams.",
    teamType: "software",
  },
  "marketing-team": {
    name: "Marketing Team",
    description:
      "Campaign planning, asset production, approval, and launch workflow.",
    teamType: "marketing",
  },
  "leadership-team": {
    name: "Leadership Team",
    description:
      "Strategic initiative workflow for executive decisions and follow-through.",
    teamType: "leadership",
  },
};

export class WorkflowService {
  private readonly workflowRelativePath = path.join(
    "references",
    "workflow.md",
  );
  private readonly presetsRelativePath = path.join(
    "references",
    "workflow-presets",
  );

  getWorkflow(): WorkflowDocument {
    const activeWorkflowPath = this.getActiveWorkflowPath();
    const presets = this.listPresets();
    const content = readFileSync(activeWorkflowPath, "utf8");
    const defaultPreset = presets.find(
      (preset) => preset.id === "software-development",
    );

    return {
      content,
      sourcePath: activeWorkflowPath,
      isCustomized: defaultPreset
        ? content.trim() !== defaultPreset.content.trim()
        : true,
      presets,
    };
  }

  updateWorkflow(content: string): WorkflowDocument {
    const activeWorkflowPath = this.getActiveWorkflowPath();
    mkdirSync(path.dirname(activeWorkflowPath), { recursive: true });
    writeFileSync(activeWorkflowPath, `${content.trim()}\n`, "utf8");
    return this.getWorkflow();
  }

  resetWorkflow(): WorkflowDocument {
    const preset = this.findPreset("software-development");
    return this.updateWorkflow(preset.content);
  }

  applyPreset(id: string): WorkflowDocument {
    const preset = this.findPreset(id);
    return this.updateWorkflow(preset.content);
  }

  listPresets(): WorkflowPreset[] {
    const presetsDir = this.getPresetsPath();
    if (!existsSync(presetsDir)) return [];

    return readdirSync(presetsDir)
      .filter((fileName) => fileName.endsWith(".md"))
      .sort()
      .map((fileName) => {
        const id = path.basename(fileName, ".md");
        const metadata = PRESET_METADATA[id] || {
          name: this.titleize(id),
          description: "Reusable workflow preset.",
          teamType: "general" as const,
        };

        return {
          id,
          ...metadata,
          content: readFileSync(path.join(presetsDir, fileName), "utf8"),
        };
      });
  }

  private findPreset(id: string): WorkflowPreset {
    const preset = this.listPresets().find((item) => item.id === id);
    if (!preset) throw new NotFoundError(`Workflow preset '${id}' not found`);
    return preset;
  }

  private getActiveWorkflowPath(): string {
    const skillDir = this.getSkillDir();
    const workflowPath = path.join(skillDir, this.workflowRelativePath);
    if (!existsSync(workflowPath)) {
      const defaultPreset = path.join(
        skillDir,
        this.presetsRelativePath,
        "software-development.md",
      );
      if (!existsSync(defaultPreset)) {
        throw new NotFoundError("Default workflow file not found");
      }
      mkdirSync(path.dirname(workflowPath), { recursive: true });
      writeFileSync(workflowPath, readFileSync(defaultPreset, "utf8"), "utf8");
    }
    return workflowPath;
  }

  private getPresetsPath(): string {
    return path.join(this.getSkillDir(), this.presetsRelativePath);
  }

  private getSkillDir(): string {
    const candidates = [
      process.env.GOBLINS_SKILL_DIR,
      path.resolve(process.cwd(), "packages", "skills", "goblins"),
      path.resolve(process.cwd(), "..", "..", "packages", "skills", "goblins"),
      path.resolve(__dirname, "..", "..", "..", "skills", "goblins"),
      path.resolve(
        __dirname,
        "..",
        "..",
        "..",
        "..",
        "..",
        "..",
        "packages",
        "skills",
        "goblins",
      ),
    ].filter(Boolean) as string[];

    const skillDir = candidates.find((candidate) => {
      const workflowFile = path.join(candidate, this.workflowRelativePath);
      const presetsDir = path.join(candidate, this.presetsRelativePath);
      return existsSync(workflowFile) || existsSync(presetsDir);
    });

    if (!skillDir) {
      throw new NotFoundError("Goblins skill directory not found");
    }

    try {
      const referencesDir = path.join(skillDir, "references");
      mkdirSync(referencesDir, { recursive: true });
      accessSync(referencesDir, constants.W_OK);
    } catch (error) {
      throw new BadRequestError(
        `Workflow file is not writable in ${skillDir}`,
        error,
      );
    }

    return skillDir;
  }

  private titleize(value: string): string {
    return value
      .split("-")
      .filter(Boolean)
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join(" ");
  }
}
