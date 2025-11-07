import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { X, RefreshCw } from "lucide-react";
import type { Order } from "@shared/schema";

interface OrderBookProps {
  orders: Order[];
  onCancel?: (orderId: string) => void;
  onReplace?: (orderId: string) => void;
  onOrderClick?: (order: Order) => void;
  showActions?: boolean;
}

export function OrderBook({ orders, onCancel, onReplace, onOrderClick, showActions = true }: OrderBookProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "New":
        return "bg-fix-new text-white";
      case "PartiallyFilled":
        return "bg-fix-partial text-white";
      case "Filled":
        return "bg-fix-filled text-white";
      case "Canceled":
        return "bg-fix-canceled text-white";
      case "Rejected":
        return "bg-fix-rejected text-white";
      case "PendingCancel":
        return "bg-muted text-muted-foreground";
      case "PendingReplace":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getSideColor = (side: string) => {
    return side === "Buy" ? "text-fix-buy" : "text-fix-sell";
  };

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Order Book</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No active orders</p>
            <p className="text-xs mt-1">Place your first order to get started</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">Order Book</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold text-xs">Order ID</TableHead>
                <TableHead className="font-semibold text-xs">Symbol</TableHead>
                <TableHead className="font-semibold text-xs">Side</TableHead>
                <TableHead className="font-semibold text-xs text-right">Qty</TableHead>
                <TableHead className="font-semibold text-xs text-right">Price</TableHead>
                <TableHead className="font-semibold text-xs">Type</TableHead>
                <TableHead className="font-semibold text-xs">Status</TableHead>
                <TableHead className="font-semibold text-xs text-right">Filled</TableHead>
                {showActions && <TableHead className="font-semibold text-xs">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow
                  key={order.id}
                  className="hover-elevate cursor-pointer"
                  onClick={() => onOrderClick?.(order)}
                  data-testid={`row-order-${order.id}`}
                >
                  <TableCell className="font-mono text-xs">{order.clOrdId}</TableCell>
                  <TableCell className="font-mono text-sm font-semibold">{order.symbol}</TableCell>
                  <TableCell>
                    <span className={`text-sm font-semibold ${getSideColor(order.side)}`}>
                      {order.side}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-right">{order.quantity}</TableCell>
                  <TableCell className="font-mono text-sm text-right">
                    {order.price ? order.price.toFixed(2) : "MKT"}
                  </TableCell>
                  <TableCell className="text-xs">{order.orderType}</TableCell>
                  <TableCell>
                    <Badge
                      className={`text-xs ${getStatusColor(order.status)}`}
                      data-testid={`badge-order-status-${order.id}`}
                    >
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-right text-muted-foreground">
                    {order.cumQty}/{order.quantity}
                  </TableCell>
                  {showActions && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {order.status !== "Filled" && order.status !== "Canceled" && order.status !== "Rejected" && (
                          <>
                            {onReplace && (
                              <Button
                                data-testid={`button-replace-${order.id}`}
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReplace(order.id);
                                }}
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {onCancel && (
                              <Button
                                data-testid={`button-cancel-${order.id}`}
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCancel(order.id);
                                }}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
