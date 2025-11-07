import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, LogOut, Check, X } from "lucide-react";
import { wsClient } from "@/lib/wsClient";
import type { Order, Allocation } from "@shared/schema";

export default function BrokerOrdersPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [fillPrices, setFillPrices] = useState<Record<string, string>>({});
  const [fillQuantities, setFillQuantities] = useState<Record<string, string>>({});
  const [pendingReplaceDetails, setPendingReplaceDetails] = useState<Record<string, { quantity: number; price?: number }>>({});

  const username = localStorage.getItem("fixlab_username") || "Broker";
  const sessionId = localStorage.getItem("fixlab_session_id") || "";
  const sessionName = localStorage.getItem("fixlab_session_name") || "Session";
  const role = (localStorage.getItem("fixlab_role") || "Broker") as "Trader" | "Broker" | "Custodian";

  useEffect(() => {
    if (!localStorage.getItem("fixlab_username") || !sessionId) {
      setLocation("/");
      return;
    }

    wsClient.connect(sessionId, role, username, sessionName);

    wsClient.on("session.joined", (data) => {
      setConnected(true);
      setOrders(data.orders || []);
      setAllocations(data.allocations || []);
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

    wsClient.on("order.replace.request", (data) => {
      setPendingReplaceDetails((prev) => ({
        ...prev,
        [data.orderId]: { quantity: data.quantity, price: data.price },
      }));
    });

    wsClient.on("allocation.created", (allocation: Allocation) => {
      setAllocations((prev) => [...prev, allocation]);
    });

    wsClient.on("allocation.updated", (updatedAllocation: Allocation) => {
      setAllocations((prev) =>
        prev.map((a) => (a.id === updatedAllocation.id ? updatedAllocation : a))
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
  }, [sessionName, username, setLocation, toast, role]);

  const handleLogout = () => {
    wsClient.disconnect();
    localStorage.removeItem("fixlab_username");
    localStorage.removeItem("fixlab_role");
    localStorage.removeItem("fixlab_session_id");
    localStorage.removeItem("fixlab_session_name");
    setLocation("/");
  };

  const handleBackToDashboard = () => {
    setLocation("/broker");
  };

  const handleFillOrder = (orderId: string, partialQty?: number) => {
    const price = fillPrices[orderId];
    const order = orders.find(o => o.id === orderId);
    
    if (!order) return;
    
    const fillQty = partialQty || parseInt(fillQuantities[orderId] || String(order.leavesQty || order.quantity));
    
    if (!price || isNaN(parseFloat(price)) || isNaN(fillQty) || fillQty <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter valid price and quantity",
        variant: "destructive",
      });
      return;
    }

    if (fillQty > (order.leavesQty || order.quantity)) {
      toast({
        title: "Invalid Quantity",
        description: `Cannot fill more than ${order.leavesQty || order.quantity} shares`,
        variant: "destructive",
      });
      return;
    }

    wsClient.send({
      type: "order.fill",
      data: { orderId, quantity: fillQty, price: parseFloat(price) },
    });
    
    setFillPrices({ ...fillPrices, [orderId]: "" });
    setFillQuantities({ ...fillQuantities, [orderId]: "" });
    
    toast({
      title: "Order Filled",
      description: `Filled ${fillQty} @ $${price}`,
    });
  };

  const handleRejectOrder = (orderId: string) => {
    wsClient.send({
      type: "order.reject",
      data: { orderId },
    });
    toast({
      title: "Order Rejected",
      description: `Order ${orderId}`,
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

  const newOrders = orders.filter(o => o.status === "New");
  const pendingCancelOrders = orders.filter(o => o.status === "PendingCancel");
  const pendingReplaceOrders = orders.filter(o => o.status === "PendingReplace");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Broker Orders & Allocations</h1>
              <p className="text-sm text-muted-foreground">
                Session: {sessionName} • {username} ({role})
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToDashboard}
                data-testid="button-back-dashboard"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <Badge variant={connected ? "default" : "secondary"} data-testid="status-connection">
                {connected ? "Connected" : "Disconnected"}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Incoming Orders */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Incoming Orders ({newOrders.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-3 pr-4">
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
                                  <span className="font-mono text-lg font-bold">{order.symbol}</span>
                                  <Badge variant={order.side === "Buy" ? "default" : "destructive"} className="text-xs">
                                    {order.side}
                                  </Badge>
                                </div>
                                <div className="font-mono text-xs text-muted-foreground">
                                  {order.clOrdId}
                                </div>
                              </div>
                              <div className="text-right space-y-1">
                                <div className="font-mono text-base font-bold">{order.leavesQty || order.quantity}</div>
                                <div className="text-xs text-muted-foreground">{order.orderType}</div>
                                {order.cumQty > 0 && (
                                  <div className="text-xs text-muted-foreground">
                                    Filled: {order.cumQty} @ {order.avgPx?.toFixed(2)}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="space-y-2 pt-2 border-t">
                              <div className="grid grid-cols-12 gap-2">
                                <div className="col-span-6">
                                  <Label className="text-xs font-medium mb-1.5 block">Quantity</Label>
                                  <Input
                                    data-testid={`input-fill-quantity-${order.id}`}
                                    type="number"
                                    placeholder={(order.leavesQty || order.quantity).toString()}
                                    value={fillQuantities[order.id] || ""}
                                    onChange={(e) => setFillQuantities({ ...fillQuantities, [order.id]: e.target.value })}
                                    className="h-9 font-mono text-sm"
                                  />
                                </div>
                                <div className="col-span-6">
                                  <Label className="text-xs font-medium mb-1.5 block">Price</Label>
                                  <Input
                                    data-testid={`input-fill-price-${order.id}`}
                                    type="number"
                                    step="0.01"
                                    placeholder={order.price ? order.price.toString() : "Price"}
                                    value={fillPrices[order.id] || ""}
                                    onChange={(e) => setFillPrices({ ...fillPrices, [order.id]: e.target.value })}
                                    className="h-9 font-mono text-sm"
                                  />
                                </div>
                              </div>
                              
                              <div className="flex gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs flex-1"
                                  onClick={() => handleFillOrder(order.id, Math.round((order.leavesQty || order.quantity) * 0.25))}
                                  disabled={!fillPrices[order.id]}
                                >
                                  25%
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs flex-1"
                                  onClick={() => handleFillOrder(order.id, Math.round((order.leavesQty || order.quantity) * 0.5))}
                                  disabled={!fillPrices[order.id]}
                                >
                                  50%
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs flex-1"
                                  onClick={() => handleFillOrder(order.id, Math.round((order.leavesQty || order.quantity) * 0.75))}
                                  disabled={!fillPrices[order.id]}
                                >
                                  75%
                                </Button>
                                <Button
                                  data-testid={`button-fill-${order.id}`}
                                  size="sm"
                                  className="h-7 text-xs flex-1"
                                  onClick={() => handleFillOrder(order.id)}
                                  disabled={!fillPrices[order.id]}
                                >
                                  <Check className="h-3.5 w-3.5 mr-1" />
                                  Fill
                                </Button>
                                <Button
                                  data-testid={`button-reject-${order.id}`}
                                  size="sm"
                                  variant="destructive"
                                  className="h-7"
                                  onClick={() => handleRejectOrder(order.id)}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Pending Cancel/Replace Requests */}
            {(pendingCancelOrders.length > 0 || pendingReplaceOrders.length > 0) && (
              <Card>
                <CardHeader>
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
          </div>

          {/* Right Column - Allocations */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Allocation Management ({allocations.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-3 pr-4">
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
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
