import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ConnectionStatus } from "@/components/connection-status";
import { SessionControlBar } from "@/components/session-control-bar";
import { MessageTimeline } from "@/components/message-timeline";
import { LogOut, Check, X } from "lucide-react";
import { wsClient } from "@/lib/wsClient";
import type { Allocation, FIXMessage } from "@shared/schema";

export default function CustodianDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [latencyMs, setLatencyMs] = useState(0);
  const [simulateReject, setSimulateReject] = useState(false);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [messages, setMessages] = useState<FIXMessage[]>([]);

  const username = localStorage.getItem("fixlab_username") || "Custodian";
  const sessionId = localStorage.getItem("fixlab_session_id") || "";
  const sessionName = localStorage.getItem("fixlab_session_name") || "Session";

  useEffect(() => {
    if (!localStorage.getItem("fixlab_username") || !sessionId) {
      setLocation("/");
      return;
    }

    // Connect to WebSocket
    wsClient.connect(sessionId, "Custodian", username, sessionName);

    // Set up event handlers
    wsClient.on("session.joined", (data) => {
      setConnected(true);
      setAllocations(data.allocations || []);
      setMessages(data.messages || []);
      toast({
        title: "Connected",
        description: "Successfully joined session",
      });
    });

    wsClient.on("allocation.created", (allocation: Allocation) => {
      setAllocations((prev) => [...prev, allocation]);
    });

    wsClient.on("allocation.updated", (updatedAlloc: Allocation) => {
      setAllocations((prev) =>
        prev.map((a) => (a.id === updatedAlloc.id ? updatedAlloc : a))
      );
      if (updatedAlloc.status === "Accepted") {
        toast({
          title: "Allocation Accepted by Broker",
          description: `${updatedAlloc.symbol} - ${updatedAlloc.allocId}`,
        });
      }
    });

    wsClient.on("message.new", (msgData) => {
      const message: FIXMessage = {
        id: `msg-${Date.now()}-${Math.random()}`,
        sessionId: sessionName,
        direction: msgData.direction,
        messageType: msgData.messageType,
        rawFix: msgData.rawFix,
        parsed: msgData.parsed,
        timestamp: Date.now(),
        fromRole: msgData.fromRole,
        toRole: msgData.toRole,
      };
      setMessages((prev) => [message, ...prev]);
    });

    wsClient.on("error", (error) => {
      toast({
        title: "Error",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    });

    return () => {
      wsClient.disconnect();
    };
  }, [sessionName, username, setLocation, toast]);

  const handleLogout = () => {
    wsClient.disconnect();
    localStorage.removeItem("fixlab_username");
    localStorage.removeItem("fixlab_role");
    localStorage.removeItem("fixlab_session");
    setLocation("/");
  };

  const handleConfirmAllocation = (allocId: string) => {
    wsClient.sendAllocationConfirm({ allocId });
    toast({
      title: "Allocation Confirmed",
      description: `Allocation ${allocId} has been affirmed`,
    });
  };

  const handleRejectAllocation = (allocId: string) => {
    toast({
      title: "Rejection Not Implemented",
      description: "Custodian rejection coming soon",
    });
  };

  const handleLatencyChange = (ms: number) => {
    setLatencyMs(ms);
    wsClient.updateLatency(ms);
  };

  const handleRejectChange = (enabled: boolean) => {
    setSimulateReject(enabled);
    wsClient.updateRejectSimulation(enabled);
  };

  const acceptedAllocations = allocations.filter(a => a.status === "Accepted");

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-16 border-b bg-card/50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">FixLab</h1>
          <div className="h-6 w-px bg-border" />
          <h2 className="text-base font-semibold text-muted-foreground">Custodian Dashboard</h2>
        </div>
        <div className="flex items-center gap-4">
          <ConnectionStatus connected={connected} role={username} />
          <Button
            data-testid="button-logout"
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="h-9"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Session Control Bar */}
      <SessionControlBar
        sessionName={sessionName}
        latencyMs={latencyMs}
        onLatencyChange={handleLatencyChange}
        simulateReject={simulateReject}
        onSimulateRejectChange={handleRejectChange}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-4">
        <div className="h-full grid grid-cols-12 gap-4">
          {/* Left - Allocation Confirmations */}
          <div className="col-span-9 overflow-hidden">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Allocation Confirmations</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                {acceptedAllocations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-sm">No allocations pending confirmation</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {acceptedAllocations.map((alloc) => (
                      <Card key={alloc.id} className="p-4" data-testid={`card-allocation-${alloc.id}`}>
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-base font-bold">{alloc.symbol}</span>
                                <Badge variant="outline" className="text-xs">
                                  {alloc.allocType}
                                </Badge>
                                <Badge
                                  variant={alloc.status === "Confirmed" ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {alloc.status}
                                </Badge>
                              </div>
                              <div className="font-mono text-xs text-muted-foreground">
                                Allocation ID: {alloc.allocId}
                              </div>
                            </div>
                            <div className="text-right space-y-1">
                              <div className="font-mono text-sm font-semibold">
                                {alloc.totalQty} @ ${alloc.avgPx.toFixed(2)}
                              </div>
                              <div className="font-mono text-xs text-muted-foreground">
                                Trade Date: {alloc.tradeDate}
                              </div>
                            </div>
                          </div>

                          <div className="rounded-lg border overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/50">
                                  <TableHead className="font-semibold text-xs">Account</TableHead>
                                  <TableHead className="font-semibold text-xs text-right">Quantity</TableHead>
                                  <TableHead className="font-semibold text-xs text-right">Net Money</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {alloc.accounts.map((acc, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell className="font-mono text-sm">{acc.account}</TableCell>
                                    <TableCell className="font-mono text-sm text-right">{acc.qty}</TableCell>
                                    <TableCell className="font-mono text-sm text-right">
                                      ${acc.netMoney?.toFixed(2)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>

                          {alloc.status === "Accepted" && (
                            <div className="flex gap-2 pt-2 border-t">
                              <Button
                                data-testid={`button-confirm-${alloc.id}`}
                                className="flex-1 h-9"
                                onClick={() => handleConfirmAllocation(alloc.id)}
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Confirm
                              </Button>
                              <Button
                                data-testid={`button-decline-${alloc.id}`}
                                variant="destructive"
                                className="flex-1 h-9"
                                onClick={() => handleRejectAllocation(alloc.id)}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Decline
                              </Button>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right - Messages */}
          <div className="col-span-3 overflow-hidden">
            <MessageTimeline messages={messages} />
          </div>
        </div>
      </div>
    </div>
  );
}
