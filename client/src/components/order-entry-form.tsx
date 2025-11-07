import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { SymbolSearch } from "@/components/symbol-search";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { OrderSide, OrderType } from "@shared/schema";

const orderFormSchema = z.object({
  symbol: z.string().min(1, "Symbol is required").max(10, "Symbol too long"),
  side: z.enum(["Buy", "Sell"]),
  quantity: z.number().positive("Quantity must be positive"),
  orderType: z.enum(["Market", "Limit", "Stop", "StopLimit"]),
  price: z.number().positive("Price must be positive").optional(),
});

type OrderFormData = z.infer<typeof orderFormSchema>;

interface OrderEntryFormProps {
  onSubmit: (order: OrderFormData) => void;
  disabled?: boolean;
}

export function OrderEntryForm({ onSubmit, disabled }: OrderEntryFormProps) {
  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      symbol: "",
      side: "Buy",
      quantity: 100,
      orderType: "Market",
      price: undefined,
    },
  });

  const watchOrderType = form.watch("orderType");
  const watchSide = form.watch("side");
  const needsPrice = watchOrderType === "Limit" || watchOrderType === "Stop" || watchOrderType === "StopLimit";

  const handleSubmit = (data: OrderFormData) => {
    onSubmit(data);
    form.reset({
      symbol: data.symbol, // Keep symbol
      side: data.side, // Keep side
      quantity: 100,
      orderType: "Market",
      price: undefined,
    });
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">New Order</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="symbol"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <SymbolSearch
                      value={field.value}
                      onSelect={(symbol) => field.onChange(symbol)}
                      placeholder="Search for a symbol..."
                      disabled={disabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="side"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Side</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="grid grid-cols-2 gap-2"
                    >
                      <div>
                        <RadioGroupItem
                          value="Buy"
                          id="buy"
                          className="peer sr-only"
                          data-testid="radio-side-buy"
                          disabled={disabled}
                        />
                        <Label
                          htmlFor="buy"
                          className="flex items-center justify-center gap-2 rounded-lg border-2 border-border bg-card px-3 py-2 cursor-pointer hover-elevate active-elevate-2 peer-data-[state=checked]:border-fix-buy peer-data-[state=checked]:bg-fix-buy/10"
                        >
                          <TrendingUp className="h-4 w-4 text-fix-buy" />
                          <span className="text-sm font-semibold">Buy</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem
                          value="Sell"
                          id="sell"
                          className="peer sr-only"
                          data-testid="radio-side-sell"
                          disabled={disabled}
                        />
                        <Label
                          htmlFor="sell"
                          className="flex items-center justify-center gap-2 rounded-lg border-2 border-border bg-card px-3 py-2 cursor-pointer hover-elevate active-elevate-2 peer-data-[state=checked]:border-fix-sell peer-data-[state=checked]:bg-fix-sell/10"
                        >
                          <TrendingDown className="h-4 w-4 text-fix-sell" />
                          <span className="text-sm font-semibold">Sell</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Quantity</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      data-testid="input-quantity"
                      type="number"
                      min="1"
                      step="1"
                      className="h-9 font-mono"
                      disabled={disabled}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="orderType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Order Type</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={disabled}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-order-type" className="h-9">
                        <SelectValue />
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

            {needsPrice && (
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Price</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        data-testid="input-price"
                        type="number"
                        min="0.01"
                        step="0.01"
                        className="h-9 font-mono"
                        disabled={disabled}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button
              data-testid="button-submit-order"
              type="submit"
              className="w-full h-10"
              disabled={disabled}
            >
              Place Order
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
