import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { FIXMessage } from "@shared/schema";

interface MessageTimelineProps {
  messages: FIXMessage[];
}

export function MessageTimeline({ messages }: MessageTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  const getMessageTypeName = (type: string) => {
    const types: Record<string, string> = {
      "D": "New Order Single",
      "8": "Execution Report",
      "F": "Order Cancel Request",
      "G": "Order Cancel/Replace",
      "J": "Allocation Instruction",
      "AS": "Allocation Report",
      "AK": "Confirmation",
      "P": "Allocation Ack",
    };
    return types[type] || type;
  };

  if (messages.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Message Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">FIX messages will appear here in real-time</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">Message Timeline</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-3">
            {messages.map((msg) => {
              const isIncoming = msg.direction === "Incoming";
              const isExpanded = expandedId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isIncoming ? "flex-row" : "flex-row-reverse"}`}
                  data-testid={`message-${msg.id}`}
                >
                  <div className={`flex-1 max-w-[85%] ${isIncoming ? "" : "flex flex-col items-end"}`}>
                    <Card
                      className="hover-elevate cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : msg.id)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {isIncoming ? (
                              <ArrowDownRight className="h-4 w-4 text-fix-buy" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4 text-fix-sell" />
                            )}
                            <Badge variant="outline" className="font-mono text-xs">
                              35={msg.messageType}
                            </Badge>
                            <span className="text-xs font-medium">{getMessageTypeName(msg.messageType)}</span>
                          </div>
                          <span className="font-mono text-xs text-muted-foreground">
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>
                      </CardHeader>
                      {isExpanded && (
                        <CardContent className="pt-2">
                          <Tabs defaultValue="parsed" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="parsed" className="text-xs">Parsed</TabsTrigger>
                              <TabsTrigger value="raw" className="text-xs">Raw FIX</TabsTrigger>
                            </TabsList>
                            <TabsContent value="parsed" className="mt-3">
                              <div className="rounded-lg bg-muted/50 p-3">
                                <pre className="text-xs font-mono overflow-x-auto">
                                  {JSON.stringify(msg.parsed, null, 2)}
                                </pre>
                              </div>
                            </TabsContent>
                            <TabsContent value="raw" className="mt-3">
                              <div className="rounded-lg bg-muted/50 p-3">
                                <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
                                  {msg.rawFix}
                                </pre>
                              </div>
                            </TabsContent>
                          </Tabs>
                        </CardContent>
                      )}
                    </Card>
                    <div className="flex items-center gap-1.5 mt-1 px-1">
                      <Badge variant="outline" className="text-xs font-mono">
                        {msg.fromRole}
                      </Badge>
                      {msg.toRole && (
                        <>
                          <span className="text-xs text-muted-foreground">→</span>
                          <Badge variant="outline" className="text-xs font-mono">
                            {msg.toRole}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
