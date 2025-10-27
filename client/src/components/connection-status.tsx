import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff } from "lucide-react";

interface ConnectionStatusProps {
  connected: boolean;
  role?: string;
}

export function ConnectionStatus({ connected, role }: ConnectionStatusProps) {
  return (
    <div className="flex items-center gap-2">
      {role && (
        <Badge variant="outline" className="font-mono text-xs uppercase">
          {role}
        </Badge>
      )}
      <Badge
        variant={connected ? "default" : "destructive"}
        className="gap-1.5"
        data-testid="badge-connection-status"
      >
        {connected ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-foreground"></span>
            </span>
            <Wifi className="h-3 w-3" />
            <span className="text-xs font-medium">Connected</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            <span className="text-xs font-medium">Disconnected</span>
          </>
        )}
      </Badge>
    </div>
  );
}
