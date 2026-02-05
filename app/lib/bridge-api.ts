// app/lib/bridge-api.ts
import { 
  SupportedAssetsResponse, 
  QuoteRequest, 
  QuoteResponse, 
  DepositAddressResponse, 
  TransactionStatusResponse 
} from "../types/bridge";

const BRIDGE_API_URL = "https://bridge.polymarket.com";

export const bridgeApi = {
  getSupportedAssets: async (): Promise<SupportedAssetsResponse> => {
    const res = await fetch(`${BRIDGE_API_URL}/supported-assets`);
    if (!res.ok) throw new Error("Failed to fetch assets");
    return res.json();
  },

  getQuote: async (body: QuoteRequest): Promise<QuoteResponse> => {
    const res = await fetch(`${BRIDGE_API_URL}/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Failed to get quote");
    return res.json();
  },

  createDepositAddress: async (polymarketAddress: string): Promise<DepositAddressResponse> => {
    const res = await fetch(`${BRIDGE_API_URL}/deposit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: polymarketAddress }),
    });
    if (!res.ok) throw new Error("Failed to create deposit address");
    return res.json();
  },

  createWithdrawAddress: async (
    polymarketAddress: string, 
    toChainId: string, 
    toTokenAddress: string, 
    recipientAddr: string
  ): Promise<DepositAddressResponse> => {
    const res = await fetch(`${BRIDGE_API_URL}/withdraw`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        address: polymarketAddress,
        toChainId,
        toTokenAddress,
        recipientAddr
      }),
    });
    if (!res.ok) throw new Error("Failed to create withdrawal address");
    return res.json();
  },

  getStatus: async (address: string): Promise<TransactionStatusResponse> => {
    const res = await fetch(`${BRIDGE_API_URL}/status/${address}`);
    if (!res.ok) throw new Error("Failed to fetch status");
    return res.json();
  }
};