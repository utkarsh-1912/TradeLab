import type { AllocationType, AllocationAccount, Order } from "@shared/schema";

export interface AllocationCalculation {
  accounts: AllocationAccount[];
  totalQty: number;
  totalNetMoney: number;
}

export class AllocationEngine {
  /**
   * Calculate allocations based on the specified method
   */
  static calculate(
    allocType: AllocationType,
    order: Order,
    inputAccounts: AllocationAccount[]
  ): AllocationCalculation {
    const avgPx = order.avgPx || order.price || 0;
    const totalQty = order.cumQty;

    let accounts: AllocationAccount[] = [];

    switch (allocType) {
      case "ProRata":
        accounts = this.calculateProRata(inputAccounts, totalQty, avgPx);
        break;
      case "Percent":
        accounts = this.calculatePercent(inputAccounts, totalQty, avgPx);
        break;
      case "FixedQty":
        accounts = this.calculateFixedQty(inputAccounts, avgPx);
        break;
      case "AvgPrice":
        accounts = this.calculateAvgPrice(inputAccounts, avgPx);
        break;
      default:
        throw new Error(`Unknown allocation type: ${allocType}`);
    }

    const totalNetMoney = accounts.reduce((sum, acc) => sum + (acc.netMoney || 0), 0);
    const computedTotalQty = accounts.reduce((sum, acc) => sum + (acc.qty || 0), 0);

    return {
      accounts,
      totalQty: computedTotalQty,
      totalNetMoney,
    };
  }

  /**
   * Pro-rata allocation based on weights
   */
  private static calculateProRata(
    inputAccounts: AllocationAccount[],
    totalQty: number,
    avgPx: number
  ): AllocationAccount[] {
    const totalWeight = inputAccounts.reduce((sum, acc) => sum + (acc.qty || 0), 0);
    
    if (totalWeight === 0) {
      return inputAccounts.map(acc => ({
        ...acc,
        qty: 0,
        netMoney: 0,
      }));
    }

    const accounts: AllocationAccount[] = [];
    let allocated = 0;

    for (let i = 0; i < inputAccounts.length; i++) {
      const acc = inputAccounts[i];
      const weight = acc.qty || 0;
      
      let qty: number;
      if (i === inputAccounts.length - 1) {
        // Last account gets the remainder
        qty = totalQty - allocated;
      } else {
        qty = Math.floor((totalQty * weight) / totalWeight);
      }
      
      allocated += qty;
      const netMoney = qty * avgPx;

      accounts.push({
        account: acc.account,
        qty,
        percent: (qty / totalQty) * 100,
        netMoney,
      });
    }

    return accounts;
  }

  /**
   * Percentage-based allocation
   */
  private static calculatePercent(
    inputAccounts: AllocationAccount[],
    totalQty: number,
    avgPx: number
  ): AllocationAccount[] {
    const accounts: AllocationAccount[] = [];
    let allocated = 0;

    for (let i = 0; i < inputAccounts.length; i++) {
      const acc = inputAccounts[i];
      const percent = acc.percent || 0;
      
      let qty: number;
      if (i === inputAccounts.length - 1) {
        // Last account gets the remainder
        qty = totalQty - allocated;
      } else {
        qty = Math.floor((totalQty * percent) / 100);
      }
      
      allocated += qty;
      const netMoney = qty * avgPx;

      accounts.push({
        account: acc.account,
        qty,
        percent,
        netMoney,
      });
    }

    return accounts;
  }

  /**
   * Fixed quantity allocation
   */
  private static calculateFixedQty(
    inputAccounts: AllocationAccount[],
    avgPx: number
  ): AllocationAccount[] {
    return inputAccounts.map(acc => {
      const qty = acc.qty || 0;
      const netMoney = qty * avgPx;
      return {
        account: acc.account,
        qty,
        netMoney,
      };
    });
  }

  /**
   * Average price allocation (multi-fill blocks)
   */
  private static calculateAvgPrice(
    inputAccounts: AllocationAccount[],
    avgPx: number
  ): AllocationAccount[] {
    return inputAccounts.map(acc => {
      const qty = acc.qty || 0;
      const netMoney = qty * avgPx;
      return {
        account: acc.account,
        qty,
        netMoney,
      };
    });
  }

  /**
   * Validate allocation accounts
   */
  static validate(
    allocType: AllocationType,
    accounts: AllocationAccount[],
    totalQty: number
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (accounts.length === 0) {
      errors.push("At least one account is required");
      return { valid: false, errors };
    }

    for (const acc of accounts) {
      if (!acc.account || acc.account.trim() === "") {
        errors.push("Account ID cannot be empty");
      }
    }

    if (allocType === "Percent") {
      const totalPercent = accounts.reduce((sum, acc) => sum + (acc.percent || 0), 0);
      if (Math.abs(totalPercent - 100) > 0.01) {
        errors.push(`Total percentage must equal 100% (got ${totalPercent.toFixed(2)}%)`);
      }
    }

    if (allocType === "FixedQty" || allocType === "AvgPrice") {
      const totalAllocated = accounts.reduce((sum, acc) => sum + (acc.qty || 0), 0);
      if (totalAllocated > totalQty) {
        errors.push(`Total allocated quantity (${totalAllocated}) exceeds order quantity (${totalQty})`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
