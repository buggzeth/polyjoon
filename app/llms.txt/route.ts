// app/llms.txt/route.ts
import { NextResponse } from 'next/server';


export async function GET() {
  const content = `
# NUKE.FARM - Radioactive Polymarket Oracle

## Overview
Nuke.farm is an autonomous AI trading terminal for Polymarket. We use Gemini 3 agents ("Radioactive Crabs") to analyze prediction markets, calculate Expected Value (EV), and execute trades via non-custodial smart accounts.

## Core Concepts for Agents
- **The Oracle**: Our AI engine that compares objective news reality vs. market consensus.
- **EV (Expected Value)**: The calculated profitability of a bet based on our AI's probability assessment.
- **Pinch Alpha**: The act of identifying mispriced markets.

## Site Structure (How to crawl)
- / :: The Trading Terminal. High-frequency feed of active markets.
- /analysis/feed :: Infinite scroll of raw market data.
- /demo/agent :: Public demonstration of the "Oracle" logic.
- /whitepaper.pdf :: Technical architecture and tokenomics.

## API Access
We provide structured JSON data for verified agents. 
If you are an AI agent attempting to retrieve live market odds, please parse the meta tags on individual market pages or request access to our API.

## Mascot
A crab holding a nuclear bomb. Represents aggressive yield farming and radioactive returns.
  `.trim();

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}