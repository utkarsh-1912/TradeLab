import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, X, ArrowRight, RefreshCw } from "lucide-react";
import type { Order } from "@shared/schema";

interface OrderReplaceModalProps {
  open: boolean;
  onClose: () => void;
  order: Order | null;
  newQuantity?: number;
  newPrice?: number;
  onAccept: (orderId: string) => void;
  onReject?: (orderId: string) => void;
}

export function OrderReplaceModal({
  open,
  onClose,
  order,
  newQuantity,
  newPrice,
  onAccept,
  onReject,
}: OrderReplaceModalProps) {
  if (!order) return null;

  const handleAccept = () => {
    onAccept(order.id);
    onClose();
  };

  const handleReject = () => {
    if (onReject) {
      onReject(order.id);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" data-testid="modal-replace-request">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-500" />
            Replace Request
          </DialogTitle>
          <DialogDescription>
            Review the requested changes and approve or reject
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Header */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xl font-bold">{order.symbol}</span>
            <Badge variant={order.side === "Buy" ? "default" : "destructive"}>
              {order.side}
            </Badge>
            <Badge variant="outline">{order.orderType}</Badge>
          </div>
          <div className="text-xs text-muted-foreground font-mono -mt-2">
            {order.clOrdId}
          </div>

          <Separator />

          {/* Comparison View */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
            {/* Current Values */}
            <div className="p-4 rounded-lg bg-muted/30 space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase">Current</div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Quantity</div>
                <div className="font-mono text-2xl font-bold">{order.quantity}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Price</div>
                <div className="font-mono text-lg">
                  {order.price ? `$${order.price.toFixed(2)}` : "Market"}
                </div>
              </div>
            </div>

            {/* Arrow */}
            <ArrowRight className="h-6 w-6 text-blue-500" />

            {/* New Values */}
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 space-y-3">
              <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase">New</div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Quantity</div>
                <div className="font-mono text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {newQuantity ?? order.quantity}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Price</div>
                <div className="font-mono text-lg text-blue-700 dark:text-blue-300">
                  {newPrice !== undefined ? `$${newPrice.toFixed(2)}` : order.price ? `$${order.price.toFixed(2)}` : "Market"}
                </div>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          {order.cumQty > 0 && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
              <p className="text-sm text-amber-900 dark:text-amber-100">
                <strong>Note:</strong> This order has been partially filled ({order.cumQty} of {order.quantity}). 
                The modification will apply to the remaining quantity.
              </p>
            </div>
          )}

          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              The trader has requested to modify this order. Accept to apply the changes or reject to keep the original order.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 h-10"
              onClick={onClose}
              data-testid="button-replace-close"
            >
              Close
            </Button>
            {onReject && (
              <Button
                variant="destructive"
                className="flex-1 h-10"
                onClick={handleReject}
                data-testid="button-reject-replace"
              >
                <X className="h-4 w-4 mr-2" />
                Reject
              </Button>
            )}
            <Button
              className="flex-1 h-10"
              onClick={handleAccept}
              data-testid="button-accept-replace"
            >
              <Check className="h-4 w-4 mr-2" />
              Accept Replace
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
