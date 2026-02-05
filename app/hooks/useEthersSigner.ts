// app/hooks/useEthersSigner.ts
"use client";

import { useMemo } from 'react'
import { providers } from 'ethers'
import { useWalletClient } from 'wagmi'

export function clientToSigner(client: any) {
  const { transport, account } = client
  
  // MATCHING REFERENCE PATTERN:
  // Do not pass 'network' object. Let Web3Provider auto-detect from transport.
  // This prevents chainId mismatches between Wagmi config and Ethers provider.
  const provider = new providers.Web3Provider(transport)
  const signer = provider.getSigner(account.address)
  return signer
}

export function useEthersSigner({ chainId }: { chainId?: number } = {}) {
  const { data: client } = useWalletClient({ chainId })
  return useMemo(() => (client ? clientToSigner(client) : undefined), [client])
}