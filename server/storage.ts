import { randomUUID } from "crypto";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and } from "drizzle-orm";
import type {
  User,
  InsertUser,
  Session,
  InsertSession,
  Participant,
  Order,
  InsertOrder,
  Execution,
  InsertExecution,
  Allocation,
  InsertAllocation,
  FIXMessage,
  InsertFIXMessage,
  ParticipantRole,
  OrderStatus,
  AllocationStatus,
} from "@shared/schema";
import {
  users,
  sessions,
  participants,
  orders,
  executions,
  allocations,
  fixMessages,
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Session methods
  getSession(id: string): Promise<Session | undefined>;
  getAllSessions(): Promise<Session[]>;
  createSession(session: InsertSession): Promise<Session>;
  updateSessionStatus(id: string, status: "active" | "closed"): Promise<void>;

  // Participant methods
  addParticipant(participant: Participant): Promise<void>;
  getParticipants(sessionId: string): Promise<Participant[]>;
  updateParticipantConnection(sessionId: string, username: string, connected: boolean): Promise<void>;
  updateParticipantLatency(sessionId: string, username: string, latencyMs: number): Promise<void>;
  updateParticipantReject(sessionId: string, username: string, simulateReject: boolean): Promise<void>;

  // Order methods
  createOrder(order: InsertOrder): Promise<Order>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrderByClOrdId(sessionId: string, clOrdId: string): Promise<Order | undefined>;
  getOrdersBySession(sessionId: string): Promise<Order[]>;
  updateOrderStatus(id: string, status: OrderStatus, cumQty: number, avgPx?: number): Promise<void>;
  updateOrderDetails(id: string, quantity: number, price?: number): Promise<void>;

  // Execution methods
  createExecution(execution: InsertExecution): Promise<Execution>;
  getExecution(id: string): Promise<Execution | undefined>;
  getExecutionsBySession(sessionId: string): Promise<Execution[]>;
  getExecutionsByOrder(orderId: string): Promise<Execution[]>;

  // Allocation methods
  createAllocation(allocation: InsertAllocation): Promise<Allocation>;
  getAllocation(id: string): Promise<Allocation | undefined>;
  getAllocationsBySession(sessionId: string): Promise<Allocation[]>;
  updateAllocationStatus(id: string, status: AllocationStatus): Promise<void>;

  // FIX Message methods
  createMessage(message: InsertFIXMessage): Promise<FIXMessage>;
  getMessagesBySession(sessionId: string): Promise<FIXMessage[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private sessions: Map<string, Session>;
  private participants: Map<string, Participant[]>;
  private orders: Map<string, Order>;
  private executions: Map<string, Execution>;
  private allocations: Map<string, Allocation>;
  private messages: Map<string, FIXMessage>;

  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.participants = new Map();
    this.orders = new Map();
    this.executions = new Map();
    this.allocations = new Map();
    this.messages = new Map();
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Session methods
  async getSession(id: string): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async getAllSessions(): Promise<Session[]> {
    return Array.from(this.sessions.values());
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const id = randomUUID();
    const session: Session = {
      ...insertSession,
      id,
      createdAt: Date.now(),
      status: "active",
    };
    this.sessions.set(id, session);
    this.participants.set(id, []);
    return session;
  }

  async updateSessionStatus(id: string, status: "active" | "closed"): Promise<void> {
    const session = this.sessions.get(id);
    if (session) {
      session.status = status;
    }
  }

  // Participant methods
  async addParticipant(participant: Participant): Promise<void> {
    const participants = this.participants.get(participant.sessionId) || [];
    const existing = participants.findIndex(
      (p) => p.username === participant.username && p.role === participant.role
    );
    if (existing >= 0) {
      participants[existing] = participant;
    } else {
      participants.push(participant);
    }
    this.participants.set(participant.sessionId, participants);
  }

  async getParticipants(sessionId: string): Promise<Participant[]> {
    return this.participants.get(sessionId) || [];
  }

  async updateParticipantConnection(
    sessionId: string,
    username: string,
    connected: boolean
  ): Promise<void> {
    const participants = this.participants.get(sessionId) || [];
    const participant = participants.find((p) => p.username === username);
    if (participant) {
      participant.connected = connected;
    }
  }

  async updateParticipantLatency(
    sessionId: string,
    username: string,
    latencyMs: number
  ): Promise<void> {
    const participants = this.participants.get(sessionId) || [];
    const participant = participants.find((p) => p.username === username);
    if (participant) {
      participant.latencyMs = latencyMs;
    }
  }

  async updateParticipantReject(
    sessionId: string,
    username: string,
    simulateReject: boolean
  ): Promise<void> {
    const participants = this.participants.get(sessionId) || [];
    const participant = participants.find((p) => p.username === username);
    if (participant) {
      participant.simulateReject = simulateReject;
    }
  }

  // Order methods
  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = randomUUID();
    const order: Order = {
      ...insertOrder,
      id,
      status: "New",
      timestamp: Date.now(),
      cumQty: 0,
      leavesQty: insertOrder.quantity,
    };
    this.orders.set(id, order);
    return order;
  }

  async getOrder(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getOrderByClOrdId(sessionId: string, clOrdId: string): Promise<Order | undefined> {
    return Array.from(this.orders.values()).find(
      (order) => order.sessionId === sessionId && order.clOrdId === clOrdId
    );
  }

  async getOrdersBySession(sessionId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(
      (order) => order.sessionId === sessionId
    );
  }

  async updateOrderStatus(
    id: string,
    status: OrderStatus,
    cumQty: number,
    avgPx?: number
  ): Promise<void> {
    const order = this.orders.get(id);
    if (order) {
      order.status = status;
      order.cumQty = cumQty;
      order.leavesQty = order.quantity - cumQty;
      if (avgPx !== undefined) {
        order.avgPx = avgPx;
      }
    }
  }

  async updateOrderDetails(
    id: string,
    quantity: number,
    price?: number
  ): Promise<void> {
    const order = this.orders.get(id);
    if (order) {
      order.quantity = quantity;
      order.leavesQty = quantity - order.cumQty;
      if (price !== undefined) {
        order.price = price;
      }
    }
  }

  // Execution methods
  async createExecution(insertExecution: InsertExecution): Promise<Execution> {
    const id = randomUUID();
    const execution: Execution = {
      ...insertExecution,
      id,
      timestamp: Date.now(),
    };
    this.executions.set(id, execution);
    return execution;
  }

  async getExecution(id: string): Promise<Execution | undefined> {
    return this.executions.get(id);
  }

  async getExecutionsBySession(sessionId: string): Promise<Execution[]> {
    return Array.from(this.executions.values()).filter(
      (exec) => exec.sessionId === sessionId
    );
  }

  async getExecutionsByOrder(orderId: string): Promise<Execution[]> {
    return Array.from(this.executions.values()).filter(
      (exec) => exec.orderId === orderId
    );
  }

  // Allocation methods
  async createAllocation(insertAllocation: InsertAllocation): Promise<Allocation> {
    const id = randomUUID();
    const allocation: Allocation = {
      ...insertAllocation,
      id,
      status: "Pending",
      timestamp: Date.now(),
    };
    this.allocations.set(id, allocation);
    return allocation;
  }

  async getAllocation(id: string): Promise<Allocation | undefined> {
    return this.allocations.get(id);
  }

  async getAllocationsBySession(sessionId: string): Promise<Allocation[]> {
    return Array.from(this.allocations.values()).filter(
      (alloc) => alloc.sessionId === sessionId
    );
  }

  async updateAllocationStatus(id: string, status: AllocationStatus): Promise<void> {
    const allocation = this.allocations.get(id);
    if (allocation) {
      allocation.status = status;
    }
  }

  // FIX Message methods
  async createMessage(insertMessage: InsertFIXMessage): Promise<FIXMessage> {
    const id = randomUUID();
    const message: FIXMessage = {
      ...insertMessage,
      id,
      timestamp: Date.now(),
    };
    this.messages.set(id, message);
    return message;
  }

  async getMessagesBySession(sessionId: string): Promise<FIXMessage[]> {
    return Array.from(this.messages.values()).filter(
      (msg) => msg.sessionId === sessionId
    );
  }
}

// Database Storage implementation using Drizzle + PostgreSQL
export class DbStorage implements IStorage {
  private db;

  constructor() {
    const sql = neon(process.env.DATABASE_URL!);
    this.db = drizzle(sql);
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Session methods
  async getSession(id: string): Promise<Session | undefined> {
    const result = await this.db.select().from(sessions).where(eq(sessions.id, id));
    if (!result[0]) return undefined;
    const row = result[0];
    return {
      id: row.id,
      name: row.name,
      createdAt: row.createdAt.getTime(),
      status: row.status as "active" | "closed",
    };
  }

  async getAllSessions(): Promise<Session[]> {
    const result = await this.db.select().from(sessions);
    return result.map(row => ({
      id: row.id,
      name: row.name,
      createdAt: row.createdAt.getTime(),
      status: row.status as "active" | "closed",
    }));
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const result = await this.db.insert(sessions).values(insertSession).returning();
    const row = result[0];
    return {
      id: row.id,
      name: row.name,
      createdAt: row.createdAt.getTime(),
      status: row.status as "active" | "closed",
    };
  }

  async updateSessionStatus(id: string, status: "active" | "closed"): Promise<void> {
    await this.db.update(sessions).set({ status }).where(eq(sessions.id, id));
  }

  // Participant methods
  async addParticipant(participant: Participant): Promise<void> {
    await this.db.insert(participants).values({
      sessionId: participant.sessionId,
      role: participant.role,
      username: participant.username,
      connected: participant.connected,
      latencyMs: participant.latencyMs,
      simulateReject: participant.simulateReject,
    }).onConflictDoUpdate({
      target: [participants.sessionId, participants.role, participants.username],
      set: {
        connected: participant.connected,
        latencyMs: participant.latencyMs,
        simulateReject: participant.simulateReject,
      },
    });
  }

  async getParticipants(sessionId: string): Promise<Participant[]> {
    const result = await this.db.select().from(participants).where(eq(participants.sessionId, sessionId));
    return result.map(row => ({
      sessionId: row.sessionId,
      role: row.role as ParticipantRole,
      username: row.username,
      connected: row.connected,
      latencyMs: row.latencyMs,
      simulateReject: row.simulateReject,
    }));
  }

  async updateParticipantConnection(sessionId: string, username: string, connected: boolean): Promise<void> {
    await this.db.update(participants)
      .set({ connected })
      .where(and(eq(participants.sessionId, sessionId), eq(participants.username, username)));
  }

  async updateParticipantLatency(sessionId: string, username: string, latencyMs: number): Promise<void> {
    await this.db.update(participants)
      .set({ latencyMs })
      .where(and(eq(participants.sessionId, sessionId), eq(participants.username, username)));
  }

  async updateParticipantReject(sessionId: string, username: string, simulateReject: boolean): Promise<void> {
    await this.db.update(participants)
      .set({ simulateReject })
      .where(and(eq(participants.sessionId, sessionId), eq(participants.username, username)));
  }

  // Order methods
  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const result = await this.db.insert(orders).values({
      ...insertOrder,
      status: "New",
      cumQty: 0,
      leavesQty: insertOrder.quantity,
    }).returning();
    const row = result[0];
    return {
      id: row.id,
      clOrdId: row.clOrdId,
      sessionId: row.sessionId,
      symbol: row.symbol,
      side: row.side as Order["side"],
      quantity: row.quantity,
      orderType: row.orderType as Order["orderType"],
      price: row.price ?? undefined,
      status: row.status as OrderStatus,
      createdBy: row.createdBy as ParticipantRole,
      timestamp: row.timestamp.getTime(),
      avgPx: row.avgPx ?? undefined,
      cumQty: row.cumQty,
      leavesQty: row.leavesQty,
    };
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const result = await this.db.select().from(orders).where(eq(orders.id, id));
    if (!result[0]) return undefined;
    const row = result[0];
    return {
      id: row.id,
      clOrdId: row.clOrdId,
      sessionId: row.sessionId,
      symbol: row.symbol,
      side: row.side as Order["side"],
      quantity: row.quantity,
      orderType: row.orderType as Order["orderType"],
      price: row.price ?? undefined,
      status: row.status as OrderStatus,
      createdBy: row.createdBy as ParticipantRole,
      timestamp: row.timestamp.getTime(),
      avgPx: row.avgPx ?? undefined,
      cumQty: row.cumQty,
      leavesQty: row.leavesQty,
    };
  }

  async getOrderByClOrdId(sessionId: string, clOrdId: string): Promise<Order | undefined> {
    const result = await this.db.select().from(orders)
      .where(and(eq(orders.sessionId, sessionId), eq(orders.clOrdId, clOrdId)));
    if (!result[0]) return undefined;
    const row = result[0];
    return {
      id: row.id,
      clOrdId: row.clOrdId,
      sessionId: row.sessionId,
      symbol: row.symbol,
      side: row.side as Order["side"],
      quantity: row.quantity,
      orderType: row.orderType as Order["orderType"],
      price: row.price ?? undefined,
      status: row.status as OrderStatus,
      createdBy: row.createdBy as ParticipantRole,
      timestamp: row.timestamp.getTime(),
      avgPx: row.avgPx ?? undefined,
      cumQty: row.cumQty,
      leavesQty: row.leavesQty,
    };
  }

  async getOrdersBySession(sessionId: string): Promise<Order[]> {
    const result = await this.db.select().from(orders).where(eq(orders.sessionId, sessionId));
    return result.map(row => ({
      id: row.id,
      clOrdId: row.clOrdId,
      sessionId: row.sessionId,
      symbol: row.symbol,
      side: row.side as Order["side"],
      quantity: row.quantity,
      orderType: row.orderType as Order["orderType"],
      price: row.price ?? undefined,
      status: row.status as OrderStatus,
      createdBy: row.createdBy as ParticipantRole,
      timestamp: row.timestamp.getTime(),
      avgPx: row.avgPx ?? undefined,
      cumQty: row.cumQty,
      leavesQty: row.leavesQty,
    }));
  }

  async updateOrderStatus(id: string, status: OrderStatus, cumQty: number, avgPx?: number): Promise<void> {
    const order = await this.getOrder(id);
    if (!order) return;
    await this.db.update(orders).set({
      status,
      cumQty,
      leavesQty: order.quantity - cumQty,
      avgPx,
    }).where(eq(orders.id, id));
  }

  async updateOrderDetails(id: string, quantity: number, price?: number): Promise<void> {
    const order = await this.getOrder(id);
    if (!order) return;
    await this.db.update(orders).set({
      quantity,
      leavesQty: quantity - order.cumQty,
      price,
    }).where(eq(orders.id, id));
  }

  // Execution methods
  async createExecution(insertExecution: InsertExecution): Promise<Execution> {
    const result = await this.db.insert(executions).values(insertExecution).returning();
    const row = result[0];
    return {
      id: row.id,
      execId: row.execId,
      orderId: row.orderId,
      sessionId: row.sessionId,
      execType: row.execType as Execution["execType"],
      orderStatus: row.orderStatus as OrderStatus,
      symbol: row.symbol,
      side: row.side as Execution["side"],
      lastQty: row.lastQty,
      lastPx: row.lastPx,
      cumQty: row.cumQty,
      avgPx: row.avgPx,
      leavesQty: row.leavesQty,
      timestamp: row.timestamp.getTime(),
      createdBy: row.createdBy as ParticipantRole,
    };
  }

  async getExecution(id: string): Promise<Execution | undefined> {
    const result = await this.db.select().from(executions).where(eq(executions.id, id));
    if (!result[0]) return undefined;
    const row = result[0];
    return {
      id: row.id,
      execId: row.execId,
      orderId: row.orderId,
      sessionId: row.sessionId,
      execType: row.execType as Execution["execType"],
      orderStatus: row.orderStatus as OrderStatus,
      symbol: row.symbol,
      side: row.side as Execution["side"],
      lastQty: row.lastQty,
      lastPx: row.lastPx,
      cumQty: row.cumQty,
      avgPx: row.avgPx,
      leavesQty: row.leavesQty,
      timestamp: row.timestamp.getTime(),
      createdBy: row.createdBy as ParticipantRole,
    };
  }

  async getExecutionsBySession(sessionId: string): Promise<Execution[]> {
    const result = await this.db.select().from(executions).where(eq(executions.sessionId, sessionId));
    return result.map(row => ({
      id: row.id,
      execId: row.execId,
      orderId: row.orderId,
      sessionId: row.sessionId,
      execType: row.execType as Execution["execType"],
      orderStatus: row.orderStatus as OrderStatus,
      symbol: row.symbol,
      side: row.side as Execution["side"],
      lastQty: row.lastQty,
      lastPx: row.lastPx,
      cumQty: row.cumQty,
      avgPx: row.avgPx,
      leavesQty: row.leavesQty,
      timestamp: row.timestamp.getTime(),
      createdBy: row.createdBy as ParticipantRole,
    }));
  }

  async getExecutionsByOrder(orderId: string): Promise<Execution[]> {
    const result = await this.db.select().from(executions).where(eq(executions.orderId, orderId));
    return result.map(row => ({
      id: row.id,
      execId: row.execId,
      orderId: row.orderId,
      sessionId: row.sessionId,
      execType: row.execType as Execution["execType"],
      orderStatus: row.orderStatus as OrderStatus,
      symbol: row.symbol,
      side: row.side as Execution["side"],
      lastQty: row.lastQty,
      lastPx: row.lastPx,
      cumQty: row.cumQty,
      avgPx: row.avgPx,
      leavesQty: row.leavesQty,
      timestamp: row.timestamp.getTime(),
      createdBy: row.createdBy as ParticipantRole,
    }));
  }

  // Allocation methods
  async createAllocation(insertAllocation: InsertAllocation): Promise<Allocation> {
    const result = await this.db.insert(allocations).values({
      ...insertAllocation,
      accounts: JSON.stringify(insertAllocation.accounts),
      status: "Pending",
    }).returning();
    const row = result[0];
    return {
      id: row.id,
      allocId: row.allocId,
      sessionId: row.sessionId,
      orderId: row.orderId,
      allocType: row.allocType as Allocation["allocType"],
      accounts: JSON.parse(row.accounts),
      status: row.status as AllocationStatus,
      avgPx: row.avgPx,
      totalQty: row.totalQty,
      symbol: row.symbol,
      side: row.side as Allocation["side"],
      tradeDate: row.tradeDate,
      timestamp: row.timestamp.getTime(),
      createdBy: row.createdBy as ParticipantRole,
    };
  }

  async getAllocation(id: string): Promise<Allocation | undefined> {
    const result = await this.db.select().from(allocations).where(eq(allocations.id, id));
    if (!result[0]) return undefined;
    const row = result[0];
    return {
      id: row.id,
      allocId: row.allocId,
      sessionId: row.sessionId,
      orderId: row.orderId,
      allocType: row.allocType as Allocation["allocType"],
      accounts: JSON.parse(row.accounts),
      status: row.status as AllocationStatus,
      avgPx: row.avgPx,
      totalQty: row.totalQty,
      symbol: row.symbol,
      side: row.side as Allocation["side"],
      tradeDate: row.tradeDate,
      timestamp: row.timestamp.getTime(),
      createdBy: row.createdBy as ParticipantRole,
    };
  }

  async getAllocationsBySession(sessionId: string): Promise<Allocation[]> {
    const result = await this.db.select().from(allocations).where(eq(allocations.sessionId, sessionId));
    return result.map(row => ({
      id: row.id,
      allocId: row.allocId,
      sessionId: row.sessionId,
      orderId: row.orderId,
      allocType: row.allocType as Allocation["allocType"],
      accounts: JSON.parse(row.accounts),
      status: row.status as AllocationStatus,
      avgPx: row.avgPx,
      totalQty: row.totalQty,
      symbol: row.symbol,
      side: row.side as Allocation["side"],
      tradeDate: row.tradeDate,
      timestamp: row.timestamp.getTime(),
      createdBy: row.createdBy as ParticipantRole,
    }));
  }

  async updateAllocationStatus(id: string, status: AllocationStatus): Promise<void> {
    await this.db.update(allocations).set({ status }).where(eq(allocations.id, id));
  }

  // FIX Message methods
  async createMessage(insertMessage: InsertFIXMessage): Promise<FIXMessage> {
    const result = await this.db.insert(fixMessages).values({
      ...insertMessage,
      parsed: JSON.stringify(insertMessage.parsed),
    }).returning();
    const row = result[0];
    return {
      id: row.id,
      sessionId: row.sessionId,
      direction: row.direction as FIXMessage["direction"],
      messageType: row.messageType as FIXMessage["messageType"],
      rawFix: row.rawFix,
      parsed: JSON.parse(row.parsed),
      timestamp: row.timestamp.getTime(),
      fromRole: row.fromRole as ParticipantRole,
      toRole: row.toRole as ParticipantRole | undefined,
    };
  }

  async getMessagesBySession(sessionId: string): Promise<FIXMessage[]> {
    const result = await this.db.select().from(fixMessages).where(eq(fixMessages.sessionId, sessionId));
    return result.map(row => ({
      id: row.id,
      sessionId: row.sessionId,
      direction: row.direction as FIXMessage["direction"],
      messageType: row.messageType as FIXMessage["messageType"],
      rawFix: row.rawFix,
      parsed: JSON.parse(row.parsed),
      timestamp: row.timestamp.getTime(),
      fromRole: row.fromRole as ParticipantRole,
      toRole: row.toRole as ParticipantRole | undefined,
    }));
  }
}

// Use DbStorage by default
export const storage = new DbStorage();
