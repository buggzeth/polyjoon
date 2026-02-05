# Technical Guide: Implementing Polymarket Safe Sessions with Wagmi

## 1. The Dependencies
The Polymarket SDK relies on Ethers v5 `Signer` objects. Since Wagmi v2/v3 uses `viem`, an adapter is strictly required.

```bash
npm install @polymarket/clob-client ethers@5.7.2
```

## 2. The Viem-to-Ethers Adapter
Create a hook to convert the Wagmi `WalletClient` into an Ethers v5 `Signer`. This is the bridge that allows the Polymarket SDK to communicate with the user's wallet.

**File:** `src/hooks/useEthersSigner.ts`

```typescript
import { useMemo } from 'react'
import { providers } from 'ethers'
import { useWalletClient } from 'wagmi'
import { type WalletClient } from 'viem'

function clientToSigner(client: WalletClient) {
  const { account, chain, transport } = client
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  }
  const provider = new providers.Web3Provider(transport, network)
  const signer = provider.getSigner(account.address)
  return signer
}

export function useEthersSigner({ chainId }: { chainId?: number } = {}) {
  const { data: client } = useWalletClient({ chainId })
  return useMemo(() => (client ? clientToSigner(client) : undefined), [client])
}
```

## 3. The Trading Context & Provider
This provider manages the **L1 Auth** (Key Derivation) and **L2 Client** (Session) state. It handles the logic to switch from "EOA Mode" to "Safe Mode".

**File:** `src/providers/TradingProvider.tsx`

```typescript
"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { ClobClient } from "@polymarket/clob-client";
import { useAccount } from "wagmi";
import { useEthersSigner } from "@/hooks/useEthersSigner";
import { polygon } from "wagmi/chains";

// Signature Type 2 = Gnosis Safe (Standard for Polymarket MetaMask users)
const GNOSIS_SAFE_SIGNATURE_TYPE = 2;

type TradingContextType = {
  clobClient: ClobClient | null;
  apiKeyCreds: { key: string; secret: string; passphrase: string } | null;
  safeAddress: string | null;
  isSessionActive: boolean;
  initializeSession: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
};

const TradingContext = createContext<TradingContextType>({} as TradingContextType);

export function TradingProvider({ children }: { children: React.ReactNode }) {
  const { address: eoaAddress } = useAccount();
  const signer = useEthersSigner({ chainId: polygon.id });
  
  const [clobClient, setClobClient] = useState<ClobClient | null>(null);
  const [apiKeyCreds, setApiKeyCreds] = useState<any>(null);
  const [safeAddress, setSafeAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Logic to Initialize the Session
  const initializeSession = useCallback(async () => {
    if (!signer || !eoaAddress) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // A. Instantiate a temporary client with the EOA to perform L1 Auth
      // This client is ONLY used to sign the message to derive API keys.
      const authClient = new ClobClient(
        "https://clob.polymarket.com",
        polygon.id,
        signer
      );

      // B. L1 Authentication: Sign message to get API Credentials
      // This triggers the wallet popup.
      const creds = await authClient.createOrDeriveApiKey();
      setApiKeyCreds(creds);

      // C. L2 Client Instantiation: Create the final client for the Safe
      // We pass the creds and set signatureType to 2 (Gnosis Safe).
      const safeClient = new ClobClient(
        "https://clob.polymarket.com",
        polygon.id,
        signer,
        creds,
        GNOSIS_SAFE_SIGNATURE_TYPE
      );

      // D. Derive/Get the Safe Address
      // The SDK can derive the Gnosis Safe address associated with this EOA.
      // Note: This does not deploy it, it just calculates where it IS or WILL BE.
      const derivedSafeAddress = await safeClient.deriveProxyWalletAddress();
      setSafeAddress(derivedSafeAddress);
      
      // E. Store the authorized client
      setClobClient(safeClient);

    } catch (err: any) {
      console.error("Session Init Error:", err);
      setError(err.message || "Failed to initialize trading session");
    } finally {
      setIsLoading(false);
    }
  }, [signer, eoaAddress]);

  // 2. Clear session on wallet disconnect
  useEffect(() => {
    if (!eoaAddress) {
      setClobClient(null);
      setApiKeyCreds(null);
      setSafeAddress(null);
    }
  }, [eoaAddress]);

  return (
    <TradingContext.Provider
      value={{
        clobClient,
        apiKeyCreds,
        safeAddress,
        isSessionActive: !!clobClient && !!apiKeyCreds,
        initializeSession,
        isLoading,
        error,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
}

export const useTrading = () => useContext(TradingContext);
```

## 4. The Safe Deployment Logic (Optional but Recommended)
While `deriveProxyWalletAddress` gets the address, the Safe might not exist on-chain yet. You often want to check if it's deployed and deploy it if necessary during the session setup.

You can extend the `initializeSession` function in the provider above with this logic:

```typescript
// Inside initializeSession, after step D (deriving address):

// 1. Check if code exists at the Safe address
const provider = signer.provider;
const code = await provider.getCode(derivedSafeAddress);
const isDeployed = code !== "0x";

if (!isDeployed) {
   // 2. If not deployed, use the SDK (or Relayer) to deploy.
   // Note: The ClobClient has methods to help, or you can simple proceed.
   // Polymarket usually deploys the Safe automatically upon the first 
   // deposited transaction or via a Relayer call.
   
   // For this specific pattern, we simply mark it in state.
   console.log("Safe address derived but not deployed yet:", derivedSafeAddress);
}
```

## 5. Usage in Components

**File:** `src/components/TradingSession/SessionActions.tsx`

This component connects the UI to the Provider.

```typescript
import { useTrading } from "@/providers/TradingProvider";

export default function SessionActions() {
  const { 
    isSessionActive, 
    initializeSession, 
    isLoading, 
    error 
  } = useTrading();

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  if (isSessionActive) {
    return (
      <div className="text-green-500 font-bold border p-4 rounded">
        Session Active. Safe Mode Enabled.
      </div>
    );
  }

  return (
    <button
      onClick={initializeSession}
      disabled={isLoading}
      className="bg-blue-600 text-white px-6 py-3 rounded disabled:opacity-50"
    >
      {isLoading ? "Signing..." : "Initialize Safe Session"}
    </button>
  );
}
```

## 6. Summary of Architecture for the AI Developer

1.  **L1 (EOA):** The user connects via `wagmi`. We use `useEthersSigner` to give the SDK access to this key.
2.  **L2 (API Keys):** We call `createOrDeriveApiKey()`. This creates a persistent session key pair.
3.  **Proxy (Safe):** We instantiate the `ClobClient` with `signatureType: 2`. This tells Polymarket's backend: *"I am signing with my EOA, but I want to execute actions on my Gnosis Safe."*
4.  **State:** The `TradingProvider` holds the initialized `clobClient`. Any component needing to trade just consumes this context.