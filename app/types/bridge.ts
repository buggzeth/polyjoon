// app/types/bridge.ts

export interface BridgeToken {
  name: string;
  symbol: string;
  address: string;
  decimals: number;
}

export interface SupportedAsset {
  chainId: string;
  chainName: string;
  token: BridgeToken;
  minCheckoutUsd: number;
}

export interface SupportedAssetsResponse {
  supportedAssets: SupportedAsset[];
}

export interface QuoteRequest {
  fromAmountBaseUnit: string;
  fromChainId: string;
  fromTokenAddress: string;
  recipientAddress: string;
  toChainId: string;
  toTokenAddress: string;
}

export interface QuoteResponse {
  estCheckoutTimeMs: number;
  estFeeBreakdown: {
    gasUsd: number;
    totalImpactUsd: number;
    minReceived: number;
  };
  estInputUsd: number;
  estOutputUsd: number;
  estToTokenBaseUnit: string;
  quoteId: string;
}

export interface DepositAddressResponse {
  address: {
    evm: string;
    svm: string;
    btc: string;
  };
  note: string;
}

export type TransactionStatus = 
  | "DEPOSIT_DETECTED" 
  | "PROCESSING" 
  | "ORIGIN_TX_CONFIRMED" 
  | "SUBMITTED" 
  | "COMPLETED" 
  | "FAILED";

export interface TransactionStatusResponse {
  transactions: {
    fromChainId: string;
    toChainId: string;
    status: TransactionStatus;
    txHash?: string;
    createdTimeMs?: number;
  }[];
}