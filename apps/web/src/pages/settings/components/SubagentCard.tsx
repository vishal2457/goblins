import type { DiscoveredAgent } from "goblins-shared-constants";
import { ExternalLink } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { AgentAvatar } from "./AgentAvatar";

type SubagentCardProps = {
  agent: DiscoveredAgent;
  onOpen: () => void;
};

export function SubagentCard({ agent, onOpen }: SubagentCardProps) {
  return (
    <Card className="rounded-lg border-border/70 bg-card/95 transition-[border-color,box-shadow] duration-500 ease-out hover:border-cyan-300/50 hover:shadow-[0_12px_34px_-28px_rgba(6,182,212,0.65),0_0_0_1px_rgba(103,232,249,0.12)]">
      <CardHeader className="gap-4">
        <div className="flex items-start gap-3">
          <AgentAvatar agent={agent} />
          <div className="min-w-0 flex-1">
            <CardTitle className="line-clamp-1">{agent.displayName}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2 min-h-10">
              {agent.description || "Ready to handle delegated work."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap gap-1.5">
          <Badge variant="secondary" className="capitalize">
            {agent.provider}
          </Badge>
          <Badge variant="outline" className="capitalize">
            {agent.scope}
          </Badge>
          {!agent.validation.valid && (
            <Badge variant="destructive">Needs setup</Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 shrink-0 px-2.5"
          onClick={onOpen}
        >
          View
          <ExternalLink className="ml-2 h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}
