import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { Execution } from "@shared/schema";

interface ExecutionLogProps {
  executions: Execution[];
}

export function ExecutionLog({ executions }: ExecutionLogProps) {
  const getExecTypeColor = (execType: string) => {
    switch (execType) {
      case "New":
        return "bg-fix-new text-white";
      case "PartialFill":
      case "Trade":
        return "bg-fix-partial text-white";
      case "Fill":
        return "bg-fix-filled text-white";
      case "Canceled":
        return "bg-fix-canceled text-white";
      case "Rejected":
        return "bg-fix-rejected text-white";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  if (executions.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Execution Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No executions yet</p>
            <p className="text-xs mt-1">Executions will appear here as orders are processed</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">Execution Log</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-2">
            {executions.map((exec) => (
              <Card
                key={exec.id}
                className="p-3 hover-elevate"
                data-testid={`card-execution-${exec.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card-foreground/5">
                      {exec.side === "Buy" ? (
                        <TrendingUp className="h-4 w-4 text-fix-buy" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-fix-sell" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold">{exec.symbol}</span>
                        <Badge className={`text-xs ${getExecTypeColor(exec.execType)}`}>
                          {exec.execType}
                        </Badge>
                      </div>
                      <div className="font-mono text-xs text-muted-foreground space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span>Exec: {exec.execId}</span>
                          <span>•</span>
                          <span className={exec.side === "Buy" ? "text-fix-buy font-semibold" : "text-fix-sell font-semibold"}>
                            {exec.side}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>Qty: {exec.lastQty} @ {exec.lastPx.toFixed(2)}</span>
                          {exec.cumQty > 0 && (
                            <>
                              <span>•</span>
                              <span>Avg: {exec.avgPx.toFixed(2)}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span>Filled: {exec.cumQty}</span>
                          <span>•</span>
                          <span>Leaves: {exec.leavesQty}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs text-muted-foreground">
                      {formatTime(exec.timestamp)}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
