import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ConnectionStatus } from "@/components/connection-status";
import { SessionControlBar } from "@/components/session-control-bar";
import { OrderBook } from "@/components/order-book";
import { ExportImport } from "@/components/export-import";
import { LogOut, Check, MessageSquare, TrendingUp } from "lucide-react";
import { wsClient } from "@/lib/wsClient";
import type { Order, Execution } from "@shared/schema";

export default function BrokerDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [latencyMs, setLatencyMs] = useState(0);
  const [simulateReject, setSimulateReject] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);

  const username = localStorage.getItem("fixlab_username") || "Broker";
  const sessionId = localStorage.getItem("fixlab_session_id") || "";
  const sessionName = localStorage.getItem("fixlab_session_name") || "Session";

  useEffect(() => {
    if (!localStorage.getItem("fixlab_username") || !sessionId) {
      setLocation("/");
      return;
    }

    // Connect to WebSocket
    wsClient.connect(sessionId, "Broker", username, sessionName);

    // Set up event handlers
    wsClient.on("session.joined", (data) => {
      setConnected(true);
      setOrders(data.orders || []);
      toast({
        title: "Connected",
        description: "Successfully joined session",
      });
    });

    wsClient.on("order.created", (order: Order) => {
      setOrders((prev) => [...prev, order]);
    });

    wsClient.on("order.updated", (updatedOrder: Order) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
      );
    });

    wsClient.on("execution.created", (execution: Execution) => {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === execution.orderId
            ? {
                ...o,
                cumQty: execution.cumQty,
                leavesQty: execution.leavesQty,
                avgPx: execution.avgPx,
                status: execution.execType as Order["status"],
              }
            : o
        )
      );
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
    localStorage.removeItem("fixlab_session_id");
    localStorage.removeItem("fixlab_session_name");
    setLocation("/");
  };

  const handleLatencyChange = (ms: number) => {
    setLatencyMs(ms);
    wsClient.updateLatency(ms);
  };

  const handleRejectChange = (enabled: boolean) => {
    setSimulateReject(enabled);
    wsClient.updateRejectSimulation(enabled);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-16 border-b bg-card/50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">FixLab</h1>
          <div className="h-6 w-px bg-border" />
          <h2 className="text-base font-semibold text-muted-foreground">Broker Dashboard</h2>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/broker-orders">
            <Button variant="outline" size="sm" data-testid="button-view-orders">
              <Check className="h-4 w-4 mr-2" />
              Orders
            </Button>
          </Link>
          <Link href="/messages">
            <Button variant="outline" size="sm" data-testid="button-view-messages">
              <MessageSquare className="h-4 w-4 mr-2" />
              Messages
            </Button>
          </Link>
          <Link href="/executions">
            <Button variant="outline" size="sm" data-testid="button-view-executions">
              <TrendingUp className="h-4 w-4 mr-2" />
              Executions
            </Button>
          </Link>
          <ConnectionStatus connected={connected} role={username} />
          <ExportImport 
            sessionId={sessionId} 
            sessionName={sessionName}
            onMessagesImported={() => {
              window.location.reload();
            }}
          />
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
        <OrderBook orders={orders} showActions={false} />
      </div>
    </div>
  );
}
