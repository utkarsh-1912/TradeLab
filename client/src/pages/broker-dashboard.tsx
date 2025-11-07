import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ConnectionStatus } from "@/components/connection-status";
import { SessionControlBar } from "@/components/session-control-bar";
import { OrderBook } from "@/components/order-book";
import { MessageTimeline } from "@/components/message-timeline";
import { LogOut, Check, X } from "lucide-react";
import { wsClient } from "@/lib/wsClient";
import type { Order, Execution, FIXMessage, Allocation } from "@shared/schema";

export default function BrokerDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [latencyMs, setLatencyMs] = useState(0);
  const [simulateReject, setSimulateReject] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [messages, setMessages] = useState<FIXMessage[]>([]);
  const [fillPrices, setFillPrices] = useState<Record<string, string>>({});
  const [pendingReplaceDetails, setPendingReplaceDetails] = useState<Record<string, { quantity: number; price?: number }>>({});

  const username = localStorage.getItem("fixlab_username") || "Broker";
  const sessionId = localStorage.getItem("fixlab_session_id") || "";
  const sessionName = localStorage.getItem("fixlab_session_name") || "Session";

  useEffect(() => {
    if (!localStorage.getItem("fixlab_username") || !sessionId) {
      setLocation("/");
      return;
    }

    // Connect to WebSocket
    wsClient.connect(sessionId, "Broker", username);

    // Set up event handlers
    wsClient.on("session.joined", (data) => {
      setConnected(true);
      setOrders(data.orders || []);
      setAllocations(data.allocations || []);
      setMessages(data.messages || []);
      toast({
        title: "Connected",
        description: "Successfully joined session",
      });
    });

    wsClient.on("order.created", (order: Order) => {
      setOrders((prev) => [...prev, order]);
      toast({
        title: "New Order Received",
        description: `${order.side} ${order.quantity} ${order.symbol}`,
      });
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
        title: "Cancel Request Received",
        description: `Order ${updatedOrder.symbol} pending cancellation`,
      });
    });

    wsClient.on("order.replace.pending", (data: any) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === data.order.id ? data.order : o))
      );
      // Store the pending replace details
      setPendingReplaceDetails((prev) => ({
        ...prev,
        [data.order.id]: {
          quantity: data.newQuantity,
          price: data.newPrice,
        },
      }));
      toast({
        title: "Replace Request Received",
        description: `Order ${data.order.symbol} - New Qty: ${data.newQuantity}${data.newPrice ? `, Price: $${data.newPrice}` : ""}`,
      });
    });

    wsClient.on("allocation.created", (allocation: Allocation) => {
      setAllocations((prev) => [...prev, allocation]);
      toast({
        title: "Allocation Received",
        description: `${allocation.allocType} for ${allocation.symbol}`,
      });
    });

    wsClient.on("allocation.updated", (updatedAlloc: Allocation) => {
      setAllocations((prev) =>
        prev.map((a) => (a.id === updatedAlloc.id ? updatedAlloc : a))
      );
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

  const handleFillOrder = (orderId: string) => {
    const price = fillPrices[orderId];
    const order = orders.find(o => o.id === orderId);
    if (!price || !order) return;

    wsClient.sendFillOrder({
      orderId,
      fillQty: order.quantity,
      fillPx: parseFloat(price),
    });

    toast({
      title: "Execution Sent",
      description: `Filled ${order.quantity} @ ${price}`,
    });

    // Clear the price input
    const newPrices = { ...fillPrices };
    delete newPrices[orderId];
    setFillPrices(newPrices);
  };

  const handleRejectOrder = (orderId: string) => {
    wsClient.sendRejectOrder({ orderId });
    toast({
      title: "Order Rejected",
      description: `Order ${orderId} rejected`,
      variant: "destructive",
    });
  };

  const handleAcceptAllocation = (allocId: string) => {
    wsClient.sendAllocationResponse({ allocId, accept: true });
    toast({
      title: "Allocation Accepted",
      description: `Allocation ${allocId}`,
    });
  };

  const handleRejectAllocation = (allocId: string) => {
    wsClient.sendAllocationResponse({ allocId, accept: false });
    toast({
      title: "Allocation Rejected",
      description: `Allocation ${allocId}`,
      variant: "destructive",
    });
  };

  const handleCancelAccept = (orderId: string) => {
    wsClient.send({
      type: "order.cancel.accept",
      data: { orderId },
    });
    toast({
      title: "Cancel Accepted",
      description: "Order has been canceled",
    });
  };

  const handleReplaceAccept = (orderId: string) => {
    const replaceDetails = pendingReplaceDetails[orderId];
    if (!replaceDetails) return;

    wsClient.send({
      type: "order.replace.accept",
      data: { 
        orderId, 
        quantity: replaceDetails.quantity, 
        price: replaceDetails.price 
      },
    });
    
    // Clear the pending replace details
    setPendingReplaceDetails((prev) => {
      const updated = { ...prev };
      delete updated[orderId];
      return updated;
    });
    
    toast({
      title: "Replace Accepted",
      description: `Modified to ${replaceDetails.quantity}${replaceDetails.price ? ` @ $${replaceDetails.price}` : ""}`,
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

  const newOrders = orders.filter(o => o.status === "New");
  const pendingCancelOrders = orders.filter(o => o.status === "PendingCancel");
  const pendingReplaceOrders = orders.filter(o => o.status === "PendingReplace");

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-16 border-b bg-card/50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">FixLab</h1>
          <div className="h-6 w-px bg-border" />
          <h2 className="text-base font-semibold text-muted-foreground">Broker Dashboard</h2>
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
          {/* Left - Incoming Orders & Allocations */}
          <div className="col-span-5 flex flex-col gap-4 overflow-hidden">
            <Card className="flex-1 overflow-hidden flex flex-col">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Incoming Orders</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto space-y-3">
                {newOrders.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-sm">No incoming orders</p>
                  </div>
                ) : (
                  newOrders.map((order) => (
                    <Card key={order.id} className="p-4" data-testid={`card-order-${order.id}`}>
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-base font-bold">{order.symbol}</span>
                              <Badge variant={order.side === "Buy" ? "default" : "destructive"} className="text-xs">
                                {order.side}
                              </Badge>
                            </div>
                            <div className="font-mono text-xs text-muted-foreground">
                              Order ID: {order.clOrdId}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-sm font-semibold">{order.quantity}</div>
                            <div className="text-xs text-muted-foreground">{order.orderType}</div>
                          </div>
                        </div>
                        
                        <div className="space-y-2 pt-2 border-t">
                          <div className="grid grid-cols-12 gap-2 items-end">
                            <div className="col-span-8">
                              <Label className="text-xs font-medium mb-1 block">Fill Price</Label>
                              <Input
                                data-testid={`input-fill-price-${order.id}`}
                                type="number"
                                step="0.01"
                                placeholder={order.price ? order.price.toString() : "Price"}
                                value={fillPrices[order.id] || ""}
                                onChange={(e) => setFillPrices({ ...fillPrices, [order.id]: e.target.value })}
                                className="h-8 font-mono text-sm"
                              />
                            </div>
                            <div className="col-span-4 flex gap-1">
                              <Button
                                data-testid={`button-fill-${order.id}`}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleFillOrder(order.id)}
                                disabled={!fillPrices[order.id]}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                data-testid={`button-reject-${order.id}`}
                                size="icon"
                                variant="destructive"
                                className="h-8 w-8"
                                onClick={() => handleRejectOrder(order.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Pending Cancel/Replace Requests */}
            {(pendingCancelOrders.length > 0 || pendingReplaceOrders.length > 0) && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold">Pending Requests</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingCancelOrders.map((order) => (
                    <Card key={order.id} className="p-3 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold">{order.symbol}</span>
                            <Badge variant="outline" className="text-xs">Cancel Request</Badge>
                          </div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {order.clOrdId}
                          </div>
                        </div>
                        <Button
                          data-testid={`button-accept-cancel-${order.id}`}
                          size="sm"
                          className="h-8"
                          onClick={() => handleCancelAccept(order.id)}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Accept Cancel
                        </Button>
                      </div>
                    </Card>
                  ))}
                  {pendingReplaceOrders.map((order) => {
                    const replaceDetails = pendingReplaceDetails[order.id];
                    return (
                      <Card key={order.id} className="p-3 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-semibold">{order.symbol}</span>
                                <Badge variant="outline" className="text-xs">Replace Request</Badge>
                              </div>
                              {replaceDetails && (
                                <div className="font-mono text-xs">
                                  <div className="text-muted-foreground">
                                    Old: {order.quantity} @ {order.price ? `$${order.price.toFixed(2)}` : "MKT"}
                                  </div>
                                  <div className="text-blue-700 dark:text-blue-300 font-semibold">
                                    New: {replaceDetails.quantity} @ {replaceDetails.price ? `$${replaceDetails.price.toFixed(2)}` : "MKT"}
                                  </div>
                                </div>
                              )}
                            </div>
                            <Button
                              data-testid={`button-accept-replace-${order.id}`}
                              size="sm"
                              className="h-8"
                              onClick={() => handleReplaceAccept(order.id)}
                              disabled={!replaceDetails}
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />
                              Accept Replace
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            <Card className="flex-1 overflow-hidden flex flex-col">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Allocation Management</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto space-y-3">
                {allocations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-sm">No allocations</p>
                  </div>
                ) : (
                  allocations.map((alloc) => (
                    <Card key={alloc.id} className="p-4" data-testid={`card-allocation-${alloc.id}`}>
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="font-mono text-sm font-semibold">{alloc.symbol}</div>
                            <div className="font-mono text-xs text-muted-foreground">
                              Alloc ID: {alloc.allocId}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {alloc.allocType}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {alloc.accounts.length} accounts • {alloc.totalQty} qty @ ${alloc.avgPx.toFixed(2)}
                        </div>
                        {alloc.status === "Pending" && (
                          <div className="flex gap-2 pt-2 border-t">
                            <Button
                              data-testid={`button-accept-allocation-${alloc.id}`}
                              size="sm"
                              className="flex-1 h-8"
                              onClick={() => handleAcceptAllocation(alloc.id)}
                            >
                              Accept
                            </Button>
                            <Button
                              data-testid={`button-reject-allocation-${alloc.id}`}
                              size="sm"
                              variant="destructive"
                              className="flex-1 h-8"
                              onClick={() => handleRejectAllocation(alloc.id)}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Center - Execution Blotter */}
          <div className="col-span-4 overflow-hidden">
            <OrderBook orders={orders} showActions={false} />
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
