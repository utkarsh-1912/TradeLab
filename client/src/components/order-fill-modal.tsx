import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, X } from "lucide-react";
import type { Order } from "@shared/schema";

interface OrderFillModalProps {
  open: boolean;
  onClose: () => void;
  order: Order | null;
  onFill: (orderId: string, quantity: number, price: number) => void;
  onReject: (orderId: string) => void;
}

export function OrderFillModal({
  open,
  onClose,
  order,
  onFill,
  onReject,
}: OrderFillModalProps) {
  const [fillQuantity, setFillQuantity] = useState("");
  const [fillPrice, setFillPrice] = useState("");

  // Reset state when order changes to prevent stale values
  useEffect(() => {
    if (order) {
      setFillQuantity("");
      setFillPrice("");
    }
  }, [order?.id]);

  if (!order) return null;

  const remainingQty = order.leavesQty || order.quantity;

  const handleFill = (partialPercent?: number) => {
    const price = parseFloat(fillPrice);
    let quantity: number;

    if (partialPercent) {
      quantity = Math.round(remainingQty * partialPercent);
    } else {
      quantity = fillQuantity ? parseInt(fillQuantity) : remainingQty;
    }

    if (isNaN(price) || price <= 0) {
      return;
    }

    if (isNaN(quantity) || quantity <= 0 || quantity > remainingQty) {
      return;
    }

    onFill(order.id, quantity, price);
    handleClose();
  };

  const handleReject = () => {
    onReject(order.id);
    handleClose();
  };

  const handleClose = () => {
    setFillQuantity("");
    setFillPrice("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-md" data-testid="dialog-order-fill">
        <DialogHeader>
          <DialogTitle>Fill Order</DialogTitle>
          <DialogDescription>
            Enter fill details for this order
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Summary */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-bold">{order.symbol}</span>
                <Badge variant={order.side === "Buy" ? "default" : "destructive"}>
                  {order.side}
                </Badge>
              </div>
              <Badge variant="outline">{order.orderType}</Badge>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground mb-1">Total Quantity</div>
                <div className="font-mono font-semibold">{order.quantity}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Remaining</div>
                <div className="font-mono font-semibold text-primary">{remainingQty}</div>
              </div>
              {order.price && (
                <div>
                  <div className="text-muted-foreground mb-1">Order Price</div>
                  <div className="font-mono font-semibold">${order.price.toFixed(2)}</div>
                </div>
              )}
              {order.cumQty > 0 && (
                <div>
                  <div className="text-muted-foreground mb-1">Filled</div>
                  <div className="font-mono font-semibold">{order.cumQty}</div>
                </div>
              )}
            </div>

            {order.cumQty > 0 && order.avgPx !== undefined && (
              <>
                <Separator />
                <div className="text-sm">
                  <div className="text-muted-foreground mb-1">Average Fill Price</div>
                  <div className="font-mono font-semibold">${order.avgPx.toFixed(2)}</div>
                </div>
              </>
            )}
          </div>

          {/* Fill Inputs */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fill-quantity">Quantity</Label>
                <Input
                  id="fill-quantity"
                  data-testid="input-fill-quantity"
                  type="number"
                  placeholder={remainingQty.toString()}
                  value={fillQuantity}
                  onChange={(e) => setFillQuantity(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fill-price">Price</Label>
                <Input
                  id="fill-price"
                  data-testid="input-fill-price"
                  type="number"
                  step="0.01"
                  placeholder={order.price ? order.price.toString() : "Price"}
                  value={fillPrice}
                  onChange={(e) => setFillPrice(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>

            {/* Quick Fill Buttons */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-8 text-xs"
                onClick={() => handleFill(0.25)}
                disabled={!fillPrice}
                data-testid="button-fill-25"
              >
                25%
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-8 text-xs"
                onClick={() => handleFill(0.5)}
                disabled={!fillPrice}
                data-testid="button-fill-50"
              >
                50%
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-8 text-xs"
                onClick={() => handleFill(0.75)}
                disabled={!fillPrice}
                data-testid="button-fill-75"
              >
                75%
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-8 text-xs"
                onClick={() => handleFill(1.0)}
                disabled={!fillPrice}
                data-testid="button-fill-100"
              >
                100%
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="default"
              className="flex-1"
              onClick={() => handleFill()}
              disabled={!fillPrice}
              data-testid="button-fill-submit"
            >
              <Check className="h-4 w-4 mr-2" />
              Fill Order
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleReject}
              data-testid="button-reject-submit"
            >
              <X className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
