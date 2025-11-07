import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Clock, Edit2, Check, X, TrendingUp, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Order, Execution, FIXMessage } from "@shared/schema";

interface OrderDetailsModalProps {
  open: boolean;
  onClose: () => void;
  order: Order | null;
  executions: Execution[];
  messages: FIXMessage[];
  onUpdateOrder?: (orderId: string, updates: { quantity?: number; price?: number; timeInForce?: string }) => void;
}

export function OrderDetailsModal({
  open,
  onClose,
  order,
  executions,
  messages,
  onUpdateOrder,
}: OrderDetailsModalProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editQuantity, setEditQuantity] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editTIF, setEditTIF] = useState("DAY");

  if (!order) return null;

  // Filter executions and messages for this order
  const orderExecutions = executions.filter(e => e.orderId === order.id);
  const orderMessages = messages.filter(m => 
    m.rawFix.includes(order.clOrdId) || 
    m.parsed?.["11"] === order.clOrdId
  );

  // Create timeline events from executions
  const timelineEvents = [
    {
      timestamp: order.timestamp,
      type: "created",
      title: "Order Created",
      description: `${order.side} ${order.quantity} ${order.symbol} @ ${order.orderType}${order.price ? ` $${order.price}` : ""}`,
      status: order.status,
    },
    ...orderExecutions.map(exec => ({
      timestamp: exec.timestamp,
      type: exec.execType.toLowerCase(),
      title: exec.execType === "Fill" ? "Order Filled" : exec.execType === "PartialFill" ? "Partial Fill" : exec.execType,
      description: `${exec.lastQty} @ $${exec.lastPx.toFixed(2)} | Total: ${exec.cumQty} | Remaining: ${exec.leavesQty}`,
      status: exec.execType,
    })),
  ].sort((a, b) => a.timestamp - b.timestamp);

  const handleStartEdit = () => {
    setEditQuantity(order.quantity.toString());
    setEditPrice(order.price?.toString() || "");
    setEditTIF("DAY");
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!onUpdateOrder) return;

    const updates: any = {};
    const newQty = parseInt(editQuantity);
    const newPrice = parseFloat(editPrice);

    if (!isNaN(newQty) && newQty > 0 && newQty !== order.quantity) {
      updates.quantity = newQty;
    }

    if (!isNaN(newPrice) && newPrice > 0 && newPrice !== order.price) {
      updates.price = newPrice;
    }

    if (editTIF !== "DAY") {
      updates.timeInForce = editTIF;
    }

    if (Object.keys(updates).length > 0) {
      onUpdateOrder(order.id, updates);
      toast({
        title: "Order Update Requested",
        description: "Waiting for broker confirmation",
      });
    }

    setIsEditing(false);
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "New": return "bg-fix-new";
      case "PartiallyFilled": return "bg-fix-partial";
      case "Filled": return "bg-fix-filled";
      case "Canceled": return "bg-fix-canceled";
      case "Rejected": return "bg-fix-rejected";
      default: return "bg-secondary";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold font-mono">{order.symbol}</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={order.side === "Buy" ? "default" : "destructive"}>
                  {order.side}
                </Badge>
                <Badge className={`${getStatusColor(order.status)} text-white`}>
                  {order.status}
                </Badge>
                <span className="text-sm text-muted-foreground font-mono">
                  ID: {order.clOrdId}
                </span>
              </div>
            </div>
            
            {!isEditing && order.status === "New" && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleStartEdit}
                data-testid="button-edit-order"
              >
                <Edit2 className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="px-6 pb-6">
          {/* Order Details Section */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Order Details</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Quantity</Label>
                      <Input
                        type="number"
                        value={editQuantity}
                        onChange={(e) => setEditQuantity(e.target.value)}
                        className="h-9 font-mono"
                        data-testid="input-edit-quantity"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="h-9 font-mono"
                        data-testid="input-edit-price"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Time in Force</Label>
                      <Select value={editTIF} onValueChange={setEditTIF}>
                        <SelectTrigger className="h-9" data-testid="select-edit-tif">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DAY">Day</SelectItem>
                          <SelectItem value="GTC">GTC</SelectItem>
                          <SelectItem value="IOC">IOC</SelectItem>
                          <SelectItem value="FOK">FOK</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      data-testid="button-save-edit"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Save Changes
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      data-testid="button-cancel-edit"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Quantity</div>
                    <div className="font-mono font-semibold">{order.quantity}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Order Type</div>
                    <div className="font-mono font-semibold">{order.orderType}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Price</div>
                    <div className="font-mono font-semibold">
                      {order.price ? `$${order.price.toFixed(2)}` : "Market"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Filled / Remaining</div>
                    <div className="font-mono font-semibold">
                      {order.cumQty} / {order.leavesQty || order.quantity}
                    </div>
                  </div>
                  {order.avgPx > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Avg Price</div>
                      <div className="font-mono font-semibold">${order.avgPx.toFixed(2)}</div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabs for FIX and Flow */}
          <Tabs defaultValue="flow" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="flow" data-testid="tab-flow">Flow</TabsTrigger>
              <TabsTrigger value="fix" data-testid="tab-fix">FIX Messages</TabsTrigger>
            </TabsList>

            {/* Flow Timeline */}
            <TabsContent value="flow" className="mt-4">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {timelineEvents.map((event, index) => (
                    <div key={index} className="relative pl-8">
                      {/* Timeline connector */}
                      {index < timelineEvents.length - 1 && (
                        <div className="absolute left-[11px] top-8 h-full w-0.5 bg-border" />
                      )}
                      
                      {/* Timeline dot */}
                      <div className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-border bg-background">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                      </div>

                      <Card className="hover-elevate">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="font-semibold text-sm">{event.title}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {formatTimestamp(event.timestamp)}
                              </div>
                            </div>
                            {event.status && (
                              <Badge variant="outline" className="text-xs">
                                {event.status}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground font-mono">
                            {event.description}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* FIX Messages */}
            <TabsContent value="fix" className="mt-4">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {orderMessages.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <p className="text-sm">No FIX messages for this order</p>
                    </div>
                  ) : (
                    orderMessages.map((msg) => (
                      <Card key={msg.id} className="hover-elevate">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {msg.messageType}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {msg.direction}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatTimestamp(msg.timestamp)}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div>
                              <div className="text-xs font-semibold text-muted-foreground mb-1">
                                Route
                              </div>
                              <div className="text-xs font-mono">
                                {msg.fromRole} → {msg.toRole || "All"}
                              </div>
                            </div>

                            <Separator />

                            <div>
                              <div className="text-xs font-semibold text-muted-foreground mb-1">
                                FIX Message
                              </div>
                              <div className="text-xs font-mono bg-muted p-2 rounded break-all">
                                {msg.rawFix}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
