// app/hooks/useTrialLimit.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getUserSubscription } from "../actions/subscription"; // Ensure this action exists
import { getUserDailyUsage } from "../actions/storage"; // Ensure this action exists
import { SUBSCRIPTION_TIERS } from "../types/subscription";

const TRIAL_COOKIE_NAME = "nuke_last_free_gen";
const COOLDOWN_HOURS = 24;

export function useTrialLimit() {
  const { data: session } = useSession();
  const [data, setData] = useState({
    limit: 1,
    used: 0,
    remaining: 0,
    isAvailable: true,
    nextRefillText: "",
    percent: 0,
    isSubscribed: false,
    tierName: "Guest"
  });

  const getCookie = (name: string) => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) return decodeURIComponent(match[2]);
    return null;
  };

  const calculate = useCallback(async () => {
    // 1. LOGGED IN USER LOGIC
    if (session?.user?.id) {
        try {
            // A. Check Subscription
            const sub = await getUserSubscription(session.user.id);

            if (sub && sub.isActive && sub.tier !== 'free') {
                const tierConfig = SUBSCRIPTION_TIERS[sub.tier];
                const limit = tierConfig.limit;
                const used = sub.generation_count;
                const remaining = Math.max(0, limit - used);
                
                // Format Date for refill text
                const endDate = new Date(sub.end_date);
                const refillText = `Refills ${endDate.toLocaleDateString()}`;

                setData({
                    limit,
                    used,
                    remaining,
                    isAvailable: remaining > 0,
                    nextRefillText: refillText,
                    percent: (remaining / limit) * 100,
                    isSubscribed: true,
                    tierName: tierConfig.name
                });
                return;
            }

            // B. Free Tier (Daily Limit)
            const dailyUsed = await getUserDailyUsage(session.user.id);
            const dailyLimit = 5;
            const remaining = Math.max(0, dailyLimit - dailyUsed);

            setData({
                limit: dailyLimit,
                used: dailyUsed,
                remaining,
                isAvailable: remaining > 0,
                nextRefillText: "Resets daily",
                percent: (remaining / dailyLimit) * 100,
                isSubscribed: false,
                tierName: "Operator"
            });

        } catch (e) {
            console.error("Error fetching usage stats", e);
        }
        return;
    }

    // 2. GUEST LOGIC (Cookie based)
    const limit = 1;
    const lastUsedTimestamp = getCookie(TRIAL_COOKIE_NAME);

    if (!lastUsedTimestamp) {
      setData({ 
          limit, used: 0, remaining: 1, isAvailable: true, 
          nextRefillText: "Ready", percent: 100, 
          isSubscribed: false, tierName: "Guest" 
      });
      return;
    }

    const lastDate = new Date(lastUsedTimestamp);
    if (isNaN(lastDate.getTime())) {
        setData({ 
            limit, used: 0, remaining: 1, isAvailable: true, 
            nextRefillText: "Ready", percent: 100,
            isSubscribed: false, tierName: "Guest" 
        });
        return;
    }

    const now = new Date();
    const diffMs = now.getTime() - lastDate.getTime();
    const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;

    if (diffMs < cooldownMs) {
      const remainingMs = cooldownMs - diffMs;
      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      
      setData({
        limit,
        used: 1,
        remaining: 0,
        isAvailable: false,
        nextRefillText: `${hours}h ${mins}m`,
        percent: 0,
        isSubscribed: false, 
        tierName: "Guest"
      });
    } else {
      setData({ 
          limit, used: 0, remaining: 1, isAvailable: true, 
          nextRefillText: "Ready", percent: 100,
          isSubscribed: false, tierName: "Guest" 
      });
    }
  }, [session]);

  useEffect(() => {
    calculate();
    // Listen for custom event to trigger re-fetch after payment/generation
    window.addEventListener("trial_updated", calculate);
    const interval = setInterval(calculate, 60000); // Check every minute
    return () => {
      clearInterval(interval);
      window.removeEventListener("trial_updated", calculate);
    };
  }, [calculate]);

  return data;
}