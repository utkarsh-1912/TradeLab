import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Calculator, Percent, Hash, BarChart } from "lucide-react";
import type { AllocationType, AllocationAccount, Order } from "@shared/schema";

interface AllocationWizardProps {
  open: boolean;
  onClose: () => void;
  order: Order | null;
  onSubmit: (allocType: AllocationType, accounts: AllocationAccount[]) => void;
}

export function AllocationWizard({ open, onClose, order, onSubmit }: AllocationWizardProps) {
  const [step, setStep] = useState(1);
  const [allocType, setAllocType] = useState<AllocationType>("ProRata");
  const [accounts, setAccounts] = useState<AllocationAccount[]>([
    { account: "", qty: 0, percent: 0 }
  ]);

  const handleAddAccount = () => {
    setAccounts([...accounts, { account: "", qty: 0, percent: 0 }]);
  };

  const handleRemoveAccount = (index: number) => {
    setAccounts(accounts.filter((_, i) => i !== index));
  };

  const handleAccountChange = (index: number, field: keyof AllocationAccount, value: string | number) => {
    const updated = [...accounts];
    updated[index] = { ...updated[index], [field]: value };
    setAccounts(updated);
  };

  const computeAllocations = (): AllocationAccount[] => {
    if (!order) return [];

    const avgPx = order.avgPx || order.price || 0;
    const totalQty = order.cumQty;

    switch (allocType) {
      case "ProRata": {
        const totalWeight = accounts.reduce((sum, acc) => sum + (acc.qty || 0), 0);
        return accounts.map(acc => {
          const qty = totalWeight > 0 ? Math.floor((totalQty * (acc.qty || 0)) / totalWeight) : 0;
          const netMoney = qty * avgPx;
          return { ...acc, qty, netMoney };
        });
      }
      case "Percent": {
        const totalPercent = accounts.reduce((sum, acc) => sum + (acc.percent || 0), 0);
        return accounts.map(acc => {
          const qty = Math.floor((totalQty * (acc.percent || 0)) / 100);
          const netMoney = qty * avgPx;
          return { ...acc, qty, netMoney };
        });
      }
      case "FixedQty": {
        return accounts.map(acc => {
          const qty = acc.qty || 0;
          const netMoney = qty * avgPx;
          return { ...acc, qty, netMoney };
        });
      }
      case "AvgPrice": {
        return accounts.map(acc => {
          const qty = acc.qty || 0;
          const netMoney = qty * avgPx;
          return { ...acc, qty, netMoney };
        });
      }
      default:
        return accounts;
    }
  };

  const computed = computeAllocations();
  const totalAllocated = computed.reduce((sum, acc) => sum + (acc.qty || 0), 0);
  const totalPercent = accounts.reduce((sum, acc) => sum + (acc.percent || 0), 0);
  const isValid = accounts.every(acc => acc.account.trim() !== "") && 
                  (allocType !== "Percent" || Math.abs(totalPercent - 100) < 0.01);

  const handleSubmit = () => {
    if (!isValid || !order) return;
    onSubmit(allocType, computed);
    handleClose();
  };

  const handleClose = () => {
    setStep(1);
    setAllocType("ProRata");
    setAccounts([{ account: "", qty: 0, percent: 0 }]);
    onClose();
  };

  const allocTypes = [
    {
      value: "ProRata" as AllocationType,
      icon: Calculator,
      title: "Pro-Rata",
      description: "Allocate proportionally by weight"
    },
    {
      value: "Percent" as AllocationType,
      icon: Percent,
      title: "Percentage",
      description: "Allocate by percentage (must total 100%)"
    },
    {
      value: "FixedQty" as AllocationType,
      icon: Hash,
      title: "Fixed Quantity",
      description: "Allocate specific quantities to each account"
    },
    {
      value: "AvgPrice" as AllocationType,
      icon: BarChart,
      title: "Average Price",
      description: "Average price allocation across accounts"
    }
  ];

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Create Allocation</DialogTitle>
          <DialogDescription>
            {order && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="font-mono">{order.symbol}</Badge>
                <span className="text-sm">•</span>
                <span className="text-sm">Qty: {order.cumQty}</span>
                <span className="text-sm">•</span>
                <span className="text-sm">Avg Px: {order.avgPx?.toFixed(2) || "N/A"}</span>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3].map((num) => (
              <div key={num} className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold ${
                    step >= num
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  {num}
                </div>
                {num < 3 && (
                  <div className={`h-0.5 w-12 ${step > num ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Select Allocation Type */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Step 1: Select Allocation Method</h3>
              <RadioGroup value={allocType} onValueChange={(v) => setAllocType(v as AllocationType)}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {allocTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <div key={type.value}>
                        <RadioGroupItem
                          value={type.value}
                          id={type.value}
                          className="peer sr-only"
                          data-testid={`radio-alloc-type-${type.value}`}
                        />
                        <Label
                          htmlFor={type.value}
                          className="flex items-start gap-3 rounded-lg border-2 border-border bg-card p-4 cursor-pointer hover-elevate active-elevate-2 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-semibold">{type.title}</p>
                            <p className="text-xs text-muted-foreground">{type.description}</p>
                          </div>
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Step 2: Add Accounts */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Step 2: Add Accounts</h3>
                <Button
                  data-testid="button-add-account"
                  size="sm"
                  variant="outline"
                  onClick={handleAddAccount}
                  className="h-8"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Account
                </Button>
              </div>
              <div className="space-y-3">
                {accounts.map((account, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-12 gap-3 items-start">
                      <div className="col-span-5">
                        <Label className="text-xs font-medium mb-1.5 block">Account</Label>
                        <Input
                          data-testid={`input-account-${index}`}
                          placeholder="Account ID"
                          value={account.account}
                          onChange={(e) => handleAccountChange(index, "account", e.target.value)}
                          className="h-9 font-mono"
                        />
                      </div>
                      {(allocType === "ProRata" || allocType === "FixedQty" || allocType === "AvgPrice") && (
                        <div className="col-span-3">
                          <Label className="text-xs font-medium mb-1.5 block">
                            {allocType === "ProRata" ? "Weight" : "Quantity"}
                          </Label>
                          <Input
                            data-testid={`input-qty-${index}`}
                            type="number"
                            min="0"
                            value={account.qty || ""}
                            onChange={(e) => handleAccountChange(index, "qty", Number(e.target.value))}
                            className="h-9 font-mono"
                          />
                        </div>
                      )}
                      {allocType === "Percent" && (
                        <div className="col-span-3">
                          <Label className="text-xs font-medium mb-1.5 block">Percent</Label>
                          <Input
                            data-testid={`input-percent-${index}`}
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={account.percent || ""}
                            onChange={(e) => handleAccountChange(index, "percent", Number(e.target.value))}
                            className="h-9 font-mono"
                          />
                        </div>
                      )}
                      <div className="col-span-3 flex items-end">
                        <Button
                          data-testid={`button-remove-account-${index}`}
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveAccount(index)}
                          disabled={accounts.length === 1}
                          className="h-9 w-9"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              {allocType === "Percent" && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <span className="text-sm font-medium">Total Percentage:</span>
                  <Badge
                    variant={Math.abs(totalPercent - 100) < 0.01 ? "default" : "destructive"}
                    className="font-mono"
                  >
                    {totalPercent.toFixed(2)}%
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Step 3: Review Allocation</h3>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold text-xs">Account</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Quantity</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Net Money</TableHead>
                      {allocType === "Percent" && (
                        <TableHead className="font-semibold text-xs text-right">Percent</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {computed.map((acc, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">{acc.account}</TableCell>
                        <TableCell className="font-mono text-sm text-right">{acc.qty}</TableCell>
                        <TableCell className="font-mono text-sm text-right">
                          ${acc.netMoney?.toFixed(2)}
                        </TableCell>
                        {allocType === "Percent" && (
                          <TableCell className="font-mono text-sm text-right">
                            {accounts[index].percent?.toFixed(2)}%
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    <TableRow className="font-semibold bg-muted/50">
                      <TableCell>Total</TableCell>
                      <TableCell className="font-mono text-right">{totalAllocated}</TableCell>
                      <TableCell className="font-mono text-right">
                        ${computed.reduce((sum, acc) => sum + (acc.netMoney || 0), 0).toFixed(2)}
                      </TableCell>
                      {allocType === "Percent" && (
                        <TableCell className="font-mono text-right">{totalPercent.toFixed(2)}%</TableCell>
                      )}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              {order && totalAllocated !== order.cumQty && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive font-medium">
                    Warning: Total allocated ({totalAllocated}) does not match order quantity ({order.cumQty})
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              data-testid="button-wizard-back"
            >
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={handleClose}
                data-testid="button-wizard-cancel"
              >
                Cancel
              </Button>
              {step < 3 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={step === 2 && !isValid}
                  data-testid="button-wizard-next"
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!isValid}
                  data-testid="button-wizard-submit"
                >
                  Submit Allocation
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
