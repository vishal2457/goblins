import { useEffect, useState } from "react";
import type { Goal, Project } from "@goblins/shared-constants";

function readSearchParam(key: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(key);
}

export function useDashboardSelection(projects: Project[], goals: Goal[]) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() =>
    readSearchParam("projectId"),
  );
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(() =>
    readSearchParam("goalId"),
  );

  useEffect(() => {
    const selectedGoal = selectedGoalId
      ? goals.find((goal) => goal.id === selectedGoalId)
      : undefined;
    const projectId =
      selectedGoal?.projectId ||
      (selectedProjectId &&
      projects.some((project) => project.id === selectedProjectId)
        ? selectedProjectId
        : projects[0]?.id || null);
    const projectGoals = projectId
      ? goals.filter((goal) => goal.projectId === projectId)
      : [];
    const goalId =
      selectedGoal && selectedGoal.projectId === projectId
        ? selectedGoal.id
        : projectGoals[0]?.id || null;

    if (projectId !== selectedProjectId) {
      setSelectedProjectId(projectId);
    }
    if (goalId !== selectedGoalId) {
      setSelectedGoalId(goalId);
    }
  }, [goals, projects, selectedGoalId, selectedProjectId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const currentProject = params.get("projectId");
    const currentGoal = params.get("goalId");

    if (selectedProjectId) params.set("projectId", selectedProjectId);
    else params.delete("projectId");

    if (selectedGoalId) params.set("goalId", selectedGoalId);
    else params.delete("goalId");

    if (
      params.get("projectId") === currentProject &&
      params.get("goalId") === currentGoal
    ) {
      return;
    }

    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", nextUrl);
  }, [selectedGoalId, selectedProjectId]);

  return {
    selectedProjectId,
    setSelectedProjectId,
    selectedGoalId,
    setSelectedGoalId,
  };
}
