import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { AllocationEngine } from "./allocationEngine";
import { validateFIXMessage, tagsToFIXString, parseFIXString } from "./fixValidation";
import { randomUUID } from "crypto";
import type {
  ParticipantRole,
  FIXMessageType,
  OrderSide,
  OrderType,
  AllocationType,
  AllocationAccount,
} from "@shared/schema";

interface WSClient {
  ws: WebSocket;
  sessionId: string;
  role: ParticipantRole;
  username: string;
}

const clients = new Map<string, WSClient>();

export async function registerRoutes(app: Express): Promise<Server> {
  // REST API Routes

  // Get all sessions
  app.get("/api/sessions", async (req, res) => {
    const sessions = await storage.getAllSessions();
    res.json(sessions);
  });

  // Create a new session
  app.post("/api/sessions", async (req, res) => {
    try {
      const { name } = req.body;
      const session = await storage.createSession({ name });
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  // Get session by ID
  app.get("/api/sessions/:id", async (req, res) => {
    const session = await storage.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    res.json(session);
  });

  // Get messages for a session
  app.get("/api/sessions/:id/messages", async (req, res) => {
    const messages = await storage.getMessagesBySession(req.params.id);
    res.json(messages);
  });

  // Get orders for a session
  app.get("/api/sessions/:id/orders", async (req, res) => {
    const orders = await storage.getOrdersBySession(req.params.id);
    res.json(orders);
  });

  // Get executions for a session
  app.get("/api/sessions/:id/executions", async (req, res) => {
    const executions = await storage.getExecutionsBySession(req.params.id);
    res.json(executions);
  });

  // Get allocations for a session
  app.get("/api/sessions/:id/allocations", async (req, res) => {
    const allocations = await storage.getAllocationsBySession(req.params.id);
    res.json(allocations);
  });

  const httpServer = createServer(app);

  // WebSocket Server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    const clientId = randomUUID();
    let client: WSClient | null = null;

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Handle join event
        if (message.type === 'join') {
          const { sessionId: clientSessionId, sessionName, role, username } = message;
          
          // Get session - it should already exist from landing page
          let session = await storage.getSession(clientSessionId);
          if (!session) {
            // Fallback: create session with the provided name or use sessionId
            const name = sessionName || `Session-${clientSessionId.slice(0, 8)}`;
            session = await storage.createSession({ name });
          }

          // Use the actual session ID from the database
          const sessionId = session.id;

          // Add participant
          await storage.addParticipant({
            sessionId,
            role,
            username,
            connected: true,
            latencyMs: 0,
            simulateReject: false,
          });

          client = { ws, sessionId, role, username };
          clients.set(clientId, client);

          // Send session data
          const orders = await storage.getOrdersBySession(sessionId);
          const executions = await storage.getExecutionsBySession(sessionId);
          const allocations = await storage.getAllocationsBySession(sessionId);
          const messages = await storage.getMessagesBySession(sessionId);

          ws.send(JSON.stringify({
            type: 'session.joined',
            data: { session, orders, executions, allocations, messages }
          }));

          // Notify other clients
          broadcast(sessionId, {
            type: 'participant.joined',
            data: { role, username }
          }, clientId);
        }

        // Handle latency update
        if (message.type === 'control.latency' && client) {
          await storage.updateParticipantLatency(
            client.sessionId,
            client.username,
            message.latencyMs
          );
        }

        // Handle reject simulation toggle
        if (message.type === 'control.reject' && client) {
          await storage.updateParticipantReject(
            client.sessionId,
            client.username,
            message.simulateReject
          );
        }

        // Handle new order
        if (message.type === 'order.new' && client) {
          const { symbol, side, quantity, orderType, price } = message.data;
          const clOrdId = `ORD-${Date.now()}-${randomUUID().slice(0, 8)}`;

          const order = await storage.createOrder({
            clOrdId,
            sessionId: client.sessionId,
            symbol,
            side,
            quantity,
            orderType,
            price,
            createdBy: client.role,
          });

          // Create FIX message
          const fixTags = {
            "11": clOrdId,
            "55": symbol,
            "54": side === "Buy" ? "1" : "2",
            "38": quantity.toString(),
            "40": orderType === "Market" ? "1" : orderType === "Limit" ? "2" : "3",
            "60": new Date().toISOString(),
          };

          if (price) {
            fixTags["44"] = price.toString();
          }

          const rawFix = tagsToFIXString("D", fixTags);
          const validation = validateFIXMessage("D", fixTags);

          if (validation.valid) {
            await storage.createMessage({
              sessionId: client.sessionId,
              direction: "Outgoing",
              messageType: "D",
              rawFix,
              parsed: fixTags,
              fromRole: client.role,
              toRole: "Broker",
            });

            // Apply latency
            const participants = await storage.getParticipants(client.sessionId);
            const senderLatency = participants.find(p => p.username === client.username)?.latencyMs || 0;

            setTimeout(() => {
              // Send to all clients in session
              broadcast(client!.sessionId, {
                type: 'order.created',
                data: order
              });

              broadcast(client!.sessionId, {
                type: 'message.new',
                data: { direction: "Incoming", messageType: "D", rawFix, parsed: fixTags, fromRole: client!.role }
              });
            }, senderLatency);
          }
        }

        // Handle execution (broker fills order)
        if (message.type === 'execution.fill' && client) {
          const { orderId, fillQty, fillPx } = message.data;
          const order = await storage.getOrder(orderId);
          
          if (!order) {
            ws.send(JSON.stringify({ type: 'error', message: 'Order not found' }));
            return;
          }

          const execId = `EXEC-${Date.now()}-${randomUUID().slice(0, 8)}`;
          const newCumQty = order.cumQty + fillQty;
          const newAvgPx = order.cumQty === 0
            ? fillPx
            : ((order.cumQty * (order.avgPx || 0)) + (fillQty * fillPx)) / newCumQty;

          const isFilled = newCumQty >= order.quantity;
          const execType = isFilled ? "Fill" : "PartialFill";
          const orderStatus = isFilled ? "Filled" : "PartiallyFilled";

          const execution = await storage.createExecution({
            execId,
            orderId: order.id,
            sessionId: client.sessionId,
            execType,
            orderStatus,
            symbol: order.symbol,
            side: order.side,
            lastQty: fillQty,
            lastPx: fillPx,
            cumQty: newCumQty,
            avgPx: newAvgPx,
            leavesQty: order.quantity - newCumQty,
            createdBy: client.role,
          });

          await storage.updateOrderStatus(orderId, orderStatus, newCumQty, newAvgPx);

          // Create FIX message
          const fixTags = {
            "11": order.clOrdId,
            "17": execId,
            "150": execType === "Fill" ? "2" : "1",
            "39": isFilled ? "2" : "1",
            "55": order.symbol,
            "54": order.side === "Buy" ? "1" : "2",
            "32": fillQty.toString(),
            "31": fillPx.toString(),
            "151": (order.quantity - newCumQty).toString(),
            "14": newCumQty.toString(),
            "6": newAvgPx.toString(),
          };

          const rawFix = tagsToFIXString("8", fixTags);

          await storage.createMessage({
            sessionId: client.sessionId,
            direction: "Outgoing",
            messageType: "8",
            rawFix,
            parsed: fixTags,
            fromRole: client.role,
            toRole: "Trader",
          });

          broadcast(client.sessionId, {
            type: 'execution.created',
            data: execution
          });

          broadcast(client.sessionId, {
            type: 'order.updated',
            data: await storage.getOrder(orderId)
          });

          broadcast(client.sessionId, {
            type: 'message.new',
            data: { direction: "Incoming", messageType: "8", rawFix, parsed: fixTags, fromRole: client.role }
          });
        }

        // Handle order rejection
        if (message.type === 'execution.reject' && client) {
          const { orderId } = message.data;
          const order = await storage.getOrder(orderId);
          
          if (!order) {
            ws.send(JSON.stringify({ type: 'error', message: 'Order not found' }));
            return;
          }

          const execId = `EXEC-${Date.now()}-${randomUUID().slice(0, 8)}`;

          const execution = await storage.createExecution({
            execId,
            orderId: order.id,
            sessionId: client.sessionId,
            execType: "Rejected",
            orderStatus: "Rejected",
            symbol: order.symbol,
            side: order.side,
            lastQty: 0,
            lastPx: 0,
            cumQty: order.cumQty,
            avgPx: order.avgPx || 0,
            leavesQty: 0,
            createdBy: client.role,
          });

          await storage.updateOrderStatus(orderId, "Rejected", order.cumQty, order.avgPx);

          const fixTags = {
            "11": order.clOrdId,
            "17": execId,
            "150": "8",
            "39": "8",
            "55": order.symbol,
            "54": order.side === "Buy" ? "1" : "2",
            "32": "0",
            "31": "0",
            "151": "0",
            "14": order.cumQty.toString(),
            "6": (order.avgPx || 0).toString(),
          };

          const rawFix = tagsToFIXString("8", fixTags);

          await storage.createMessage({
            sessionId: client.sessionId,
            direction: "Outgoing",
            messageType: "8",
            rawFix,
            parsed: fixTags,
            fromRole: client.role,
            toRole: "Trader",
          });

          broadcast(client.sessionId, {
            type: 'execution.created',
            data: execution
          });

          broadcast(client.sessionId, {
            type: 'order.updated',
            data: await storage.getOrder(orderId)
          });

          broadcast(client.sessionId, {
            type: 'message.new',
            data: { direction: "Incoming", messageType: "8", rawFix, parsed: fixTags, fromRole: client.role }
          });
        }

        // Handle order cancel request
        if (message.type === 'order.cancel' && client) {
          const { orderId } = message.data;
          const order = await storage.getOrder(orderId);
          
          if (!order) {
            ws.send(JSON.stringify({ type: 'error', message: 'Order not found' }));
            return;
          }

          // Update order status to PendingCancel
          await storage.updateOrderStatus(orderId, "PendingCancel", order.cumQty, order.avgPx);

          const newClOrdId = `CXLREQ-${Date.now()}-${randomUUID().slice(0, 8)}`;

          // Create FIX Cancel Request message
          const fixTags = {
            "11": newClOrdId,
            "41": order.clOrdId,
            "55": order.symbol,
            "54": order.side === "Buy" ? "1" : "2",
            "60": new Date().toISOString(),
          };

          const rawFix = tagsToFIXString("F", fixTags);

          await storage.createMessage({
            sessionId: client.sessionId,
            direction: "Outgoing",
            messageType: "F",
            rawFix,
            parsed: fixTags,
            fromRole: client.role,
            toRole: "Broker",
          });

          broadcast(client.sessionId, {
            type: 'order.cancel.pending',
            data: await storage.getOrder(orderId)
          });

          broadcast(client.sessionId, {
            type: 'message.new',
            data: { direction: "Incoming", messageType: "F", rawFix, parsed: fixTags, fromRole: client.role }
          });
        }

        // Handle cancel accept (broker accepts cancel)
        if (message.type === 'order.cancel.accept' && client) {
          const { orderId } = message.data;
          const order = await storage.getOrder(orderId);
          
          if (!order) {
            ws.send(JSON.stringify({ type: 'error', message: 'Order not found' }));
            return;
          }

          const execId = `EXEC-${Date.now()}-${randomUUID().slice(0, 8)}`;

          const execution = await storage.createExecution({
            execId,
            orderId: order.id,
            sessionId: client.sessionId,
            execType: "Canceled",
            orderStatus: "Canceled",
            symbol: order.symbol,
            side: order.side,
            lastQty: 0,
            lastPx: 0,
            cumQty: order.cumQty,
            avgPx: order.avgPx || 0,
            leavesQty: 0,
            createdBy: client.role,
          });

          await storage.updateOrderStatus(orderId, "Canceled", order.cumQty, order.avgPx);

          const fixTags = {
            "11": order.clOrdId,
            "17": execId,
            "150": "4",  // ExecType: Canceled
            "39": "4",   // OrdStatus: Canceled
            "55": order.symbol,
            "54": order.side === "Buy" ? "1" : "2",
            "32": "0",
            "31": "0",
            "151": "0",
            "14": order.cumQty.toString(),
            "6": (order.avgPx || 0).toString(),
          };

          const rawFix = tagsToFIXString("8", fixTags);

          await storage.createMessage({
            sessionId: client.sessionId,
            direction: "Outgoing",
            messageType: "8",
            rawFix,
            parsed: fixTags,
            fromRole: client.role,
            toRole: "Trader",
          });

          broadcast(client.sessionId, {
            type: 'execution.created',
            data: execution
          });

          broadcast(client.sessionId, {
            type: 'order.updated',
            data: await storage.getOrder(orderId)
          });

          broadcast(client.sessionId, {
            type: 'message.new',
            data: { direction: "Incoming", messageType: "8", rawFix, parsed: fixTags, fromRole: client.role }
          });
        }

        // Handle order replace request
        if (message.type === 'order.replace' && client) {
          const { orderId, quantity, price } = message.data;
          const order = await storage.getOrder(orderId);
          
          if (!order) {
            ws.send(JSON.stringify({ type: 'error', message: 'Order not found' }));
            return;
          }

          // Update order status to PendingReplace
          await storage.updateOrderStatus(orderId, "PendingReplace", order.cumQty, order.avgPx);

          const newClOrdId = `RPLREQ-${Date.now()}-${randomUUID().slice(0, 8)}`;

          // Create FIX Replace Request message
          const fixTags = {
            "11": newClOrdId,
            "41": order.clOrdId,
            "55": order.symbol,
            "54": order.side === "Buy" ? "1" : "2",
            "38": quantity.toString(),
            "40": order.orderType === "Market" ? "1" : order.orderType === "Limit" ? "2" : "3",
            "60": new Date().toISOString(),
          };

          if (price !== undefined) {
            fixTags["44"] = price.toString();
          }

          const rawFix = tagsToFIXString("G", fixTags);

          await storage.createMessage({
            sessionId: client.sessionId,
            direction: "Outgoing",
            messageType: "G",
            rawFix,
            parsed: fixTags,
            fromRole: client.role,
            toRole: "Broker",
          });

          broadcast(client.sessionId, {
            type: 'order.replace.pending',
            data: { order: await storage.getOrder(orderId), newQuantity: quantity, newPrice: price }
          });

          broadcast(client.sessionId, {
            type: 'message.new',
            data: { direction: "Incoming", messageType: "G", rawFix, parsed: fixTags, fromRole: client.role }
          });
        }

        // Handle replace accept (broker accepts replace)
        if (message.type === 'order.replace.accept' && client) {
          const { orderId, quantity, price } = message.data;
          const order = await storage.getOrder(orderId);
          
          if (!order) {
            ws.send(JSON.stringify({ type: 'error', message: 'Order not found' }));
            return;
          }

          // Update order details
          await storage.updateOrderDetails(orderId, quantity, price);
          await storage.updateOrderStatus(orderId, "New", order.cumQty, order.avgPx);

          const execId = `EXEC-${Date.now()}-${randomUUID().slice(0, 8)}`;

          const execution = await storage.createExecution({
            execId,
            orderId: order.id,
            sessionId: client.sessionId,
            execType: "Replaced",
            orderStatus: "New",
            symbol: order.symbol,
            side: order.side,
            lastQty: 0,
            lastPx: price || order.price || 0,
            cumQty: order.cumQty,
            avgPx: order.avgPx || 0,
            leavesQty: quantity - order.cumQty,
            createdBy: client.role,
          });

          const fixTags = {
            "11": order.clOrdId,
            "17": execId,
            "150": "5",  // ExecType: Replaced
            "39": "0",   // OrdStatus: New
            "55": order.symbol,
            "54": order.side === "Buy" ? "1" : "2",
            "32": "0",
            "31": (price || order.price || 0).toString(),
            "151": (quantity - order.cumQty).toString(),
            "14": order.cumQty.toString(),
            "6": (order.avgPx || 0).toString(),
            "38": quantity.toString(),
          };

          if (price !== undefined) {
            fixTags["44"] = price.toString();
          }

          const rawFix = tagsToFIXString("8", fixTags);

          await storage.createMessage({
            sessionId: client.sessionId,
            direction: "Outgoing",
            messageType: "8",
            rawFix,
            parsed: fixTags,
            fromRole: client.role,
            toRole: "Trader",
          });

          broadcast(client.sessionId, {
            type: 'execution.created',
            data: execution
          });

          broadcast(client.sessionId, {
            type: 'order.updated',
            data: await storage.getOrder(orderId)
          });

          broadcast(client.sessionId, {
            type: 'message.new',
            data: { direction: "Incoming", messageType: "8", rawFix, parsed: fixTags, fromRole: client.role }
          });
        }

        // Handle allocation instruction
        if (message.type === 'allocation.instruction' && client) {
          const { orderId, allocType, accounts } = message.data;
          const order = await storage.getOrder(orderId);
          
          if (!order) {
            ws.send(JSON.stringify({ type: 'error', message: 'Order not found' }));
            return;
          }

          const allocId = `ALLOC-${Date.now()}-${randomUUID().slice(0, 8)}`;
          const calculation = AllocationEngine.calculate(allocType, order, accounts);

          const allocation = await storage.createAllocation({
            allocId,
            sessionId: client.sessionId,
            orderId: order.id,
            allocType,
            accounts: calculation.accounts,
            avgPx: order.avgPx || order.price || 0,
            totalQty: calculation.totalQty,
            symbol: order.symbol,
            side: order.side,
            tradeDate: new Date().toISOString().split('T')[0],
            createdBy: client.role,
          });

          // Create FIX message
          const fixTags = {
            "70": allocId,
            "71": "0",
            "78": calculation.accounts.length.toString(),
            "55": order.symbol,
            "54": order.side === "Buy" ? "1" : "2",
            "6": (order.avgPx || 0).toString(),
            "75": new Date().toISOString().split('T')[0],
          };

          const rawFix = tagsToFIXString("J", fixTags);

          await storage.createMessage({
            sessionId: client.sessionId,
            direction: "Outgoing",
            messageType: "J",
            rawFix,
            parsed: fixTags,
            fromRole: client.role,
            toRole: "Broker",
          });

          broadcast(client.sessionId, {
            type: 'allocation.created',
            data: allocation
          });

          broadcast(client.sessionId, {
            type: 'message.new',
            data: { direction: "Incoming", messageType: "J", rawFix, parsed: fixTags, fromRole: client.role }
          });
        }

        // Handle allocation accept/reject
        if (message.type === 'allocation.response' && client) {
          const { allocId, accept } = message.data;
          const status = accept ? "Accepted" : "Rejected";
          
          await storage.updateAllocationStatus(allocId, status);

          const allocation = await storage.getAllocation(allocId);
          if (allocation) {
            const fixTags = {
              "755": `REPT-${Date.now()}`,
              "87": accept ? "0" : "1",
              "6": allocation.avgPx.toString(),
            };

            const rawFix = tagsToFIXString("AS", fixTags);

            await storage.createMessage({
              sessionId: client.sessionId,
              direction: "Outgoing",
              messageType: "AS",
              rawFix,
              parsed: fixTags,
              fromRole: client.role,
              toRole: "Trader",
            });

            broadcast(client.sessionId, {
              type: 'allocation.updated',
              data: allocation
            });

            broadcast(client.sessionId, {
              type: 'message.new',
              data: { direction: "Incoming", messageType: "AS", rawFix, parsed: fixTags, fromRole: client.role }
            });
          }
        }

        // Handle allocation confirmation (custodian)
        if (message.type === 'allocation.confirm' && client) {
          const { allocId } = message.data;
          
          await storage.updateAllocationStatus(allocId, "Confirmed");

          const allocation = await storage.getAllocation(allocId);
          if (allocation) {
            const fixTags = {
              "664": `CONF-${Date.now()}`,
              "666": "0",
              "773": "1",
              "665": "1",
            };

            const rawFix = tagsToFIXString("AK", fixTags);

            await storage.createMessage({
              sessionId: client.sessionId,
              direction: "Outgoing",
              messageType: "AK",
              rawFix,
              parsed: fixTags,
              fromRole: client.role,
              toRole: "Broker",
            });

            broadcast(client.sessionId, {
              type: 'allocation.updated',
              data: allocation
            });

            broadcast(client.sessionId, {
              type: 'message.new',
              data: { direction: "Incoming", messageType: "AK", rawFix, parsed: fixTags, fromRole: client.role }
            });
          }
        }

      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', async () => {
      if (client) {
        await storage.updateParticipantConnection(
          client.sessionId,
          client.username,
          false
        );

        broadcast(client.sessionId, {
          type: 'participant.left',
          data: { role: client.role, username: client.username }
        }, clientId);
      }
      clients.delete(clientId);
    });
  });

  function broadcast(sessionId: string, message: any, excludeClientId?: string) {
    const messageStr = JSON.stringify(message);
    for (const [id, client] of clients.entries()) {
      if (client.sessionId === sessionId && id !== excludeClientId) {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(messageStr);
        }
      }
    }
  }

  return httpServer;
}
