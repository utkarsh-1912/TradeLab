import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, X, AlertTriangle } from "lucide-react";
import type { Order } from "@shared/schema";

interface OrderCancelModalProps {
  open: boolean;
  onClose: () => void;
  order: Order | null;
  onAccept: (orderId: string) => void;
  onReject?: (orderId: string) => void;
}

export function OrderCancelModal({
  open,
  onClose,
  order,
  onAccept,
  onReject,
}: OrderCancelModalProps) {
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
      <DialogContent className="max-w-md" data-testid="modal-cancel-request">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Cancel Request
          </DialogTitle>
          <DialogDescription>
            Review and approve or reject this cancellation request
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Summary */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xl font-bold">{order.symbol}</span>
                  <Badge variant={order.side === "Buy" ? "default" : "destructive"}>
                    {order.side}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  {order.clOrdId}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-lg font-bold">{order.quantity}</div>
                {order.price && (
                  <div className="text-sm text-muted-foreground">@ ${order.price.toFixed(2)}</div>
                )}
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-muted-foreground text-xs">Order Type</div>
                <div className="font-medium">{order.orderType}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Status</div>
                <Badge variant="outline" className="text-xs">{order.status}</Badge>
              </div>
              {order.cumQty > 0 && (
                <>
                  <div>
                    <div className="text-muted-foreground text-xs">Filled Qty</div>
                    <div className="font-medium font-mono">{order.cumQty}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Avg Price</div>
                    <div className="font-medium font-mono">${order.avgPx?.toFixed(2)}</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Warning Message */}
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
            <p className="text-sm text-amber-900 dark:text-amber-100">
              {order.cumQty > 0 
                ? `This order has been partially filled (${order.cumQty} of ${order.quantity}). Canceling will leave ${order.cumQty} shares filled.`
                : "The trader has requested to cancel this order. Accept to cancel or reject to keep the order active."
              }
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 h-10"
              onClick={onClose}
              data-testid="button-cancel-close"
            >
              Close
            </Button>
            {onReject && (
              <Button
                variant="destructive"
                className="flex-1 h-10"
                onClick={handleReject}
                data-testid="button-reject-cancel"
              >
                <X className="h-4 w-4 mr-2" />
                Reject
              </Button>
            )}
            <Button
              className="flex-1 h-10"
              onClick={handleAccept}
              data-testid="button-accept-cancel"
            >
              <Check className="h-4 w-4 mr-2" />
              Accept Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
