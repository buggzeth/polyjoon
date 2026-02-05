// app/types/polymarket.ts

export interface PolymarketMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  resolutionSource: string;
  endDate: string;
  liquidity: string | number;
  startDate: string;
  image?: string;
  icon?: string;
  description?: string;
  outcomes: string;      // JSON String: "[\"Yes\", \"No\"]"
  outcomePrices: string; // JSON String: "[\"0.99\", \"0.01\"]"
  volume: string | number;
  active: boolean;
  closed: boolean;
  marketMakerAddress?: string;
  clobTokenIds?: string;
}

export interface PolymarketEvent {
  id: string;
  ticker: string;
  slug: string;
  title: string;
  description: string;
  startDate: string;
  creationDate: string;
  endDate: string;
  image?: string;
  icon?: string;
  active: boolean;
  closed: boolean;
  // API returns numbers for these in the root object
  liquidity: number; 
  volume: number;
  openInterest: number;
  markets: PolymarketMarket[];
  tags?: { label: string; slug: string }[];
  cyom?: boolean;
}