import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { orders, executions, allocations, fixMessages, participants, sessions } from "@shared/schema";
import { lt, inArray } from "drizzle-orm";

const RETENTION_DAYS = parseInt(process.env.RETENTION_DAYS || "7");

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client);

export async function cleanupOldData() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
  
  console.log(`[Cleanup] Starting cleanup for data older than ${RETENTION_DAYS} days (before ${cutoffDate.toISOString()})`);
  
  try {
    // Step 1: Identify old sessions to delete
    const oldSessions = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(lt(sessions.createdAt, cutoffDate));
    
    const oldSessionIds = oldSessions.map(s => s.id);
    
    if (oldSessionIds.length === 0) {
      console.log(`[Cleanup] No sessions older than ${RETENTION_DAYS} days found`);
      return {
        success: true,
        deleted: {
          sessions: 0,
          participants: 0,
          orders: 0,
          executions: 0,
          allocations: 0,
          messages: 0,
        },
        cutoffDate: cutoffDate.toISOString(),
      };
    }

    console.log(`[Cleanup] Found ${oldSessionIds.length} old sessions to delete`);

    // Step 2: Delete in cascade order: sessions → participants → orders → (executions + allocations) → messages
    
    // Delete sessions first
    const deletedSessions = await db
      .delete(sessions)
      .where(lt(sessions.createdAt, cutoffDate))
      .returning();
    console.log(`[Cleanup] Deleted ${deletedSessions.length} old sessions`);

    // Delete participants for those sessions
    const deletedParticipants = await db
      .delete(participants)
      .where(inArray(participants.sessionId, oldSessionIds))
      .returning();
    console.log(`[Cleanup] Deleted ${deletedParticipants.length} participants`);

    // Delete orders for those sessions
    const deletedOrders = await db
      .delete(orders)
      .where(inArray(orders.sessionId, oldSessionIds))
      .returning();
    console.log(`[Cleanup] Deleted ${deletedOrders.length} old orders`);

    // Delete executions for those sessions
    const deletedExecutions = await db
      .delete(executions)
      .where(inArray(executions.sessionId, oldSessionIds))
      .returning();
    console.log(`[Cleanup] Deleted ${deletedExecutions.length} old executions`);

    // Delete allocations for those sessions
    const deletedAllocations = await db
      .delete(allocations)
      .where(inArray(allocations.sessionId, oldSessionIds))
      .returning();
    console.log(`[Cleanup] Deleted ${deletedAllocations.length} old allocations`);

    // Delete FIX messages for those sessions
    const deletedMessages = await db
      .delete(fixMessages)
      .where(inArray(fixMessages.sessionId, oldSessionIds))
      .returning();
    console.log(`[Cleanup] Deleted ${deletedMessages.length} old FIX messages`);

    console.log(`[Cleanup] Cleanup completed successfully`);
    
    return {
      success: true,
      deleted: {
        sessions: deletedSessions.length,
        participants: deletedParticipants.length,
        orders: deletedOrders.length,
        executions: deletedExecutions.length,
        allocations: deletedAllocations.length,
        messages: deletedMessages.length,
      },
      cutoffDate: cutoffDate.toISOString(),
    };
  } catch (error) {
    console.error(`[Cleanup] Error during cleanup:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
