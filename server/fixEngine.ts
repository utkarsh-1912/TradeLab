import type { AssetClass, FIXMessageType, OrderSide, OrderType, Order } from "@shared/schema";

// FIX 4.4 Standard Header Tags
const SOH = "\x01";  // Start of Header delimiter
const BEGIN_STRING = "FIX.4.4";

export interface FIXMessage {
  msgType: FIXMessageType;
  tags: Record<string, string | number>;
  rawFix: string;
}

export interface NewOrderSingleParams {
  clOrdId: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  orderType: OrderType;
  price?: number;
  transactTime?: string;
  assetClass?: AssetClass;
  securityType?: string;
  currencyPair?: string;
  maturityMonthYear?: string;
  strikePrice?: number;
  optionType?: "C" | "P";
  underlyingSymbol?: string;
}

export interface ExecutionReportParams {
  orderId: string;
  clOrdId: string;
  execId: string;
  execType: string;
  orderStatus: string;
  symbol: string;
  side: OrderSide;
  lastQty: number;
  lastPx: number;
  cumQty: number;
  avgPx: number;
  leavesQty: number;
  transactTime?: string;
}

/**
 * FIX Engine Adapter using jspurefix for message generation/parsing
 * This is a simplified adapter for simulation purposes - not a full FIX session
 */
export class FixEngineAdapter {
  private msgSeqNum: number = 1;

  /**
   * Generate FIX NewOrderSingle (MsgType=D) message
   */
  buildNewOrderSingle(params: NewOrderSingleParams): FIXMessage {
    const tags: Record<string, string | number> = {
      11: params.clOrdId,           // ClOrdID
      55: params.symbol,            // Symbol
      54: this.mapSide(params.side), // Side
      38: params.quantity,          // OrderQty
      40: this.mapOrderType(params.orderType), // OrdType
      60: params.transactTime || this.getTransactTime(), // TransactTime
    };

    // Add price for Limit/Stop orders
    if (params.price !== undefined && params.orderType !== "Market") {
      tags[44] = params.price;  // Price
    }

    // Asset-class specific fields
    if (params.securityType) {
      tags[167] = params.securityType;  // SecurityType
    }

    // FX specific
    if (params.assetClass === "FX" && params.currencyPair) {
      tags[55] = params.currencyPair;  // Symbol becomes currency pair
    }

    // Futures specific
    if (params.assetClass === "Futures" && params.maturityMonthYear) {
      tags[200] = params.maturityMonthYear;  // MaturityMonthYear
    }

    // Options specific
    if (params.assetClass === "Options") {
      if (params.strikePrice) tags[202] = params.strikePrice;  // StrikePrice
      if (params.optionType) tags[201] = params.optionType;    // PutOrCall
      if (params.underlyingSymbol) tags[311] = params.underlyingSymbol;  // UnderlyingSymbol
    }

    return this.createMessage("D", tags);
  }

  /**
   * Generate FIX ExecutionReport (MsgType=8) message
   */
  buildExecutionReport(params: ExecutionReportParams): FIXMessage {
    const tags: Record<string, string | number> = {
      37: params.orderId,           // OrderID
      11: params.clOrdId,           // ClOrdID
      17: params.execId,            // ExecID
      150: params.execType,         // ExecType
      39: params.orderStatus,       // OrdStatus
      55: params.symbol,            // Symbol
      54: this.mapSide(params.side), // Side
      32: params.lastQty,           // LastQty
      31: params.lastPx,            // LastPx
      14: params.cumQty,            // CumQty
      6: params.avgPx,              // AvgPx
      151: params.leavesQty,        // LeavesQty
      60: params.transactTime || this.getTransactTime(), // TransactTime
    };

    return this.createMessage("8", tags);
  }

  /**
   * Parse FIX message string into structured format
   */
  parseMessage(rawFix: string): FIXMessage {
    const tags: Record<string, string | number> = {};
    const pairs = rawFix.split(SOH).filter(Boolean);

    let msgType: FIXMessageType = "D";

    for (const pair of pairs) {
      const equalIndex = pair.indexOf("=");
      if (equalIndex > 0) {
        const tag = pair.substring(0, equalIndex);
        const value = pair.substring(equalIndex + 1);
        
        if (tag === "35") {
          msgType = value as FIXMessageType;
        }
        
        tags[tag] = value;
      }
    }

    return {
      msgType,
      tags,
      rawFix,
    };
  }

