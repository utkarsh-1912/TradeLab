import { randomUUID } from "crypto";
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

export const storage = new MemStorage();
