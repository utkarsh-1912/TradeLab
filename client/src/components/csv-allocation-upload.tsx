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
import type { AllocationType, AllocationAccount } from "@shared/schema";

interface CSVAllocationUploadProps {
  onAllocationSubmit: (orderId: string, allocType: AllocationType, accounts: AllocationAccount[]) => void;
  disabled?: boolean;
}

interface ParsedAllocation {
  orderId: string;
  allocType: AllocationType;
  accounts: AllocationAccount[];
  valid: boolean;
  errors: string[];
}

export function CSVAllocationUpload({ onAllocationSubmit, disabled }: CSVAllocationUploadProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [parsedAllocations, setParsedAllocations] = useState<ParsedAllocation[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAllocation = (alloc: any): ParsedAllocation => {
    const errors: string[] = [];
    
    if (!alloc.orderId || typeof alloc.orderId !== 'string') {
      errors.push('Invalid order ID');
    }
    
    const validTypes: AllocationType[] = ['ProRata', 'Percent', 'FixedQty', 'AvgPrice'];
    if (!validTypes.includes(alloc.allocType)) {
      errors.push('AllocType must be ProRata, Percent, FixedQty, or AvgPrice');
    }

    const accounts: AllocationAccount[] = [];
    let accountIdx = 1;
    
    while (alloc[`account${accountIdx}Name`]) {
      const account = alloc[`account${accountIdx}Name`];
      const qty = parseFloat(alloc[`account${accountIdx}Qty`] || '0');
      
      if (!account) {
        errors.push(`Account ${accountIdx} missing name`);
      }
      if (isNaN(qty) || qty < 0) {
        errors.push(`Account ${accountIdx} invalid quantity`);
      }
      
      accounts.push({ account, qty });
      accountIdx++;
    }

    if (accounts.length === 0) {
      errors.push('No accounts specified');
    }

    return {
      orderId: alloc.orderId || '',
      allocType: alloc.allocType || 'ProRata',
      accounts,
      valid: errors.length === 0,
      errors,
    };
  };

  const parseCSV = (text: string): ParsedAllocation[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      return [];
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const allocations: ParsedAllocation[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const allocData: any = {};
      
      headers.forEach((header, idx) => {
        allocData[header] = values[idx] || '';
      });

      allocations.push(validateAllocation(allocData));
    }

    return allocations;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const text = await file.text();
      const allocations = parseCSV(text);
      
      if (allocations.length === 0) {
        toast({
          title: "No Allocations Found",
          description: "CSV file is empty or improperly formatted",
          variant: "destructive",
        });
        return;
      }

      setParsedAllocations(allocations);
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

  const handleSubmitAllocations = () => {
    const validAllocations = parsedAllocations.filter(a => a.valid);
    
    if (validAllocations.length === 0) {
      toast({
        title: "No Valid Allocations",
        description: "All allocations have validation errors",
        variant: "destructive",
      });
      return;
    }

    validAllocations.forEach((alloc) => {
      onAllocationSubmit(alloc.orderId, alloc.allocType, alloc.accounts);
    });
    
    toast({
      title: "Allocations Submitted",
      description: `${validAllocations.length} allocations submitted successfully`,
    });
    
    setParsedAllocations([]);
    setDialogOpen(false);
  };

  const validCount = parsedAllocations.filter(a => a.valid).length;
  const invalidCount = parsedAllocations.length - validCount;

  return (
    <>
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          disabled={disabled || uploading}
          data-testid="input-csv-allocation-file"
          className="hidden"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          data-testid="button-upload-csv-allocations"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload CSV Allocations
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="dialog-csv-allocations">
          <DialogHeader>
            <DialogTitle>Review CSV Allocations</DialogTitle>
            <DialogDescription>
              Review and validate allocations before submission. Format: orderId, allocType, account1Name, account1Qty, account2Name, account2Qty, ...
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
                  <TableHead>Order ID</TableHead>
                  <TableHead>Alloc Type</TableHead>
                  <TableHead>Accounts</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedAllocations.map((alloc, idx) => (
                  <TableRow key={idx} data-testid={`row-csv-allocation-${idx}`}>
                    <TableCell className="font-mono text-xs">{alloc.orderId.slice(0, 12)}...</TableCell>
                    <TableCell>
                      <Badge variant="outline">{alloc.allocType}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {alloc.accounts.map((acc, i) => (
                          <div key={i} className="text-xs">
                            {acc.account}: {acc.qty}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {alloc.valid ? (
                        <Badge variant="default">Valid</Badge>
                      ) : (
                        <div className="space-y-1">
                          <Badge variant="destructive">Invalid</Badge>
                          {alloc.errors.map((err, i) => (
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
                data-testid="button-cancel-csv-allocations"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitAllocations}
                disabled={validCount === 0}
                data-testid="button-submit-csv-allocations"
              >
                Submit {validCount} Allocation{validCount !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
