import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { SymbolSearch } from "@/components/symbol-search";
import { TrendingUp, TrendingDown, Plus } from "lucide-react";
import type { OrderSide, OrderType } from "@shared/schema";

const assetClasses = ["Equity", "FX", "Futures", "Options", "FixedIncome"] as const;
type AssetClass = typeof assetClasses[number];

const orderFormSchema = z.object({
  symbol: z.string().min(1, "Symbol is required").max(20, "Symbol too long"),
  side: z.enum(["Buy", "Sell"]),
  quantity: z.number().positive("Quantity must be positive"),
  orderType: z.enum(["Market", "Limit", "Stop", "StopLimit"]),
  price: z.number().positive("Price must be positive").optional(),
  assetClass: z.enum(assetClasses),
  securityType: z.string().optional(),
  
  // FX fields
  currencyPair: z.string().optional(),
  settlementType: z.string().optional(),
  settlementDate: z.string().optional(),
  
  // Futures/Options fields
  maturityMonthYear: z.string().optional(),
  contractMultiplier: z.number().positive().optional(),
  strikePrice: z.number().positive().optional(),
  optionType: z.enum(["C", "P"]).optional(),
  expiryDate: z.string().optional(),
  underlyingSymbol: z.string().optional(),
  
  // Fixed Income fields
  couponRate: z.number().min(0).max(100).optional(),
  maturityDate: z.string().optional(),
  accruedInterest: z.number().optional(),
}).refine((data) => {
  // Require price for Limit, Stop, and StopLimit orders
  if (data.orderType === "Limit" || data.orderType === "Stop" || data.orderType === "StopLimit") {
    return data.price !== undefined && data.price > 0;
  }
  return true;
}, {
  message: "Price is required for Limit, Stop, and StopLimit orders",
  path: ["price"],
});

type OrderFormData = z.infer<typeof orderFormSchema>;

interface OrderEntryModalProps {
  onSubmit: (order: OrderFormData) => void;
  disabled?: boolean;
}

