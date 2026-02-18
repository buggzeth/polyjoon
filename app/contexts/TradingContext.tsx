// app/contexts/TradingContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ClobClient } from '@polymarket/clob-client';
import { parseUnits, encodeFunctionData, erc20Abi } from "viem";
import { RelayClient, OperationType } from '@polymarket/builder-relayer-client';
import { BuilderConfig } from '@polymarket/builder-signing-sdk';
import { deriveSafe } from "@polymarket/builder-relayer-client/dist/builder/derive";
import { getContractConfig } from "@polymarket/builder-relayer-client/dist/config";
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { POLYGON_CHAIN_ID, RELAYER_URL, CLOB_API_URL, USDC_E_ADDRESS, TREASURY_ADDRESS, USDC_DECIMALS } from '../lib/constants';
import { checkAllApprovals, createApprovalTxs } from '../lib/approvals';

export type SessionStep = "idle" | "checking" | "deploying" | "credentials" | "approvals" | "complete";

interface TradingContextType {
  clobClient: ClobClient | null;
  relayClient: RelayClient | null;
  safeAddress: string | undefined;
  isReady: boolean;
  isLoading: boolean;
  sessionStep: SessionStep;
  error: string | null;
  initializeSession: () => Promise<void>;
  logout: () => void;
  transferUSDC: (amount: number) => Promise<string>;
}

const TradingContext = createContext<TradingContextType>({} as TradingContextType);
export const useTrading = () => useContext(TradingContext);

