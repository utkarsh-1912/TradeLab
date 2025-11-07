import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Order } from "@shared/schema";

interface ReplaceOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onSubmit: (orderId: string, quantity: number, price?: number) => void;
}

export function ReplaceOrderDialog({ open, onOpenChange, order, onSubmit }: ReplaceOrderDialogProps) {
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");

  useEffect(() => {
    if (order) {
      setQuantity(order.quantity.toString());
      setPrice(order.price?.toString() || "");
    }
  }, [order]);

  const handleSubmit = () => {
    if (!order || !quantity) return;

    const newQty = parseFloat(quantity);
    const newPrice = price ? parseFloat(price) : undefined;

    if (isNaN(newQty) || newQty <= 0) {
      return;
    }

    if (price && (isNaN(newPrice!) || newPrice! <= 0)) {
      return;
    }

    onSubmit(order.id, newQty, newPrice);
    onOpenChange(false);
  };

  const getSideColor = (side: string) => {
    return side === "Buy" ? "text-fix-buy" : "text-fix-sell";
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Replace Order</DialogTitle>
          <DialogDescription>
            Modify the quantity or price for this order. The broker will need to accept the changes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Symbol</p>
              <p className="font-mono text-sm font-semibold">{order.symbol}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Side</p>
              <p className={`text-sm font-semibold ${getSideColor(order.side)}`}>
                {order.side}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Order ID</p>
              <p className="font-mono text-xs truncate">{order.clOrdId}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <Badge variant="secondary" className="text-xs">
                {order.status}
              </Badge>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                data-testid="input-replace-quantity"
                type="number"
                min="0"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter new quantity"
              />
              <p className="text-xs text-muted-foreground">
                Original: {order.quantity} | Filled: {order.cumQty}
              </p>
            </div>

            {order.orderType !== "Market" && (
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  data-testid="input-replace-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Enter new price"
                />
                <p className="text-xs text-muted-foreground">
                  Original: {order.price ? `$${order.price.toFixed(2)}` : "N/A"}
                </p>
              </div>
            )}
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
            <p className="text-xs text-amber-900 dark:text-amber-200">
              <strong>Note:</strong> This will send a replace request to the broker. The order status will 
              change to "PendingReplace" until the broker accepts or rejects the modification.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-replace-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!quantity || parseFloat(quantity) <= 0}
            data-testid="button-replace-submit"
          >
            Submit Replace Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
