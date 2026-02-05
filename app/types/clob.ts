// app/types/clob.ts

export interface Order {
  price: string;
  size: string;
}

export interface OrderBook {
  market: string; // The clobTokenId (asset_id in some contexts, strictly the Token ID for the outcome)
  asset_id: string; 
  timestamp: string;
  hash: string;
  bids: Order[];
  asks: Order[];
  min_order_size: string;
  tick_size: string;
  neg_risk: boolean;
}

export interface ClobData {
  books: Record<string, OrderBook>; // Keyed by Token ID
  spreads: Record<string, string>;  // Keyed by Token ID
  prices: Record<string, { BUY: string; SELL: string }>; // Keyed by Token ID
}

export interface TokenMapping {
  marketId: string;
  outcome: string;
  tokenId: string;
}

export interface OpenOrder {
  id?: string;        // Sometimes returned as 'id'
  orderID?: string;   // Sometimes returned as 'orderID'
  price: string;
  size?: string;      // Remaining size
  current_size?: string; // Alternative key
  original_size?: string;
  side: "BUY" | "SELL";
  asset_id: string;
  market: string;     // Condition ID
}