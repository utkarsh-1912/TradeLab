import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, boolean, primaryKey } from "drizzle-orm/pg-core";
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

// Sessions
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
});

// Participants
export const participants = pgTable("participants", {
  sessionId: varchar("session_id").notNull().references(() => sessions.id),
  role: varchar("role", { length: 20 }).notNull(),
  username: text("username").notNull(),
  connected: boolean("connected").notNull().default(true),
  latencyMs: integer("latency_ms").notNull().default(0),
  simulateReject: boolean("simulate_reject").notNull().default(false),
}, (table) => ({
  pk: primaryKey({ columns: [table.sessionId, table.role, table.username] }),
}));

// Orders
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clOrdId: text("cl_ord_id").notNull(),
  sessionId: varchar("session_id").notNull().references(() => sessions.id),
  symbol: text("symbol").notNull(),
  side: varchar("side", { length: 10 }).notNull(),
  quantity: integer("quantity").notNull(),
  orderType: varchar("order_type", { length: 20 }).notNull(),
  price: real("price"),
  status: varchar("status", { length: 20 }).notNull().default("New"),
  createdBy: varchar("created_by", { length: 20 }).notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  avgPx: real("avg_px"),
  cumQty: integer("cum_qty").notNull().default(0),
  leavesQty: integer("leaves_qty").notNull(),
});

// Executions
export const executions = pgTable("executions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  execId: text("exec_id").notNull(),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  sessionId: varchar("session_id").notNull().references(() => sessions.id),
  execType: varchar("exec_type", { length: 20 }).notNull(),
  orderStatus: varchar("order_status", { length: 20 }).notNull(),
  symbol: text("symbol").notNull(),
  side: varchar("side", { length: 10 }).notNull(),
  lastQty: integer("last_qty").notNull(),
  lastPx: real("last_px").notNull(),
  cumQty: integer("cum_qty").notNull(),
  avgPx: real("avg_px").notNull(),
  leavesQty: integer("leaves_qty").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  createdBy: varchar("created_by", { length: 20 }).notNull(),
});

// Allocations
export const allocations = pgTable("allocations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  allocId: text("alloc_id").notNull(),
  sessionId: varchar("session_id").notNull().references(() => sessions.id),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  allocType: varchar("alloc_type", { length: 20 }).notNull(),
  accounts: text("accounts").notNull(), // JSON string
  status: varchar("status", { length: 20 }).notNull().default("Pending"),
  avgPx: real("avg_px").notNull(),
  totalQty: integer("total_qty").notNull(),
  symbol: text("symbol").notNull(),
  side: varchar("side", { length: 10 }).notNull(),
  tradeDate: text("trade_date").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  createdBy: varchar("created_by", { length: 20 }).notNull(),
});

// FIX Messages
export const fixMessages = pgTable("fix_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sessions.id),
  direction: varchar("direction", { length: 20 }).notNull(),
  messageType: varchar("message_type", { length: 5 }).notNull(),
  rawFix: text("raw_fix").notNull(),
  parsed: text("parsed").notNull(), // JSON string
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  fromRole: varchar("from_role", { length: 20 }).notNull(),
  toRole: varchar("to_role", { length: 20 }),
});

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

// Order Cancel Request
export interface OrderCancelRequest {
  origClOrdId: string;  // Tag 41 - Original Client Order ID
  clOrdId: string;      // Tag 11 - New Client Order ID for this request
  orderId: string;
  sessionId: string;
  symbol: string;       // Tag 55
  side: OrderSide;      // Tag 54
  createdBy: ParticipantRole;
}

export const orderCancelRequestValidation = z.object({
  origClOrdId: z.string().min(1),
  clOrdId: z.string().min(1),
  orderId: z.string().min(1),
  sessionId: z.string().min(1),
  symbol: z.string().min(1),
  side: z.enum(["Buy", "Sell"]),
  createdBy: z.enum(["Trader", "Broker", "Custodian"]),
});

// Order Cancel/Replace Request
export interface OrderReplaceRequest {
  origClOrdId: string;  // Tag 41 - Original Client Order ID
  clOrdId: string;      // Tag 11 - New Client Order ID for this request
  orderId: string;
  sessionId: string;
  symbol: string;       // Tag 55
  side: OrderSide;      // Tag 54
  quantity: number;     // Tag 38 - New quantity
  orderType: OrderType; // Tag 40
  price?: number;       // Tag 44 - New price
  createdBy: ParticipantRole;
}

export const orderReplaceRequestValidation = z.object({
  origClOrdId: z.string().min(1),
  clOrdId: z.string().min(1),
  orderId: z.string().min(1),
  sessionId: z.string().min(1),
  symbol: z.string().min(1),
  side: z.enum(["Buy", "Sell"]),
  quantity: z.number().positive(),
  orderType: z.enum(["Market", "Limit", "Stop", "StopLimit"]),
  price: z.number().positive().optional(),
  createdBy: z.enum(["Trader", "Broker", "Custodian"]),
});
