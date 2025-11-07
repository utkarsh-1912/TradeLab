import type {
  Session,
  Order,
  Execution,
  Allocation,
  FIXMessage,
  ParticipantRole,
  AllocationType,
  AllocationAccount,
} from "@shared/schema";

export type WSEventType =
  | "session.joined"
  | "order.created"
  | "order.updated"
  | "execution.created"
  | "allocation.created"
  | "allocation.updated"
  | "message.new"
  | "participant.joined"
  | "participant.left"
  | "error";

export type WSEventHandler = (data: any) => void;

export class WSClient {
  private ws: WebSocket | null = null;
  private handlers: Map<WSEventType, Set<WSEventHandler>> = new Map();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(sessionId: string, role: ParticipantRole, username: string, sessionName?: string) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      
      // Send join message
      this.send({
        type: 'join',
        sessionId,
        sessionName,
        role,
        username,
      });
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.emit(message.type, message.data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.attemptReconnect(sessionId, role, username, sessionName);
    };
  }

  private attemptReconnect(sessionId: string, role: ParticipantRole, username: string, sessionName?: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      this.reconnectTimeout = setTimeout(() => {
        this.connect(sessionId, role, username, sessionName);
      }, delay);
    }
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }

  on(event: WSEventType, handler: WSEventHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  off(event: WSEventType, handler: WSEventHandler) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private emit(event: WSEventType, data: any) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.handlers.clear();
  }

  // Convenience methods for sending specific messages
  sendNewOrder(data: {
    symbol: string;
    side: "Buy" | "Sell";
    quantity: number;
    orderType: string;
    price?: number;
  }) {
    this.send({ type: 'order.new', data });
  }

  sendFillOrder(data: {
    orderId: string;
    fillQty: number;
    fillPx: number;
  }) {
    this.send({ type: 'execution.fill', data });
  }

  sendRejectOrder(data: { orderId: string }) {
    this.send({ type: 'execution.reject', data });
  }

  sendAllocationInstruction(data: {
    orderId: string;
    allocType: AllocationType;
    accounts: AllocationAccount[];
  }) {
    this.send({ type: 'allocation.instruction', data });
  }

  sendAllocationResponse(data: {
    allocId: string;
    accept: boolean;
  }) {
    this.send({ type: 'allocation.response', data });
  }

  sendAllocationConfirm(data: { allocId: string }) {
    this.send({ type: 'allocation.confirm', data });
  }

  updateLatency(latencyMs: number) {
    this.send({ type: 'control.latency', latencyMs });
  }

  updateRejectSimulation(simulateReject: boolean) {
    this.send({ type: 'control.reject', simulateReject });
  }
}

export const wsClient = new WSClient();
