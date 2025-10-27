import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ============ FIX PROTOCOL TYPES ============

// Role types
export type ParticipantRole = "Trader" | "Broker" | "Custodian";

// Order sides
export type OrderSide = "Buy" | "Sell";

// Order types
export type OrderType = "Market" | "Limit" | "Stop" | "StopLimit";

// Order status (FIX OrdStatus values)
export type OrderStatus = 
  | "New"           // 0
  | "PartiallyFilled" // 1
  | "Filled"        // 2
  | "Canceled"      // 4
  | "Rejected"      // 8
  | "PendingCancel" // 6
  | "PendingReplace"; // E

// Execution types (FIX ExecType values)
export type ExecType =
  | "New"           // 0
  | "PartialFill"   // 1
  | "Fill"          // 2
  | "Canceled"      // 4
  | "Replaced"      // 5
  | "Rejected"      // 8
  | "Trade"         // F
  | "OrderStatus";  // I

// Allocation types
export type AllocationType = "ProRata" | "Percent" | "FixedQty" | "AvgPrice";

// Allocation status
export type AllocationStatus = 
  | "Pending"
  | "Accepted"
  | "Rejected"
  | "Confirmed";

// Message direction
export type MessageDirection = "Incoming" | "Outgoing";

// FIX message types (tag 35)
export type FIXMessageType =
  | "D"   // NewOrderSingle
  | "8"   // ExecutionReport
  | "F"   // OrderCancelRequest
  | "G"   // OrderCancelReplaceRequest
  | "J"   // AllocationInstruction
  | "AS"  // AllocationReport
  | "AK"  // Confirmation
  | "P";  // AllocationAck

// ============ SCHEMAS ============

// Session
export interface Session {
  id: string;
  name: string;
  createdAt: number;
  status: "active" | "closed";
}

export interface InsertSession {
  name: string;
}

// Participant
export interface Participant {
  sessionId: string;
  role: ParticipantRole;
  username: string;
  connected: boolean;
  latencyMs: number;
  simulateReject: boolean;
}

// Order
export interface Order {
  id: string;
  clOrdId: string;  // Client Order ID (tag 11)
  sessionId: string;
  symbol: string;    // Tag 55
  side: OrderSide;   // Tag 54
  quantity: number;  // Tag 38
  orderType: OrderType; // Tag 40
  price?: number;    // Tag 44 (optional for Market orders)
  status: OrderStatus;
  createdBy: ParticipantRole;
  timestamp: number;
  avgPx?: number;
  cumQty: number;
  leavesQty: number;
}

export interface InsertOrder {
  clOrdId: string;
  sessionId: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  orderType: OrderType;
  price?: number;
  createdBy: ParticipantRole;
}

// Execution
export interface Execution {
  id: string;
  execId: string;    // Tag 17
  orderId: string;
  sessionId: string;
  execType: ExecType; // Tag 150
  orderStatus: OrderStatus; // Tag 39
  symbol: string;
  side: OrderSide;
  lastQty: number;   // Tag 32
  lastPx: number;    // Tag 31
  cumQty: number;    // Tag 14
  avgPx: number;     // Tag 6
  leavesQty: number; // Tag 151
  timestamp: number;
  createdBy: ParticipantRole;
}

export interface InsertExecution {
  execId: string;
  orderId: string;
  sessionId: string;
  execType: ExecType;
  orderStatus: OrderStatus;
  symbol: string;
  side: OrderSide;
  lastQty: number;
  lastPx: number;
  cumQty: number;
  avgPx: number;
  leavesQty: number;
  createdBy: ParticipantRole;
}

// Allocation Account
export interface AllocationAccount {
  account: string;    // Tag 79
  qty?: number;       // Tag 80 (optional, depends on type)
  percent?: number;   // Percentage (0-100)
  netMoney?: number;  // Tag 118 (computed)
}

// Allocation
export interface Allocation {
  id: string;
  allocId: string;     // Tag 70
  sessionId: string;
  orderId: string;
  allocType: AllocationType;
  accounts: AllocationAccount[];
  status: AllocationStatus;
  avgPx: number;       // Tag 6
  totalQty: number;    // Total quantity allocated
  symbol: string;
  side: OrderSide;
  tradeDate: string;   // Tag 75
  timestamp: number;
  createdBy: ParticipantRole;
}

export interface InsertAllocation {
  allocId: string;
  sessionId: string;
  orderId: string;
  allocType: AllocationType;
  accounts: AllocationAccount[];
  avgPx: number;
  totalQty: number;
  symbol: string;
  side: OrderSide;
  tradeDate: string;
  createdBy: ParticipantRole;
}

// FIX Message
export interface FIXMessage {
  id: string;
  sessionId: string;
  direction: MessageDirection;
  messageType: FIXMessageType;
  rawFix: string;
  parsed: Record<string, any>;
  timestamp: number;
  fromRole: ParticipantRole;
  toRole?: ParticipantRole;
}

export interface InsertFIXMessage {
  sessionId: string;
  direction: MessageDirection;
  messageType: FIXMessageType;
  rawFix: string;
  parsed: Record<string, any>;
  fromRole: ParticipantRole;
  toRole?: ParticipantRole;
}

// ============ VALIDATION SCHEMAS ============

export const insertOrderSchemaValidation = z.object({
  clOrdId: z.string().min(1),
  sessionId: z.string().min(1),
  symbol: z.string().min(1).max(10),
  side: z.enum(["Buy", "Sell"]),
  quantity: z.number().positive(),
  orderType: z.enum(["Market", "Limit", "Stop", "StopLimit"]),
  price: z.number().positive().optional(),
  createdBy: z.enum(["Trader", "Broker", "Custodian"]),
});

export const insertExecutionSchemaValidation = z.object({
  execId: z.string().min(1),
  orderId: z.string().min(1),
  sessionId: z.string().min(1),
  execType: z.enum(["New", "PartialFill", "Fill", "Canceled", "Replaced", "Rejected", "Trade", "OrderStatus"]),
  orderStatus: z.enum(["New", "PartiallyFilled", "Filled", "Canceled", "Rejected", "PendingCancel", "PendingReplace"]),
  symbol: z.string().min(1),
  side: z.enum(["Buy", "Sell"]),
  lastQty: z.number().nonnegative(),
  lastPx: z.number().positive(),
  cumQty: z.number().nonnegative(),
  avgPx: z.number().positive(),
  leavesQty: z.number().nonnegative(),
  createdBy: z.enum(["Trader", "Broker", "Custodian"]),
});

export const insertAllocationSchemaValidation = z.object({
  allocId: z.string().min(1),
  sessionId: z.string().min(1),
  orderId: z.string().min(1),
  allocType: z.enum(["ProRata", "Percent", "FixedQty", "AvgPrice"]),
  accounts: z.array(z.object({
    account: z.string().min(1),
    qty: z.number().nonnegative().optional(),
    percent: z.number().min(0).max(100).optional(),
    netMoney: z.number().optional(),
  })).min(1),
  avgPx: z.number().positive(),
  totalQty: z.number().positive(),
  symbol: z.string().min(1),
  side: z.enum(["Buy", "Sell"]),
  tradeDate: z.string().min(1),
  createdBy: z.enum(["Trader", "Broker", "Custodian"]),
});
