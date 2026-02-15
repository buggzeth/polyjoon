// app/hooks/useTrialLimit.ts
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

const TRIAL_COOKIE_NAME = "nuke_last_free_gen";
const USER_LIMIT_COOKIE = "nuke_user_usage";
const COOLDOWN_HOURS = 24;

export function useTrialLimit() {
  const { data: session } = useSession();
  const [data, setData] = useState({
    limit: 1,
    used: 0,
    remaining: 0,
    isAvailable: true,
    nextRefillText: "",
    percent: 0
  });

  const getCookie = (name: string) => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) return decodeURIComponent(match[2]);
    return null;
  };

  const calculate = () => {
    // 1. Logged In User Logic
    if (session) {
      const usageVal = getCookie(USER_LIMIT_COOKIE);
      const used = usageVal ? parseInt(usageVal, 10) : 0;
      const limit = 5; // Operator Mode Limit
      const remaining = Math.max(0, limit - used);
      
      setData({
        limit,
        used,
        remaining,
        isAvailable: remaining > 0,
        nextRefillText: remaining > 0 ? "Ready" : "24h Limit Reached",
        percent: (remaining / limit) * 100
      });
      return;
    }

    // 2. Guest Logic
    const limit = 1;
    const lastUsedTimestamp = getCookie(TRIAL_COOKIE_NAME);

    if (!lastUsedTimestamp) {
      setData({ limit, used: 0, remaining: 1, isAvailable: true, nextRefillText: "Ready", percent: 100 });
      return;
    }

    const lastDate = new Date(lastUsedTimestamp);
    // Invalid Date check
    if (isNaN(lastDate.getTime())) {
        setData({ limit, used: 0, remaining: 1, isAvailable: true, nextRefillText: "Ready", percent: 100 });
        return;
    }

    const now = new Date();
    const diffMs = now.getTime() - lastDate.getTime();
    const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;

    if (diffMs < cooldownMs) {
      // Cooldown Active
      const remainingMs = cooldownMs - diffMs;
      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      
      setData({
        limit,
        used: 1,
        remaining: 0,
        isAvailable: false,
        nextRefillText: `${hours}h ${mins}m`,
        percent: 0
      });
    } else {
      // Available
      setData({ limit, used: 0, remaining: 1, isAvailable: true, nextRefillText: "Ready", percent: 100 });
    }
  };

  useEffect(() => {
    calculate();
    window.addEventListener("trial_updated", calculate);
    const interval = setInterval(calculate, 60000);
    return () => {
      clearInterval(interval);
      window.removeEventListener("trial_updated", calculate);
    };
  }, [session]);

  return data;
}