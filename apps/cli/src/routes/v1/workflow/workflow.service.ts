import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import type { WorkflowDocument } from "goblins-shared-constants";
import {
  BadRequestError,
  NotFoundError,
} from "../../../shared/utils/http-errors.util";

export class WorkflowService {
  private readonly workflowRelativePath = path.join(
    "references",
    "workflow.md",
  );

  getWorkflow(): WorkflowDocument {
    const activeWorkflowPath = this.getActiveWorkflowPath();
    const content = readFileSync(activeWorkflowPath, "utf8");

    return {
      content,
      sourcePath: activeWorkflowPath,
    };
  }

  updateWorkflow(content: string): WorkflowDocument {
    const activeWorkflowPath = this.getActiveWorkflowPath();
    mkdirSync(path.dirname(activeWorkflowPath), { recursive: true });
    writeFileSync(activeWorkflowPath, `${content.trim()}\n`, "utf8");
    return this.getWorkflow();
  }

  private getActiveWorkflowPath(): string {
    const skillDir = this.getSkillDir();
    const workflowPath = path.join(skillDir, this.workflowRelativePath);
    if (!existsSync(workflowPath)) {
      throw new NotFoundError("Workflow file not found");
    }
    return workflowPath;
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
      return existsSync(workflowFile);
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
}
