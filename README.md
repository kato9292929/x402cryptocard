# x402 Loop

Live demo of the complete agentic commerce cycle:

```
Japan Data API (x402) → USDC earned → Crossmint AgentWallet → Rain Virtual Visa → spend anywhere
```

Built for the **x402 Inc. Colosseum Frontier hackathon** submission.

## Architecture

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router + TypeScript |
| Payment protocol | x402 (HTTP 402 + USDC) |
| Wallet | Crossmint AgentWallet |
| Card | Rain virtual Visa (sandbox) |
| Chain | Base Sepolia (testnet) |
| Styling | Tailwind CSS v4 |
| Deploy | Vercel |

## How it works

1. **Earn** — The app calls `apijapan.vercel.app/api/weather/tokyo` which returns HTTP 402. The server reads the payment requirements, signs a USDC `transferWithAuthorization` (EIP-3009) using the configured wallet private key, and retries with the `X-PAYMENT` header.

2. **Wallet** — The Crossmint AgentWallet holds the USDC balance. The dashboard shows live balance via the Crossmint REST API.

3. **Card** — A Rain virtual Visa card is issued via the Rain sandbox API. The card's on-chain funding address is used to top it up from the AgentWallet.

4. **Spend** — The active card can be used at 150M+ Visa merchants worldwide.

## Quick start

```bash
# 1. Clone and install
npm install

# 2. Configure environment
cp .env.example .env.local
# edit .env.local with your real API keys

# 3. Run dev server
npm run dev
```

Open `http://localhost:3000` to see the dashboard.

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Description |
|---|---|
| `CROSSMINT_API_KEY` | Server API key from crossmint.com console |
| `CROSSMINT_WALLET_LOCATOR` | AgentWallet locator string |
| `CROSSMINT_ENV` | `staging` or leave blank for production |
| `RAIN_API_KEY` | Rain sandbox API key |
| `RAIN_ENV` | `sandbox` (default) or `production` |
| `WALLET_PRIVATE_KEY` | Hex private key for x402 payment signing (0x-prefixed) |
| `NEXT_PUBLIC_CHAIN` | `base-sepolia` for testnet |

## Project structure

```
app/
  page.tsx              — Dashboard UI (4-step loop, live data)
  api/
    earn/route.ts       — POST: x402 payment to apijapan.vercel.app
    wallet/route.ts     — GET:  Crossmint balance
    card/
      issue/route.ts    — POST: Issue Rain virtual card
      status/route.ts   — GET:  Card balance + transactions
    fund/route.ts       — POST: AgentWallet → card transfer
lib/
  x402-client.ts        — x402 HTTP 402 payment flow
  crossmint.ts          — Crossmint REST API wrapper
  rain.ts               — Rain REST API client
```

## Testnet flow walkthrough

1. Fund your `WALLET_PRIVATE_KEY` address with Base Sepolia USDC from the [Circle faucet](https://faucet.circle.com/).
2. Open the dashboard and click **Trigger Earn** — this calls the Tokyo weather API, pays $0.001 USDC, and shows the response.
3. Click **Refresh Balance** to confirm the USDC balance updated.
4. Click **Issue Virtual Card** to create a Rain sandbox card.
5. Enter an amount and click **Fund Card** to transfer USDC from your wallet to the card.
6. The card shows as **ACTIVE** and is ready to use on the Visa network.

## Deploy to Vercel

```bash
vercel deploy
```

Set all environment variables in the Vercel project settings before deploying.
