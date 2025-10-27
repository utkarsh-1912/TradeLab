import type { FIXMessageType } from "@shared/schema";

export interface FIXValidationResult {
  valid: boolean;
  errors: string[];
}

// Required tags for each message type
const REQUIRED_TAGS: Record<FIXMessageType, number[]> = {
  "D": [11, 55, 54, 38, 40, 60], // NewOrderSingle: ClOrdID, Symbol, Side, OrderQty, OrdType, TransactTime
  "8": [11, 17, 150, 39, 55, 54, 32, 31, 151, 14, 6], // ExecutionReport
  "F": [11, 41, 55, 54], // OrderCancelRequest
  "G": [11, 41, 55, 54, 38], // OrderCancelReplaceRequest
  "J": [70, 71, 78, 55, 54, 6, 75], // AllocationInstruction
  "AS": [755, 87, 6], // AllocationReport
  "AK": [664, 666, 773, 665], // Confirmation
  "P": [70, 75], // AllocationAck
};

export function validateFIXMessage(
  messageType: FIXMessageType,
  tags: Record<string, any>
): FIXValidationResult {
  const errors: string[] = [];
  const requiredTags = REQUIRED_TAGS[messageType] || [];

  // Check required tags
  for (const tag of requiredTags) {
    if (!(tag.toString() in tags)) {
      errors.push(`Missing required tag ${tag}`);
    }
  }

  // Validate Side (tag 54)
  if (tags["54"] && !["1", "2", "Buy", "Sell"].includes(tags["54"])) {
    errors.push("Invalid Side value (tag 54)");
  }

  // Validate OrderType (tag 40)
  if (tags["40"] && !["1", "2", "3", "4", "Market", "Limit", "Stop", "StopLimit"].includes(tags["40"])) {
    errors.push("Invalid OrdType value (tag 40)");
  }

  // Validate quantities are positive
  const qtyTags = ["38", "32", "80", "14", "151"];
  for (const tag of qtyTags) {
    if (tags[tag] !== undefined && Number(tags[tag]) < 0) {
      errors.push(`Invalid quantity in tag ${tag}`);
    }
  }

  // Validate prices are positive
  const priceTags = ["44", "31", "6"];
  for (const tag of priceTags) {
    if (tags[tag] !== undefined && Number(tags[tag]) <= 0) {
      errors.push(`Invalid price in tag ${tag}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function tagsToFIXString(messageType: FIXMessageType, tags: Record<string, any>): string {
  const delimiter = "|";
  let fixString = `35=${messageType}${delimiter}`;
  
  for (const [tag, value] of Object.entries(tags)) {
    if (tag !== "35") {
      fixString += `${tag}=${value}${delimiter}`;
    }
  }
  
  return fixString;
}

export function parseFIXString(fixString: string): Record<string, any> {
  const tags: Record<string, any> = {};
  const pairs = fixString.split("|").filter(Boolean);
  
  for (const pair of pairs) {
    const [tag, value] = pair.split("=");
    if (tag && value !== undefined) {
      tags[tag] = value;
    }
  }
  
  return tags;
}