export function OrderEntryModal({ onSubmit, disabled }: OrderEntryModalProps) {
  const [open, setOpen] = useState(false);
  
  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      symbol: "",
      side: "Buy",
      quantity: 100,
      orderType: "Market",
      price: undefined,
      assetClass: "Equity",
      securityType: undefined,
      currencyPair: undefined,
      settlementType: undefined,
      settlementDate: undefined,
      maturityMonthYear: undefined,
      contractMultiplier: undefined,
      strikePrice: undefined,
      optionType: undefined,
      expiryDate: undefined,
      underlyingSymbol: undefined,
      couponRate: undefined,
      maturityDate: undefined,
      accruedInterest: undefined,
    },
  });

  const watchOrderType = form.watch("orderType");
  const watchSide = form.watch("side");
  const watchAssetClass = form.watch("assetClass");
  const needsPrice = watchOrderType === "Limit" || watchOrderType === "Stop" || watchOrderType === "StopLimit";

  const handleSubmit = (data: OrderFormData) => {
    onSubmit(data);
    setOpen(false);
    form.reset({
      symbol: "",
      side: "Buy",
      quantity: 100,
      orderType: "Market",
      price: undefined,
      assetClass: "Equity",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          data-testid="button-new-order" 
          disabled={disabled}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          New Order
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">New Order</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Asset Class Selection */}
            <FormField
              control={form.control}
              name="assetClass"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset Class</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-asset-class">
                        <SelectValue placeholder="Select asset class" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Equity">Equity</SelectItem>
                      <SelectItem value="FX">Foreign Exchange (FX)</SelectItem>
                      <SelectItem value="Futures">Futures</SelectItem>
                      <SelectItem value="Options">Options</SelectItem>
                      <SelectItem value="FixedIncome">Fixed Income</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Symbol */}
              <FormField
                control={form.control}
                name="symbol"
                render={({ field }) => (
                  <FormItem>
                    {watchAssetClass === "Equity" ? (
                      <FormControl>
                        <SymbolSearch
                          data-testid="input-symbol"
                          value={field.value || ""}
                          onSelect={(symbol) => field.onChange(symbol)}
                          placeholder="Search symbol..."
                          label="Symbol"
                        />
                      </FormControl>
                    ) : (
                      <>
                        <FormLabel>
                          {watchAssetClass === "FX" ? "Currency Pair" : 
                           watchAssetClass === "Options" ? "Option Symbol" : 
                           "Symbol"}
                        </FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-symbol"
                            {...field}
                            placeholder={
                              watchAssetClass === "FX" ? "e.g., EUR/USD" :
                              watchAssetClass === "Futures" ? "e.g., ESZ4" :
                              watchAssetClass === "Options" ? "e.g., AAPL250120C00150000" :
                              "e.g., US10Y"
                            }
                          />
                        </FormControl>
                      </>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Security Type */}
              {watchAssetClass !== "Equity" && (
                <FormField
                  control={form.control}
                  name="securityType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Security Type</FormLabel>
                      <FormControl>
                        <Input
                          data-testid="input-security-type"
                          {...field}
                          placeholder={
                            watchAssetClass === "FX" ? "FXSPOT" :
                            watchAssetClass === "Futures" ? "FUT" :
                            watchAssetClass === "Options" ? "OPT" :
                            "BOND"
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Options-specific: Underlying Symbol */}
            {watchAssetClass === "Options" && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="underlyingSymbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Underlying Symbol</FormLabel>
                      <FormControl>
                        <Input
                          data-testid="input-underlying-symbol"
                          {...field}
                          placeholder="e.g., AAPL"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="optionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Option Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-option-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="C">Call</SelectItem>
                          <SelectItem value="P">Put</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Strike Price & Expiry Date for Options */}
            {watchAssetClass === "Options" && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="strikePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Strike Price</FormLabel>
                      <FormControl>
                        <Input
                          data-testid="input-strike-price"
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          placeholder="e.g., 150.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiry Date</FormLabel>
                      <FormControl>
                        <Input
                          data-testid="input-expiry-date"
                          type="date"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Futures-specific fields */}
            {watchAssetClass === "Futures" && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="maturityMonthYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maturity (YYYYMM)</FormLabel>
                      <FormControl>
                        <Input
                          data-testid="input-maturity-month-year"
                          {...field}
                          placeholder="e.g., 202412"
                          maxLength={6}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contractMultiplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract Multiplier</FormLabel>
                      <FormControl>
                        <Input
                          data-testid="input-contract-multiplier"
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          placeholder="e.g., 50"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* FX-specific fields */}
            {watchAssetClass === "FX" && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="settlementType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Settlement Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-settlement-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SPOT">Spot</SelectItem>
                          <SelectItem value="FWD">Forward</SelectItem>
                          <SelectItem value="SWAP">Swap</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="settlementDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Settlement Date</FormLabel>
                      <FormControl>
                        <Input
                          data-testid="input-settlement-date"
                          type="date"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Fixed Income fields */}
            {watchAssetClass === "FixedIncome" && (
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="couponRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coupon Rate (%)</FormLabel>
                      <FormControl>
                        <Input
                          data-testid="input-coupon-rate"
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          placeholder="e.g., 4.25"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maturityDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maturity Date</FormLabel>
                      <FormControl>
                        <Input
                          data-testid="input-maturity-date"
                          type="date"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accruedInterest"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Accrued Interest</FormLabel>
                      <FormControl>
                        <Input
                          data-testid="input-accrued-interest"
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          placeholder="e.g., 125.50"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Side Selection */}
            <FormField
              control={form.control}
              name="side"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Side</FormLabel>
                  <FormControl>
                    <RadioGroup
                      data-testid="radio-side"
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Buy" id="buy" data-testid="radio-buy" />
                        <Label htmlFor="buy" className="flex items-center gap-2 cursor-pointer font-medium text-green-600">
                          <TrendingUp className="h-4 w-4" />
                          Buy
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Sell" id="sell" data-testid="radio-sell" />
                        <Label htmlFor="sell" className="flex items-center gap-2 cursor-pointer font-medium text-red-600">
                          <TrendingDown className="h-4 w-4" />
                          Sell
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Quantity */}
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input
                        data-testid="input-quantity"
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        placeholder="100"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Order Type */}
              <FormField
                control={form.control}
                name="orderType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-order-type">
                          <SelectValue placeholder="Select order type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Market">Market</SelectItem>
                        <SelectItem value="Limit">Limit</SelectItem>
                        <SelectItem value="Stop">Stop</SelectItem>
                        <SelectItem value="StopLimit">Stop Limit</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Price (conditional) */}
            {needsPrice && (
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <Input
                        data-testid="input-price"
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                        placeholder="0.00"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                data-testid="button-cancel-order"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={disabled}
                data-testid="button-submit-order"
                className={
                  watchSide === "Buy"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }
              >
                Submit {watchSide} Order
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
