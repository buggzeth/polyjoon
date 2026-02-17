// app/actions/subscription.ts
"use server";

import { supabaseAdmin } from "../lib/supabase";
import { auth } from "@/auth";
import { createPublicClient, http, parseAbiItem, decodeEventLog } from "viem";
import { polygon } from "viem/chains";
import { POLYGON_RPC, USDC_E_ADDRESS, USDC_DECIMALS, TREASURY_ADDRESS } from "../lib/constants";
import { CREDIT_PACKAGES, PackageId } from "../types/subscription";

// Helper: Verify On-Chain (Same as before, ensure variance is handled)
async function verifyOnChainPayment(txHash: string, expectedAmount: number) {
  const client = createPublicClient({ chain: polygon, transport: http(POLYGON_RPC) });
  
  try {
    const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` });
    if (receipt.status !== "success") throw new Error("Transaction failed on-chain");

    const transferLog = receipt.logs.find(log => 
      log.address.toLowerCase() === USDC_E_ADDRESS.toLowerCase()
    );
    if (!transferLog) throw new Error("No USDC transfer found");

    const decoded = decodeEventLog({
      abi: [parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)')],
      data: transferLog.data,
      topics: transferLog.topics
    });

    const toAddress = decoded.args.to.toLowerCase();
    const value = Number(decoded.args.value) / Math.pow(10, USDC_DECIMALS);

    if (toAddress !== TREASURY_ADDRESS.toLowerCase()) throw new Error(`Wrong destination: ${toAddress}`);
    if (Math.abs(value - expectedAmount) > 0.1) throw new Error(`Amount mismatch. Paid: ${value}, Expected: ${expectedAmount}`);
    
    return true;
  } catch (e: any) {
    console.error("Verification failed:", e);
    throw new Error(e.message || "Payment verification failed");
  }
}

export async function purchaseCredits(packageId: PackageId, txHash: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Must be logged in");

  const pack = CREDIT_PACKAGES[packageId];
  if (!pack) throw new Error("Invalid Package");

  // 1. Audit Check
  const { data: existing } = await supabaseAdmin
    .from('payment_audit')
    .select('tx_hash')
    .eq('tx_hash', txHash)
    .single();

  if (existing) throw new Error("Transaction hash already processed");

  // 2. Verify Payment
  await verifyOnChainPayment(txHash, pack.price);

  // 3. Record Audit
  await supabaseAdmin.from('payment_audit').insert({
    tx_hash: txHash,
    user_id: session.user.id,
    amount_usdc: pack.price,
    item_purchased: packageId // Changed from tier_purchased to generic item
  });

  // 4. Update Credits (Fetch current, add new)
  const { data: currentCredit } = await supabaseAdmin
    .from('user_credits')
    .select('balance')
    .eq('user_id', session.user.id)
    .single();
  
  const newBalance = (currentCredit?.balance || 0) + pack.credits;

  const { error } = await supabaseAdmin
    .from('user_credits')
    .upsert({
      user_id: session.user.id,
      balance: newBalance,
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error("Credit update error", error);
    throw new Error("Failed to add credits");
  }

  return { success: true, newBalance };
}