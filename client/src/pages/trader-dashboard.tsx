import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ConnectionStatus } from "@/components/connection-status";
import { SessionControlBar } from "@/components/session-control-bar";
import { OrderEntryForm } from "@/components/order-entry-form";
import { OrderBook } from "@/components/order-book";
import { ExecutionLog } from "@/components/execution-log";
import { MessageTimeline } from "@/components/message-timeline";
import { AllocationWizard } from "@/components/allocation-wizard";
import { ReplaceOrderDialog } from "@/components/replace-order-dialog";
import { LogOut, PieChart } from "lucide-react";
import { wsClient } from "@/lib/wsClient";
import type { Order, Execution, FIXMessage, AllocationType, AllocationAccount } from "@shared/schema";

export default function TraderDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [latencyMs, setLatencyMs] = useState(0);
  const [simulateReject, setSimulateReject] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [messages, setMessages] = useState<FIXMessage[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [allocationWizardOpen, setAllocationWizardOpen] = useState(false);
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [orderToReplace, setOrderToReplace] = useState<Order | null>(null);

  const username = localStorage.getItem("fixlab_username") || "Trader";
  const sessionId = localStorage.getItem("fixlab_session_id") || "";
  const sessionName = localStorage.getItem("fixlab_session_name") || "Session";

  useEffect(() => {
    if (!localStorage.getItem("fixlab_username") || !sessionId) {
      setLocation("/");
      return;
    }

    // Connect to WebSocket
    wsClient.connect(sessionId, "Trader", username);

    // Set up event handlers
    wsClient.on("session.joined", (data) => {
      setConnected(true);
      setOrders(data.orders || []);
      setExecutions(data.executions || []);
      setMessages(data.messages || []);
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

    wsClient.on("order.cancel.pending", (updatedOrder: Order) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
      );
      toast({
        title: "Cancel Request Sent",
        description: "Waiting for broker confirmation",
      });
    });

    wsClient.on("order.replace.pending", (data: any) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === data.order.id ? data.order : o))
      );
      toast({
        title: "Replace Request Sent",
        description: `New Qty: ${data.newQuantity}${data.newPrice ? `, Price: $${data.newPrice}` : ""}`,
      });
    });

    wsClient.on("execution.created", (execution: Execution) => {
      setExecutions((prev) => [execution, ...prev]);
      toast({
        title: "Execution Received",
        description: `${execution.execType}: ${execution.lastQty} @ ${execution.lastPx.toFixed(2)}`,
      });
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

  const handleOrderSubmit = (orderData: any) => {
    wsClient.sendNewOrder(orderData);
    toast({
      title: "Order Submitted",
      description: `${orderData.side} ${orderData.quantity} ${orderData.symbol}`,
    });
  };

  const handleCancelOrder = (orderId: string) => {
    wsClient.send({
      type: "order.cancel",
      data: { orderId },
    });
  };

  const handleReplaceOrder = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      setOrderToReplace(order);
      setReplaceDialogOpen(true);
    }
  };

  const handleReplaceSubmit = (orderId: string, quantity: number, price?: number) => {
    wsClient.send({
      type: "order.replace",
      data: { orderId, quantity, price },
    });
  };

  const handleOpenAllocation = (order: Order) => {
    if (order.status !== "Filled") {
      toast({
        title: "Cannot Allocate",
        description: "Order must be filled before allocation",
        variant: "destructive",
      });
      return;
    }
    setSelectedOrder(order);
    setAllocationWizardOpen(true);
  };

  const handleAllocationSubmit = (allocType: AllocationType, accounts: AllocationAccount[]) => {
    if (!selectedOrder) return;
    
    wsClient.sendAllocationInstruction({
      orderId: selectedOrder.id,
      allocType,
      accounts,
    });
    
    toast({
      title: "Allocation Instruction Sent",
      description: `${allocType} allocation for ${accounts.length} accounts`,
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

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-16 border-b bg-card/50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">FixLab</h1>
          <div className="h-6 w-px bg-border" />
          <h2 className="text-base font-semibold text-muted-foreground">Trader Dashboard</h2>
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
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-12 gap-4 p-4">
          {/* Left Sidebar - Order Entry */}
          <div className="col-span-3">
            <OrderEntryForm onSubmit={handleOrderSubmit} disabled={!connected} />
          </div>

          {/* Center - Orders and Executions */}
          <div className="col-span-6 flex flex-col gap-4 overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <div className="h-full flex flex-col">
                <OrderBook
                  orders={orders}
                  onCancel={handleCancelOrder}
                  onReplace={handleReplaceOrder}
                  showActions={true}
                />
                {orders.some(o => o.status === "Filled") && (
                  <div className="mt-2">
                    <Button
                      data-testid="button-open-allocation"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const filledOrder = orders.find(o => o.status === "Filled");
                        if (filledOrder) handleOpenAllocation(filledOrder);
                      }}
                      className="w-full"
                    >
                      <PieChart className="h-4 w-4 mr-2" />
                      Create Allocation
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <ExecutionLog executions={executions} />
            </div>
          </div>

          {/* Right Sidebar - Messages */}
          <div className="col-span-3 overflow-hidden">
            <MessageTimeline messages={messages} />
          </div>
        </div>
      </div>

      {/* Allocation Wizard */}
      <AllocationWizard
        open={allocationWizardOpen}
        onClose={() => setAllocationWizardOpen(false)}
        order={selectedOrder}
        onSubmit={handleAllocationSubmit}
      />

      {/* Replace Order Dialog */}
      <ReplaceOrderDialog
        open={replaceDialogOpen}
        onOpenChange={setReplaceDialogOpen}
        order={orderToReplace}
        onSubmit={handleReplaceSubmit}
      />
    </div>
  );
}
