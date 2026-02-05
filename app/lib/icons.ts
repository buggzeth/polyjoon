// app/lib/icons.ts

const BASE_URL = "https://raw.githubusercontent.com/0xa3k5/web3icons/main/raw-svgs";

// Map complex chain names to the exact filename in the repo
const CHAIN_NAME_MAP: Record<string, string> = {
  "ethereum": "ethereum",
  "polygon": "polygon",
  "arbitrum": "arbitrum-one", 
  "optimism": "optimism",
  "base": "base",
  "solana": "solana",
  "bitcoin": "bitcoin",
  "avalanche": "avalanche",
  
  // Specific fix for BNB
  "bnb smart chain": "binance-smart-chain",
  "bsc": "binance-smart-chain",
  
  // Specific fix for HyperEVM
  "hyperevm": "hyper-evm",
};

// Map wallet connector IDs to filenames
const WALLET_ICON_MAP: Record<string, string> = {
  "metaMask": "metamask",
  "metaMaskSDK": "metamask",
  "io.rabby": "rabby",
  "coinbaseWalletSDK": "coinbase",
  "walletConnect": "walletconnect",
  "safe": "safe",
};

export function getChainIcon(chainName: string): string {
  const normalized = chainName.toLowerCase().replace(" one", "").trim();

  // 1. Handle Local Exceptions (Custom assets in /public)
  if (normalized === "lighter") return "/lighter.png";
  if (normalized === "ethereal") return "/ethereal.png";

  // 2. Handle Remote Icons from Web3Icons Repo
  const slug = CHAIN_NAME_MAP[normalized] || normalized;
  return `${BASE_URL}/networks/background/${slug}.svg`;
}

export function getTokenIcon(symbol: string): string {
  // 1. Strip .e or similar suffixes (e.g. USDC.e -> USDC)
  let normalized = symbol.split('.')[0].toUpperCase(); 

  // 2. Handle Wrapped Ether specifically (WETH -> ETH)
  if (normalized === 'WETH') {
    normalized = 'ETH';
  }

  return `${BASE_URL}/tokens/background/${normalized}.svg`;
}

export function getWalletIcon(connectorId: string): string {
  const slug = WALLET_ICON_MAP[connectorId] || "walletconnect"; // Fallback
  return `${BASE_URL}/wallets/background/${slug}.svg`;
}