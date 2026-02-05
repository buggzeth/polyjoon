// app/providers.tsx
"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { WagmiProvider } from 'wagmi'
import { config } from './lib/config'
import { TradingProvider } from './contexts/TradingContext'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <TradingProvider>
          {children}
        </TradingProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}