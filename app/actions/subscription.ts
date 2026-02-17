// app/actions/subscription.ts
"use server";

import { supabaseAdmin } from "../lib/supabase";
import { auth } from "@/auth";
import { createPublicClient, http, parseAbiItem, decodeEventLog } from "viem";
import { polygon } from "viem/chains";
import { POLYGON_RPC, USDC_E_ADDRESS, USDC_DECIMALS, TREASURY_ADDRESS } from "../lib/constants";
import { SUBSCRIPTION_TIERS, Tier } from "../types/subscription";

// Verify the transaction actually happened on Polygon and sent USDC to your treasury
async function verifyOnChainPayment(txHash: string, expectedAmount: number) {
  const client = createPublicClient({ chain: polygon, transport: http(POLYGON_RPC) });
  
  try {
    const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` });
    
    if (receipt.status !== "success") throw new Error("Transaction failed on-chain");

    // Filter logs for USDC Transfer to Treasury
    const transferLog = receipt.logs.find(log => 
      log.address.toLowerCase() === USDC_E_ADDRESS.toLowerCase()
    );

    if (!transferLog) throw new Error("No USDC transfer found in transaction");

    const decoded = decodeEventLog({
      abi: [parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)')],
      data: transferLog.data,
      topics: transferLog.topics
    });

    const toAddress = decoded.args.to.toLowerCase();
    const value = Number(decoded.args.value) / Math.pow(10, USDC_DECIMALS);

    // Validate destination and amount (allow small float variance)
    if (toAddress !== TREASURY_ADDRESS.toLowerCase()) {
        throw new Error(`Funds sent to wrong address: ${toAddress}`);
    }
    
    if (Math.abs(value - expectedAmount) > 0.1) {
        throw new Error(`Amount mismatch. Paid: ${value}, Expected: ${expectedAmount}`);
    }
    
    return true;
  } catch (e: any) {
    console.error("Verification failed:", e);
    throw new Error(e.message || "Payment verification failed");
  }
}

export async function upgradeSubscription(tierId: Tier, txHash: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Must be logged in to subscribe");

  const tierConfig = SUBSCRIPTION_TIERS[tierId];
  if (!tierConfig) throw new Error("Invalid Tier");

  // 1. Check Replay Attack (Has this hash been used?)
  const { data: existing } = await supabaseAdmin
    .from('payment_audit')
    .select('tx_hash')
    .eq('tx_hash', txHash)
    .single();

  if (existing) throw new Error("Transaction hash already processed");

  // 2. Verify On-Chain
  await verifyOnChainPayment(txHash, tierConfig.price);

  // 3. Calculate Expiration (Add 30 days to NOW, or extend existing if active)
  // Fetch current sub to see if we need to extend
  const { data: currentSub } = await supabaseAdmin
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', session.user.id)
    .single();

  const now = new Date();
  let newEndDate = new Date();
  
  // Logic: If user has valid sub, extend it. If expired/new, start from now.
  if (currentSub && new Date(currentSub.end_date) > now) {
    newEndDate = new Date(currentSub.end_date);
  }
  
  newEndDate.setDate(newEndDate.getDate() + 30); // Add 30 days

  // 4. Update Database (Audit + Subscription)
  // Note: We reset generation_count to 0 on upgrade/renewal
  
  const { error: auditError } = await supabaseAdmin.from('payment_audit').insert({
    tx_hash: txHash,
    user_id: session.user.id, // Supabase handles casting text -> uuid
    amount_usdc: tierConfig.price,
    tier_purchased: tierId
  });

  if (auditError) {
      console.error("Audit Error", auditError);
      throw new Error("Failed to record payment audit");
  }

  const { error: subError } = await supabaseAdmin
    .from('user_subscriptions')
    .upsert({
      user_id: session.user.id,
      tier: tierId,
      start_date: now.toISOString(), // simplified: strictly speaking start date shouldn't change on renewal, but this works for simple logic
      end_date: newEndDate.toISOString(),
      generation_count: 0, // Reset usage for the new period
      updated_at: now.toISOString()
    });

  if (subError) {
      console.error("Sub Error", subError);
      throw new Error("Failed to update subscription");
  }

  return { success: true };
}

export async function getUserSubscription(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;

  const isActive = new Date(data.end_date) > new Date();
  
  return {
    tier: data.tier as Tier,
    isActive,
    generation_count: data.generation_count,
    end_date: data.end_date
  };
}