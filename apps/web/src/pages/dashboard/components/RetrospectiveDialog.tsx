import { Loader2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Label } from "../../../components/ui/label";

export function RetrospectiveDialog({
  open,
  userPoints,
  isStarting,
  onOpenChange,
  onUserPointsChange,
  onStart,
}: {
  open: boolean;
  userPoints: string;
  isStarting: boolean;
  onOpenChange: (open: boolean) => void;
  onUserPointsChange: (value: string) => void;
  onStart: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[560px] overflow-hidden p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0 bg-muted/10">
          <DialogTitle>Start retrospective</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 p-6">
          <Label htmlFor="retrospective-user-points" className="text-sm font-medium">
            Points that would make the system better
          </Label>
          <textarea
            id="retrospective-user-points"
            value={userPoints}
            onChange={(event) => onUserPointsChange(event.target.value)}
            className="min-h-[140px] w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="Add anything the retrospective agent should consider, or leave this blank."
            maxLength={4000}
          />
        </div>
        <DialogFooter className="border-t shrink-0 px-6 py-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isStarting}
          >
            Cancel
          </Button>
          <Button className="gap-1.5" onClick={onStart} disabled={isStarting}>
            {isStarting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Start retrospective
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
