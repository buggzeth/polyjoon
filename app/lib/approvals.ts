import { createPublicClient, http, encodeFunctionData, erc20Abi } from "viem";
import { OperationType, SafeTransaction } from "@polymarket/builder-relayer-client";
import { polygon } from "viem/chains";
import { 
  USDC_E_ADDRESS, 
  CTF_CONTRACT_ADDRESS, 
  CTF_EXCHANGE_ADDRESS, 
  NEG_RISK_CTF_EXCHANGE_ADDRESS, 
  MAX_UINT256,
  POLYGON_RPC
} from "./constants";

const erc1155Abi = [
  {
    inputs: [{ name: "operator", type: "address" }, { name: "approved", type: "bool" }],
    name: "setApprovalForAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }, { name: "operator", type: "address" }],
    name: "isApprovedForAll",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Use explicit RPC to avoid default transport issues
const publicClient = createPublicClient({ 
  chain: polygon, 
  transport: http(POLYGON_RPC) 
});

const USDC_SPENDERS = [CTF_EXCHANGE_ADDRESS, NEG_RISK_CTF_EXCHANGE_ADDRESS];
const CTF_SPENDERS = [CTF_EXCHANGE_ADDRESS, NEG_RISK_CTF_EXCHANGE_ADDRESS];

export const checkAllApprovals = async (safeAddress: string) => {
  try {
    // Check USDC Allowances
    const usdcChecks = await Promise.all(USDC_SPENDERS.map(spender => 
      publicClient.readContract({
        address: USDC_E_ADDRESS as `0x${string}`,
        abi: erc20Abi,
        functionName: "allowance",
        args: [safeAddress as `0x${string}`, spender as `0x${string}`],
      })
    ));

    // Check CTF Operator Approvals
    const ctfChecks = await Promise.all(CTF_SPENDERS.map(spender => 
      publicClient.readContract({
        address: CTF_CONTRACT_ADDRESS as `0x${string}`,
        abi: erc1155Abi,
        functionName: "isApprovedForAll",
        args: [safeAddress as `0x${string}`, spender as `0x${string}`],
      })
    ));

    const allUsdcApproved = usdcChecks.every(val => val >= BigInt("1000000000")); // > 1000 USDC
    const allCtfApproved = ctfChecks.every(val => val === true);

    return allUsdcApproved && allCtfApproved;
  } catch (e) {
    console.error("Approval Check Failed", e);
    return false;
  }
};

export const createApprovalTxs = (): SafeTransaction[] => {
  const txs: SafeTransaction[] = [];

  USDC_SPENDERS.forEach(spender => {
    txs.push({
      to: USDC_E_ADDRESS,
      operation: OperationType.Call,
      data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [spender as `0x${string}`, BigInt(MAX_UINT256)] }),
      value: "0",
    });
  });

  CTF_SPENDERS.forEach(spender => {
    txs.push({
      to: CTF_CONTRACT_ADDRESS,
      operation: OperationType.Call,
      data: encodeFunctionData({ abi: erc1155Abi, functionName: "setApprovalForAll", args: [spender as `0x${string}`, true] }),
      value: "0",
    });
  });

  return txs;
};