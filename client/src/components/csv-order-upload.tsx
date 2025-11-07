import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CSVOrderUploadProps {
  onOrdersSubmit: (orders: Array<{
    symbol: string;
    side: string;
    quantity: number;
    orderType: string;
    price?: number;
  }>) => void;
  disabled?: boolean;
}

interface ParsedOrder {
  symbol: string;
  side: string;
  quantity: number;
  orderType: string;
  price?: number;
  valid: boolean;
  errors: string[];
}

export function CSVOrderUpload({ onOrdersSubmit, disabled }: CSVOrderUploadProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [parsedOrders, setParsedOrders] = useState<ParsedOrder[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateOrder = (order: any, rowNum: number): ParsedOrder => {
    const errors: string[] = [];
    
    if (!order.symbol || typeof order.symbol !== 'string') {
      errors.push('Invalid symbol');
    }
    if (!['Buy', 'Sell'].includes(order.side)) {
      errors.push('Side must be "Buy" or "Sell"');
    }
    const qty = parseInt(order.quantity);
    if (isNaN(qty) || qty <= 0) {
      errors.push('Invalid quantity');
    }
    if (!['Market', 'Limit'].includes(order.orderType)) {
      errors.push('OrderType must be "Market" or "Limit"');
    }
    if (order.orderType === 'Limit') {
      const px = parseFloat(order.price);
      if (isNaN(px) || px <= 0) {
        errors.push('Limit orders require valid price');
      }
    }

    return {
      symbol: order.symbol || '',
      side: order.side || '',
      quantity: qty,
      orderType: order.orderType || '',
      price: order.price ? parseFloat(order.price) : undefined,
      valid: errors.length === 0,
      errors,
    };
  };

  const parseCSV = (text: string): ParsedOrder[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      return [];
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const orders: ParsedOrder[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const orderData: any = {};
      
      headers.forEach((header, idx) => {
        orderData[header] = values[idx] || '';
      });

      orders.push(validateOrder(orderData, i));
    }

    return orders;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const text = await file.text();
      const orders = parseCSV(text);
      
      if (orders.length === 0) {
        toast({
          title: "No Orders Found",
          description: "CSV file is empty or improperly formatted",
          variant: "destructive",
        });
        return;
      }

      setParsedOrders(orders);
      setDialogOpen(true);
    } catch (error) {
      toast({
        title: "Parse Error",
        description: "Failed to parse CSV file",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmitOrders = () => {
    const validOrders = parsedOrders.filter(o => o.valid);
    
    if (validOrders.length === 0) {
      toast({
        title: "No Valid Orders",
        description: "All orders have validation errors",
        variant: "destructive",
      });
      return;
    }

    onOrdersSubmit(validOrders);
    
    toast({
      title: "Orders Submitted",
      description: `${validOrders.length} orders submitted successfully`,
    });
    
    setParsedOrders([]);
    setDialogOpen(false);
  };

  const validCount = parsedOrders.filter(o => o.valid).length;
  const invalidCount = parsedOrders.length - validCount;

  return (
    <>
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          disabled={disabled || uploading}
          data-testid="input-csv-order-file"
          className="hidden"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          data-testid="button-upload-csv-orders"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload CSV Orders
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="dialog-csv-orders">
          <DialogHeader>
            <DialogTitle>Review CSV Orders</DialogTitle>
            <DialogDescription>
              Review and validate orders before submission. Expected format: Symbol, Side, Quantity, OrderType, Price
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <Badge variant="default">
                {validCount} Valid
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="destructive">
                  {invalidCount} Invalid
                </Badge>
              )}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedOrders.map((order, idx) => (
                  <TableRow key={idx} data-testid={`row-csv-order-${idx}`}>
                    <TableCell className="font-mono">{order.symbol}</TableCell>
                    <TableCell>
                      <Badge variant={order.side === 'Buy' ? 'default' : 'destructive'}>
                        {order.side}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell>{order.orderType}</TableCell>
                    <TableCell>{order.price || '-'}</TableCell>
                    <TableCell>
                      {order.valid ? (
                        <Badge variant="default">Valid</Badge>
                      ) : (
                        <div className="space-y-1">
                          <Badge variant="destructive">Invalid</Badge>
                          {order.errors.map((err, i) => (
                            <p key={i} className="text-xs text-destructive">{err}</p>
                          ))}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                data-testid="button-cancel-csv-orders"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitOrders}
                disabled={validCount === 0}
                data-testid="button-submit-csv-orders"
              >
                Submit {validCount} Order{validCount !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
