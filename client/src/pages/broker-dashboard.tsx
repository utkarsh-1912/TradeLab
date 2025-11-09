import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ConnectionStatus } from "@/components/connection-status";
import { SessionControlBar } from "@/components/session-control-bar";
import { OrderBook } from "@/components/order-book";
import { OrderFillModal } from "@/components/order-fill-modal";
import { OrderDetailsModal } from "@/components/order-details-modal";
import { ExportImport } from "@/components/export-import";
import { LogOut, Check, MessageSquare, TrendingUp } from "lucide-react";
import { wsClient } from "@/lib/wsClient";
import type { Order, Execution, FIXMessage } from "@shared/schema";

export default function BrokerDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [latencyMs, setLatencyMs] = useState(0);
  const [simulateReject, setSimulateReject] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [messages, setMessages] = useState<FIXMessage[]>([]);
  const [fillModalOpen, setFillModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

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
    const handleSessionJoined = (data: any) => {
      setConnected(true);
      setOrders(data.orders || []);
      setExecutions(data.executions || []);
      setMessages(data.messages || []);
      toast({
        title: "Connected",
        description: "Successfully joined session",
      });
    };

    const handleOrderCreated = (order: Order) => {
      setOrders((prev) => [...prev, order]);
    };

    const handleOrderUpdated = (updatedOrder: Order) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
      );
    };

    const handleOrderCancelPending = (updatedOrder: Order) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
      );
    };

    const handleOrderReplacePending = (data: any) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === data.order.id ? data.order : o))
      );
    };

    const handleExecutionCreated = (execution: Execution) => {
      setExecutions((prev) => [...prev, execution]);
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
    };

    const handleMessageNew = (msgData: any) => {
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
    };

    const handleError = (error: any) => {
      toast({
        title: "Error",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    };

    wsClient.on("session.joined", handleSessionJoined);
    wsClient.on("order.created", handleOrderCreated);
    wsClient.on("order.updated", handleOrderUpdated);
    wsClient.on("order.cancel.pending", handleOrderCancelPending);
    wsClient.on("order.replace.pending", handleOrderReplacePending);
    wsClient.on("execution.created", handleExecutionCreated);
    wsClient.on("message.new", handleMessageNew);
    wsClient.on("error", handleError);

    return () => {
      wsClient.off("session.joined", handleSessionJoined);
      wsClient.off("order.created", handleOrderCreated);
      wsClient.off("order.updated", handleOrderUpdated);
      wsClient.off("order.cancel.pending", handleOrderCancelPending);
      wsClient.off("order.replace.pending", handleOrderReplacePending);
      wsClient.off("execution.created", handleExecutionCreated);
      wsClient.off("message.new", handleMessageNew);
      wsClient.off("error", handleError);
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

  const handleOpenFillModal = (order: Order) => {
    setSelectedOrder(order);
    setFillModalOpen(true);
  };

  const handleOpenDetailsModal = (order: Order) => {
    setSelectedOrder(order);
    setDetailsModalOpen(true);
  };

  const handleFillOrder = (orderId: string, quantity: number, price: number) => {
    wsClient.sendFillOrder({ orderId, fillQty: quantity, fillPx: price });
    setFillModalOpen(false);
    
    toast({
      title: "Order Filled",
      description: `Filled ${quantity} @ $${price.toFixed(2)}`,
    });
  };

  const handleRejectOrder = (orderId: string) => {
    wsClient.sendRejectOrder({ orderId });
    setFillModalOpen(false);

    toast({
      title: "Order Rejected",
      description: "Order has been rejected",
    });
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-16 border-b bg-card/50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src="/favicon.png" alt="FixLab Logo" className="h-8 w-8" />
          <div className="h-6 w-px bg-border" />
          <h2 className="text-base font-semibold text-muted-foreground">Broker Dashboard</h2>
        </div>
        <div className="flex items-center gap-3">
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
        navigationButtons={
          <>
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
          </>
        }
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-4">
        <OrderBook 
          orders={orders} 
          showActions={true}
          onOrderClick={handleOpenDetailsModal}
          onFillOrder={handleOpenFillModal}
        />
      </div>

      {/* Modals */}
      <OrderFillModal
        open={fillModalOpen}
        onClose={() => setFillModalOpen(false)}
        order={selectedOrder}
        onFill={handleFillOrder}
        onReject={handleRejectOrder}
      />

      <OrderDetailsModal
        open={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        order={selectedOrder}
        executions={executions}
        messages={messages}
      />
    </div>
  );
}
