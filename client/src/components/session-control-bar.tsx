import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Timer, XCircle } from "lucide-react";

interface SessionControlBarProps {
  latencyMs: number;
  onLatencyChange: (ms: number) => void;
  simulateReject: boolean;
  onSimulateRejectChange: (enabled: boolean) => void;
  sessionName: string;
}

export function SessionControlBar({
  latencyMs,
  onLatencyChange,
  simulateReject,
  onSimulateRejectChange,
  sessionName,
}: SessionControlBarProps) {
  return (
    <div className="h-12 border-b bg-card/50 px-4 flex items-center gap-6">
      <Badge variant="outline" className="font-semibold">
        {sessionName}
      </Badge>
      
      <div className="flex items-center gap-2">
        <Timer className="h-4 w-4 text-muted-foreground" />
        <Label htmlFor="latency" className="text-sm font-medium whitespace-nowrap">
          Latency:
        </Label>
        <Input
          id="latency"
          data-testid="input-latency"
          type="number"
          min="0"
          max="5000"
          step="100"
          value={latencyMs}
          onChange={(e) => onLatencyChange(Number(e.target.value))}
          className="w-24 h-8 text-sm font-mono"
        />
        <span className="text-xs text-muted-foreground">ms</span>
      </div>

      <div className="flex items-center gap-2">
        <XCircle className="h-4 w-4 text-muted-foreground" />
        <Label htmlFor="simulate-reject" className="text-sm font-medium whitespace-nowrap">
          Simulate Reject
        </Label>
        <Switch
          id="simulate-reject"
          data-testid="switch-simulate-reject"
          checked={simulateReject}
          onCheckedChange={onSimulateRejectChange}
        />
      </div>
    </div>
  );
}
