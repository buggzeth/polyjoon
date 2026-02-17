// app/hooks/useTrialLimit.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getUserDailyUsage, getUserCreditBalance } from "../actions/storage"; // Update imports

const TRIAL_COOKIE_NAME = "nuke_last_free_gen";
const USER_DAILY_LIMIT = 5;

export function useTrialLimit() {
  const { data: session } = useSession();
  const [data, setData] = useState({
    limit: 1,
    used: 0,
    remaining: 0,
    credits: 0,
    isAvailable: true,
    statusText: "",
    percent: 0,
    mode: "guest" as "guest" | "free_daily" | "credits"
  });

  const getCookie = (name: string) => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  };

  const calculate = useCallback(async () => {
    // 1. LOGGED IN USER
    if (session?.user?.id) {
        try {
            const dailyUsed = await getUserDailyUsage(session.user.id);
            const credits = await getUserCreditBalance(session.user.id);
            
            const dailyRemaining = Math.max(0, USER_DAILY_LIMIT - dailyUsed);

            if (dailyRemaining > 0) {
                // Show Daily Status
                setData({
                    limit: USER_DAILY_LIMIT,
                    used: dailyUsed,
                    remaining: dailyRemaining,
                    credits,
                    isAvailable: true,
                    statusText: `${dailyRemaining} Daily Left`,
                    percent: (dailyRemaining / USER_DAILY_LIMIT) * 100,
                    mode: "free_daily"
                });
            } else {
                // Show Credit Status
                setData({
                    limit: credits, 
                    used: 0,
                    remaining: credits,
                    credits,
                    isAvailable: credits > 0,
                    statusText: `${credits} Credits`,
                    percent: credits > 0 ? 100 : 0,
                    mode: "credits"
                });
            }
        } catch (e) {
            console.error("Stats fetch error", e);
        }
        return;
    }

    // 2. GUEST (Cookie)
    const lastUsedTimestamp = getCookie(TRIAL_COOKIE_NAME);
    // ... (Keep existing guest logic) ...
    if (!lastUsedTimestamp) {
       setData({ limit: 1, used: 0, remaining: 1, credits: 0, isAvailable: true, statusText: "Guest Trial", percent: 100, mode: "guest" });
       return;
    }
    const diff = Date.now() - new Date(lastUsedTimestamp).getTime();
    const cooldown = 24 * 3600 * 1000;
    
    if (diff < cooldown) {
        setData({ limit: 1, used: 1, remaining: 0, credits: 0, isAvailable: false, statusText: "Refills 24h", percent: 0, mode: "guest" });
    } else {
        setData({ limit: 1, used: 0, remaining: 1, credits: 0, isAvailable: true, statusText: "Guest Trial", percent: 100, mode: "guest" });
    }
  }, [session]);

  useEffect(() => {
    calculate();
    window.addEventListener("trial_updated", calculate);
    return () => window.removeEventListener("trial_updated", calculate);
  }, [calculate]);

  return data;
}