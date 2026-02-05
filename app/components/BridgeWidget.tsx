// app/components/BridgeWidget.tsx
"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useTrading } from "../contexts/TradingContext";
import { bridgeApi } from "../lib/bridge-api";
import { SupportedAsset, QuoteResponse, TransactionStatus } from "../types/bridge";
import { parseUnits, formatUnits, encodeFunctionData, erc20Abi } from "viem";
import { USDC_E_ADDRESS } from "../lib/constants";
import { OperationType } from "@polymarket/builder-relayer-client";
import TokenSelector from "./TokenSelector"; // <--- Import Component
import CrabSpinner from "./CrabSpinner";

const POLYMARKET_CHAIN_ID = "137";
const POLYMARKET_USDC_ADDRESS = USDC_E_ADDRESS;

export default function BridgeWidget() {
  const { address: userAddress } = useAccount();
  const { safeAddress, relayClient, isReady } = useTrading();
  
  const [mode, setMode] = useState<"DEPOSIT" | "WITHDRAW">("DEPOSIT");
  const [assets, setAssets] = useState<SupportedAsset[]>([]);
  
  // Selection State
  const [selectedAsset, setSelectedAsset] = useState<SupportedAsset | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [recipient, setRecipient] = useState<string>(""); 
  
  // Async State
  const [isLoading, setIsLoading] = useState(false);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [bridgeAddress, setBridgeAddress] = useState<string | null>(null);
  const [bridgeAddressType, setBridgeAddressType] = useState<"evm" | "svm" | "btc">("evm");
  const [status, setStatus] = useState<TransactionStatus | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    bridgeApi.getSupportedAssets().then(data => {
      setAssets(data.supportedAssets);
      const defaultAsset = data.supportedAssets.find(a => a.chainId === "1" && a.token.symbol === "USDC");
      if (defaultAsset) setSelectedAsset(defaultAsset);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedAsset) return;
    const chainId = parseInt(selectedAsset.chainId);
    if (chainId === 1151111081099710) setBridgeAddressType("svm"); 
    else if (selectedAsset.chainName.toLowerCase().includes("bitcoin")) setBridgeAddressType("btc");
    else setBridgeAddressType("evm");
  }, [selectedAsset]);

  // --- ACTIONS (Unchanged) ---
  const handleGetQuote = async () => {
    if (!selectedAsset || !amount || !safeAddress) return;
    setIsLoading(true);
    setQuote(null);
    try {
      const amountBase = parseUnits(amount, selectedAsset.token.decimals).toString();
      
      const payload = mode === "DEPOSIT" ? {
        fromAmountBaseUnit: amountBase,
        fromChainId: selectedAsset.chainId,
        fromTokenAddress: selectedAsset.token.address,
        recipientAddress: safeAddress,
        toChainId: POLYMARKET_CHAIN_ID,
        toTokenAddress: POLYMARKET_USDC_ADDRESS
      } : {
        fromAmountBaseUnit: parseUnits(amount, 6).toString(),
        fromChainId: POLYMARKET_CHAIN_ID,
        fromTokenAddress: POLYMARKET_USDC_ADDRESS,
        recipientAddress: recipient || userAddress!,
        toChainId: selectedAsset.chainId,
        toTokenAddress: selectedAsset.token.address
      };

      const q = await bridgeApi.getQuote(payload);
      setQuote(q);
    } catch (e) {
      console.error(e);
      alert("Failed to get quote. Ensure amount is above minimum.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartBridge = async () => {
    if (!safeAddress || !selectedAsset) return;
    setIsLoading(true);
    try {
      let addrResponse;
      if (mode === "DEPOSIT") {
        addrResponse = await bridgeApi.createDepositAddress(safeAddress);
      } else {
        const destAddr = recipient || userAddress!;
        addrResponse = await bridgeApi.createWithdrawAddress(
          safeAddress, 
          selectedAsset.chainId,
          selectedAsset.token.address,
          destAddr
        );
      }
      const targetAddr = mode === "DEPOSIT" 
        ? addrResponse.address[bridgeAddressType]
        : addrResponse.address.evm;

      setBridgeAddress(targetAddr);
      setStatus("DEPOSIT_DETECTED"); 
      
      if (mode === "WITHDRAW" && relayClient && quote) {
        const usdcAmount = parseUnits(amount, 6);
        const tx = {
            to: USDC_E_ADDRESS,
            value: "0",
            data: encodeFunctionData({
                abi: erc20Abi,
                functionName: "transfer",
                args: [targetAddr as `0x${string}`, usdcAmount]
            }),
            operation: OperationType.Call
        };
        await relayClient.execute([tx]);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to initiate bridge session.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- POLLING STATUS (Unchanged) ---
  useEffect(() => {
    if (!bridgeAddress) return;
    const poll = async () => {
      try {
        const data = await bridgeApi.getStatus(bridgeAddress);
        if (data.transactions.length > 0) {
          const latest = data.transactions[0];
          setStatus(latest.status);
          if (latest.txHash) setTxHash(latest.txHash);
          if (latest.status === "COMPLETED" || latest.status === "FAILED") return true;
        }
      } catch (e) { console.error("Polling error", e); }
      return false;
    };
    const interval = setInterval(async () => {
        const finished = await poll();
        if (finished) clearInterval(interval);
    }, 5000);
    return () => clearInterval(interval);
  }, [bridgeAddress]);

  const reset = () => {
    setQuote(null);
    setBridgeAddress(null);
    setStatus(null);
    setTxHash(null);
  };

  const getStatusColor = (s: string) => {
    switch (s) {
        case "COMPLETED": return "text-lime-400";
        case "FAILED": return "text-rose-400";
        default: return "text-orange-400 animate-pulse";
    }
  };

  return (
    <div className="bg-zinc-900 border border-orange-900/20 rounded-2xl shadow-xl max-w-lg w-full mx-auto relative z-10">
        {/* TABS */}
        <div className="grid grid-cols-2 border-b border-orange-900/20">
            <button 
                onClick={() => { setMode("DEPOSIT"); reset(); }}
                // Added 'rounded-tl-2xl'
                className={`py-4 text-sm font-bold transition-colors rounded-tl-2xl ${mode === "DEPOSIT" ? "bg-orange-900/20 text-white" : "text-slate-500 hover:text-slate-300"}`}
            >
                DEPOSIT
            </button>
            <button 
                onClick={() => { setMode("WITHDRAW"); reset(); }}
                // Added 'rounded-tr-2xl'
                className={`py-4 text-sm font-bold transition-colors rounded-tr-2xl ${mode === "WITHDRAW" ? "bg-orange-900/20 text-white" : "text-slate-500 hover:text-slate-300"}`}
            >
                WITHDRAW
            </button>
        </div>

        <div className="p-6 space-y-6">
            
            {/* 1. ASSET SELECTION REPLACED */}
            <div className="space-y-4">
                <TokenSelector 
                    assets={assets}
                    selectedAsset={selectedAsset}
                    onSelect={(asset) => {
                        setSelectedAsset(asset);
                        reset();
                    }}
                    label={mode === "DEPOSIT" ? "Deposit From (External Chain)" : "Withdraw To (Destination)"}
                />

                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">
                        Amount ({selectedAsset?.token.symbol || "Token"})
                    </label>
                    <input 
                        type="number" 
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => { setAmount(e.target.value); reset(); }}
                        className="w-full bg-zinc-950 border border-orange-900/20 rounded-sm px-4 py-3 text-lg font-mono text-white focus:outline-none focus:border-indigo-500"
                    />
                    {selectedAsset && (
                        <div className="text-right mt-1">
                            <span className="text-[10px] text-slate-500">
                                Min: ${selectedAsset.minCheckoutUsd} USD
                            </span>
                        </div>
                    )}
                </div>

                {mode === "WITHDRAW" && (
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">
                            Recipient Address (Optional)
                        </label>
                        <input 
                            type="text" 
                            placeholder={userAddress || "0x..."}
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            className="w-full bg-zinc-950 border border-orange-900/20 rounded-sm px-4 py-3 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">Defaults to your connected wallet if empty.</p>
                    </div>
                )}
            </div>

            {/* Rest of the component (Step 2 & 3) remains exactly the same as previous file... */}
            {/* 2. QUOTE & ACTION */}
            {amount && selectedAsset && !bridgeAddress && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    {!quote ? (
                        <button
                            onClick={handleGetQuote}
                            disabled={isLoading}
                            className="w-full bg-orange-600 hover:bg-indigo-500 disabled:bg-zinc-900 disabled:border disabled:border-orange-900/20 text-white font-bold py-3 rounded-sm transition-all disabled:opacity-50 min-h-[50px]"
                        >
                            {isLoading ? (
                                <div className="flex justify-center"><CrabSpinner size="sm" /></div>
                            ) : "Get Quote"}
                        </button>
                    ) : (
                        <div className="bg-zinc-950/50 rounded-sm p-4 border border-orange-900/20 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-400">Est. Time</span>
                                <span className="text-slate-200">~{Math.ceil(quote.estCheckoutTimeMs / 1000)}s</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-400">Fees</span>
                                <span className="text-slate-200">${quote.estFeeBreakdown.totalImpactUsd.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm border-t border-orange-900/20 pt-2">
                                <span className="text-zinc-400">You Receive</span>
                                <span className="text-lime-400 font-mono font-bold">
                                    {mode === "DEPOSIT" ? formatUnits(BigInt(quote.estToTokenBaseUnit), 6) : formatUnits(BigInt(quote.estToTokenBaseUnit), selectedAsset.token.decimals)} {mode === "DEPOSIT" ? "USDC.e" : selectedAsset.token.symbol}
                                </span>
                            </div>

                            <button
                                onClick={handleStartBridge}
                                disabled={isLoading || (mode === "WITHDRAW" && !isReady)}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-900 disabled:border disabled:border-emerald-900/20 text-white font-bold py-3 rounded-sm transition-all disabled:opacity-50 mt-2 min-h-[50px]"
                            >
                                {isLoading ? (
                                    <div className="flex justify-center items-center gap-2">
                                        <CrabSpinner size="sm" />
                                        <span className="text-xs">INITIATING WORMHOLE...</span>
                                    </div>
                                ) : mode === "WITHDRAW" ? "Send & Withdraw" : "Generate Deposit Address"}
                            </button>
                            {mode === "WITHDRAW" && !isReady && (
                                <p className="text-xs text-rose-400 text-center">Enable Trading (Session) to withdraw.</p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* 3. EXECUTION & STATUS */}
            {bridgeAddress && (
                <div className="bg-zinc-950 rounded-sm border border-indigo-500/30 p-4 space-y-4 animate-in zoom-in-95">
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/20 text-orange-400 font-bold mb-2 text-xs">Step 1</div>
                        <h3 className="text-sm font-bold text-white mb-1">{mode === "DEPOSIT" ? "Send Funds Here" : "Withdrawal Initiated"}</h3>
                        <p className="text-xs text-zinc-400">
                            {mode === "DEPOSIT" ? `Send exact amount of ${selectedAsset?.token.symbol} on ${selectedAsset?.chainName}.` : "Funds are being sent from your Safe to the Bridge."}
                        </p>
                    </div>

                    {mode === "DEPOSIT" && (
                        <div className="bg-zinc-900 p-3 rounded border border-orange-900/20 flex items-center justify-between gap-2">
                            <code className="text-xs text-slate-300 font-mono break-all">{bridgeAddress}</code>
                            <button onClick={() => navigator.clipboard.writeText(bridgeAddress)} className="text-xs text-orange-400 hover:text-indigo-300 font-bold">COPY</button>
                        </div>
                    )}

                    <div className="border-t border-orange-900/20 pt-4">
                         <div className="text-center mb-3">
                            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 text-lime-400 font-bold mb-2 text-xs">Step 2</div>
                            <div className={`text-sm font-bold uppercase tracking-wider ${getStatusColor(status || "")}`}>{status?.replace(/_/g, " ") || "WAITING FOR TX..."}</div>
                         </div>
                         {status === "COMPLETED" && (
                            <div className="text-center bg-emerald-950/30 border border-emerald-500/20 rounded p-2">
                                <p className="text-xs text-emerald-200">Bridge Complete!</p>
                                {txHash && <a href={mode === "DEPOSIT" ? `https://polygonscan.com/tx/${txHash}` : "#"} target="_blank" className="text-[10px] text-emerald-500 hover:underline block mt-1">View Transaction</a>}
                            </div>
                         )}
                    </div>
                </div>
            )}

            <div className="text-[10px] text-slate-600 text-center px-4">
                Powered by Polymarket Bridge. Assets are converted to USDC.e on Polygon (Safe Wallet) automatically.
            </div>
        </div>
    </div>
  );
}