export const TradingProvider = ({ children }: { children: React.ReactNode }) => {
  const { address, isConnected, chainId } = useAccount();
  const { switchChain, switchChainAsync } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const signer = useEthersSigner({ chainId: POLYGON_CHAIN_ID });

  const [clobClient, setClobClient] = useState<ClobClient | null>(null);
  const [relayClient, setRelayClient] = useState<RelayClient | null>(null);
  const [sessionStep, setSessionStep] = useState<SessionStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const safeAddress = useMemo(() => {
    if (!address) return undefined;
    try {
      const config = getContractConfig(POLYGON_CHAIN_ID);
      return deriveSafe(address, config.SafeContracts.SafeFactory);
    } catch (e) {
      console.error("Safe derivation failed", e);
      return undefined;
    }
  }, [address]);

  // --- 0. Auto-Switch Chain Effect ---
  // This proactively switches the network as soon as the wallet connects
  useEffect(() => {
    if (isConnected && chainId && chainId !== POLYGON_CHAIN_ID) {
        console.log(`Wrong network (${chainId}). Switching to Polygon...`);
        // We use the non-async version here for the effect
        switchChain({ chainId: POLYGON_CHAIN_ID });
    }
  }, [isConnected, chainId, switchChain]);

  // --- 1. Helper to setup Client with Creds ---
  const setupClientWithCreds = useCallback(async (creds: any, currentSafeAddress: string, currentSigner: any, currentWalletClient: any) => {
    const builderConfig = new BuilderConfig({
        remoteBuilderConfig: {
          url: `${window.location.origin}/api/polymarket/sign`,
        },
      });

      const authenticatedClob = new ClobClient(
        CLOB_API_URL,
        POLYGON_CHAIN_ID,
        currentSigner,
        creds,
        2, // SIGNATURE_TYPE_SAFE
        currentSafeAddress,
        undefined, 
        false,
        builderConfig
      );
      
      const builderConfigRelayer = new BuilderConfig({
        remoteBuilderConfig: {
            url: typeof window !== 'undefined' ? `${window.location.origin}/api/polymarket/sign` : '',
        },
      });
      const relayer = new RelayClient(RELAYER_URL, POLYGON_CHAIN_ID, currentWalletClient, builderConfigRelayer);
      
      setRelayClient(relayer);
      setClobClient(authenticatedClob);
      setSessionStep("complete");
  }, []);


  // --- 2. Auto-Login Effect ---
  useEffect(() => {
    const attemptAutoLogin = async () => {
        if (!isConnected || !address || !signer || !walletClient || !safeAddress) return;
        if (chainId !== POLYGON_CHAIN_ID) return; // Don't try login if wrong chain

        if (isLoading || isReady) return;

        const storageKey = `polyai_session_${address}`;
        const storedCreds = localStorage.getItem(storageKey);

        if (storedCreds) {
            try {
                setSessionStep("checking"); 
                const creds = JSON.parse(storedCreds);
                console.log("Found stored session, restoring...");
                await setupClientWithCreds(creds, safeAddress, signer, walletClient);
            } catch (e) {
                console.error("Failed to restore session", e);
                localStorage.removeItem(storageKey); 
                setSessionStep("idle");
            }
        }
    };

    attemptAutoLogin();
  }, [isConnected, address, signer, walletClient, safeAddress, setupClientWithCreds, chainId]); 


  const initializeRelayer = useCallback(async () => {
    if (!walletClient) throw new Error("Wallet not connected");
    
    const builderConfig = new BuilderConfig({
      remoteBuilderConfig: {
        url: typeof window !== 'undefined' ? `${window.location.origin}/api/polymarket/sign` : '',
      },
    });

    return new RelayClient(RELAYER_URL, POLYGON_CHAIN_ID, walletClient, builderConfig);
  }, [walletClient]);


  const initializeSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSessionStep("checking");

    try {
      // FIX: Check Address first
      if (!address) throw new Error("Wallet not connected");

      // FIX: Check Chain BEFORE checking walletClient
      // If chain is wrong, walletClient is often undefined, causing the error in the original code
      if (chainId !== POLYGON_CHAIN_ID) {
        setSessionStep("idle");
        try {
            await switchChainAsync({ chainId: POLYGON_CHAIN_ID });
            // Important: Return here. switching chain forces a re-render. 
            // The user will click "Enable Trading" again once the chain is correct.
            setError("Network switched. Please click 'Enable Trading' again.");
            setIsLoading(false);
            return; 
        } catch (e) {
            throw new Error("Network switch failed");
        }
      }

      // Now it is safe to check for walletClient
      if (!walletClient) {
        // If we are on the right chain but client is missing, wait a moment or fail
        throw new Error("Wallet syncing... Please try again in a moment.");
      }

      if (!signer) {
        throw new Error("Signer not ready. Please try again.");
      }

      // 2. Relayer & Safe
      const relayer = await initializeRelayer();
      setRelayClient(relayer);

      if (!safeAddress) throw new Error("Could not derive Safe address");
      
      const isDeployed = await relayer.getDeployed(safeAddress);
      if (!isDeployed) {
        setSessionStep("deploying");
        const deployTx = await relayer.deploy();
        await deployTx.wait();
      }

      // 3. Approvals
      setSessionStep("approvals");
      const areApproved = await checkAllApprovals(safeAddress);
      if (!areApproved) {
        const txs = createApprovalTxs();
        const tx = await relayer.execute(txs);
        await tx.wait();
      }

      // 4. Credentials
      setSessionStep("credentials");
      const tempClob = new ClobClient(CLOB_API_URL, 137, signer);
      
      let creds: any = null;

      try {
        console.log("Attempting to derive existing API Key...");
        creds = await tempClob.deriveApiKey();
      } catch (e) {
        console.log("Derivation failed, attempting to create new API Key...");
        creds = await tempClob.createApiKey();
      }

      if (!creds || !creds.key) {
        throw new Error("Failed to obtain API Credentials");
      }

      // --- SAVE CREDS TO STORAGE ---
      localStorage.setItem(`polyai_session_${address}`, JSON.stringify(creds));

      // 5. Final Client Setup
      await setupClientWithCreds(creds, safeAddress, signer, walletClient);

    } catch (err: any) {
      console.error("Session Init Error:", err);
      const msg = err.message?.includes("User rejected") 
        ? "Transaction rejected." 
        : (err.response?.data?.error || err.message || "Failed to initialize session");
      
      setError(msg);
      setSessionStep("idle");
    } finally {
      // Only unset loading if we didn't return early due to chain switch
      if (chainId === POLYGON_CHAIN_ID) {
          setIsLoading(false);
      }
    }
  }, [address, walletClient, signer, safeAddress, chainId, switchChainAsync, initializeRelayer, setupClientWithCreds]);

  // --- 3. Logout Function ---
  const logout = useCallback(() => {
    if (address) {
        localStorage.removeItem(`polyai_session_${address}`);
    }
    setClobClient(null);
    setRelayClient(null);
    setSessionStep("idle");
  }, [address]);

  // Reset when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setClobClient(null);
      setRelayClient(null);
      setSessionStep("idle");
    }
  }, [isConnected]);

  const isReady = sessionStep === "complete";

  const transferUSDC = useCallback(async (amount: number): Promise<string> => {
    if (!relayClient || !safeAddress || !walletClient) {
      throw new Error("Trading session not active");
    }

    try {
      const amountBigInt = parseUnits(amount.toString(), USDC_DECIMALS);
      
      const tx = {
        to: USDC_E_ADDRESS,
        operation: OperationType.Call,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [TREASURY_ADDRESS as `0x${string}`, amountBigInt]
        }),
        value: "0",
      };

      console.log(`💸 Processing payment of ${amount} USDC from Safe...`);
      const txResult = await relayClient.execute([tx]);
      
      console.log("Payment submitted, waiting for confirmation...");
      await txResult.wait();
      
      console.log("Payment confirmed:", txResult.transactionHash);
      return txResult.transactionHash;

    } catch (e: any) {
      console.error("Payment failed:", e);
      throw new Error("Payment failed: " + (e.message || "Unknown error"));
    }
  }, [relayClient, safeAddress, walletClient]);

  return (
    <TradingContext.Provider value={{
      clobClient,
      relayClient,
      safeAddress,
      isReady,
      isLoading,
      sessionStep,
      error,
      initializeSession,
      logout,
      transferUSDC 
    }}>
      {children}
    </TradingContext.Provider>
  );
};