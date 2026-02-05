// app/lib/config.ts
// app/lib/config.ts
import { http, createConfig } from 'wagmi'
import { polygon } from 'wagmi/chains'
import { injected, safe } from 'wagmi/connectors'

export const config = createConfig({
  chains: [polygon],
  connectors: [
    injected(),
  ],
  transports: {
    [polygon.id]: http(),
  },
  ssr: true,
})