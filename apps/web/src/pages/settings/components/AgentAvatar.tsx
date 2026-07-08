import BoringAvatar from "boring-avatars";
import type { DiscoveredAgent } from "goblins-shared-constants";

const AVATAR_COLORS = ["#67e8f9", "#22d3ee", "#0f172a", "#e0f2fe", "#f8fafc"];

type AgentAvatarProps = {
  agent: DiscoveredAgent;
  size?: "default" | "lg";
};

export function AgentAvatar({ agent, size = "default" }: AgentAvatarProps) {
  const pixelSize = size === "lg" ? 56 : 44;

  return (
    <div
      className={
        size === "lg"
          ? "size-14 shrink-0 overflow-hidden rounded-2xl shadow-sm ring-1 ring-border/80"
          : "size-11 shrink-0 overflow-hidden rounded-2xl shadow-sm ring-1 ring-border/80"
      }
    >
      <BoringAvatar
        name={agent.id}
        title
        size={pixelSize}
        square
        variant="beam"
        colors={AVATAR_COLORS}
      />
    </div>
  );
}