  /**
   * Validate FIX message structure
   */
  validateMessage(message: FIXMessage): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required header fields
    if (!message.tags[8]) errors.push("Missing BeginString (tag 8)");
    if (!message.tags[9]) errors.push("Missing BodyLength (tag 9)");
    if (!message.tags[35]) errors.push("Missing MsgType (tag 35)");

    // Message-type specific validation
    switch (message.msgType) {
      case "D": // NewOrderSingle
        if (!message.tags[11]) errors.push("Missing ClOrdID (tag 11)");
        if (!message.tags[55]) errors.push("Missing Symbol (tag 55)");
        if (!message.tags[54]) errors.push("Missing Side (tag 54)");
        if (!message.tags[38]) errors.push("Missing OrderQty (tag 38)");
        if (!message.tags[40]) errors.push("Missing OrdType (tag 40)");
        break;

      case "8": // ExecutionReport
        if (!message.tags[37]) errors.push("Missing OrderID (tag 37)");
        if (!message.tags[17]) errors.push("Missing ExecID (tag 17)");
        if (!message.tags[150]) errors.push("Missing ExecType (tag 150)");
        if (!message.tags[39]) errors.push("Missing OrdStatus (tag 39)");
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create a properly formatted FIX message with header and checksum
   */
  private createMessage(msgType: FIXMessageType, tags: Record<string, string | number>): FIXMessage {
    // Build body
    let body = `35=${msgType}${SOH}`;
    
    for (const [tag, value] of Object.entries(tags)) {
      if (tag !== "35") {  // MsgType already added
        body += `${tag}=${value}${SOH}`;
      }
    }

    // Calculate body length (excluding BeginString and BodyLength tags)
    const bodyLength = body.length;

    // Build complete message with header
    let message = `8=${BEGIN_STRING}${SOH}9=${bodyLength}${SOH}${body}`;

    // Calculate checksum
    const checksum = this.calculateChecksum(message);
    message += `10=${checksum}${SOH}`;

    return {
      msgType,
      tags: { ...tags, 8: BEGIN_STRING, 9: bodyLength, 10: checksum },
      rawFix: message,
    };
  }

  /**
   * Calculate FIX checksum (sum of all bytes modulo 256)
   */
  private calculateChecksum(message: string): string {
    let sum = 0;
    for (let i = 0; i < message.length; i++) {
      sum += message.charCodeAt(i);
    }
    const checksum = (sum % 256).toString();
    return checksum.padStart(3, "0");
  }

  /**
   * Get current timestamp in FIX format (YYYYMMDD-HH:MM:SS)
   */
  private getTransactTime(): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const day = String(now.getUTCDate()).padStart(2, "0");
    const hours = String(now.getUTCHours()).padStart(2, "0");
    const minutes = String(now.getUTCMinutes()).padStart(2, "0");
    const seconds = String(now.getUTCSeconds()).padStart(2, "0");
    return `${year}${month}${day}-${hours}:${minutes}:${seconds}`;
  }

  /**
   * Map OrderSide to FIX values
   */
  private mapSide(side: OrderSide): string {
    return side === "Buy" ? "1" : "2";
  }

  /**
   * Map OrderType to FIX values
   */
  private mapOrderType(orderType: OrderType): string {
    switch (orderType) {
      case "Market": return "1";
      case "Limit": return "2";
      case "Stop": return "3";
      case "StopLimit": return "4";
      default: return "1";
    }
  }

  /**
   * Create human-readable FIX message (pipe-delimited for display)
   */
  toDisplayString(rawFix: string): string {
    return rawFix.replace(new RegExp(SOH, "g"), "|");
  }

  /**
   * Parse display string back to FIX format
   */
  fromDisplayString(displayString: string): string {
    return displayString.replace(/\|/g, SOH);
  }
}

// Export singleton instance
export const fixEngine = new FixEngineAdapter();
