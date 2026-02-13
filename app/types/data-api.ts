// app/types/data-api.ts

export interface Position {
  proxyWallet: string;
  asset: string;
  conditionId: string;
  size: number;
  avgPrice: number;
  currentValue: number;
  cashPnl: number;
  percentPnl: number;
  curPrice: number;
  title: string;
  slug: string;
  icon: string;
  outcome: string;
  outcomeIndex: number;
  endDate: string;
}

export interface Trade {
  transactionHash: string;
  timestamp: number;
  side: "BUY" | "SELL";
  price: number;
  size: number;
  title: string;
  outcome: string;
  asset: string;
}

export interface Activity {
  type: string;
  timestamp: number;
  size: number;
  usdcSize: number;
  price: number;
  side: "BUY" | "SELL";
  title: string;
  outcome: string;
  transactionHash: string;
}

export interface ClosedPosition {
  proxyWallet: string;
  asset: string;
  conditionId: string;
  avgPrice: number;
  totalBought: number;
  realizedPnl: number;
  curPrice: number;
  timestamp: number;
  title: string;
  slug: string;
  icon: string;
  eventSlug: string;
  outcome: string;
  outcomeIndex: number;
  endDate: string;
}

export interface PortfolioValue {
  value: number; // Total portfolio value in USDC
  cash: number;  // (Derived if possible, otherwise we just show value)
}