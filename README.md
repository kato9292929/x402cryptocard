# x402 × Crypto Card / x402 × クリプトカード

A demo app where an AI agent earns USDC via the x402 protocol and spends it instantly via a Rain virtual Visa card — the full earn-to-spend loop in one flow.

> AIエージェントがx402プロトコルでUSDCを稼ぎ、そのままRain バーチャルVisaカードで実世界の決済に使う——完全ループのデモアプリ。

```
Japan Data API (x402)
  → AI agent sells data, receives USDC
  → USDC pools in Crossmint AgentWallet
  → Rain API issues a virtual Visa card
  → AgentWallet funds the card
  → Spend at 150M+ Visa merchants worldwide
```

---

## Background / なぜ作ったか

I had previously written about Rain × Crossmint's virtual Visa card issuance API, and separately built [apijapan.vercel.app](https://apijapan.vercel.app) — a Japan data API (weather, FX, stocks) gated by the x402 protocol. Connecting the two creates the smallest possible demo of an AI agent earning USDC and spending it immediately in the real world. Crypto and real-world payments in a single flow.

> 以前の記事でRain × CrossmintによるバーチャルVisaカードのAPI発行を紹介し、別途x402プロトコルで日本の天気・為替・株価データを売る[apijapan.vercel.app](https://apijapan.vercel.app)を作っていました。この2つを繋げれば「AIエージェントがAPIでUSDCを稼いで、そのままカードで使う」最小デモが作れると気づいたのが出発点。クリプトと実世界の決済が一本のフローで繋がります。

---

## Tech Stack / 技術スタック

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router + TypeScript |
| Payment protocol | x402 (HTTP 402 + EIP-3009 USDC signing) |
| Wallet | Crossmint AgentWallet (REST API) |
| Card | Rain virtual Visa (sandbox) |
| Data API | apijapan.vercel.app (self-built, x402-gated) |
| Chain | Base Sepolia (testnet) |
| Styling | Tailwind CSS v4 |
| Deploy | Vercel |

---

## Dashboard / ダッシュボード構成

Four steps on a single page, each wired to a live API call.

> 4ステップを1画面で表示。各ステップはリアルタイムにAPIを叩いてライブデータを返します。

**STEP 1 — EARN**
Calls `apijapan.vercel.app` with an x402 payment header. $0.001 USDC per call. In production, the API seller receives this USDC.

> `apijapan.vercel.app` にx402でAPIコール。1コール $0.001 USDC を支払い天気データを取得。実際には売り手側がUSDCを受け取る側になる想定。

**STEP 2 — WALLET**
Displays live Crossmint AgentWallet USDC balance. Earned USDC accumulates here.

> Crossmint AgentWalletのUSDC残高をリアルタイム表示。x402で稼いだUSDCがここにプールされます。

**STEP 3 — CARD**
Issues a Rain virtual Visa card and funds it from the AgentWallet balance.

> Rain APIでバーチャルVisaカードを発行。ウォレット残高をカードにチャージ。

**STEP 4 — SPEND**
Card is active and ready to use at any Visa merchant worldwide.

> カードがアクティブになり世界中のVisa加盟店で使用可能な状態を表示。

---

## API Routes / APIルート

```
POST /api/earn         — x402 payment → apijapan.vercel.app, earn USDC
GET  /api/wallet       — Crossmint AgentWallet USDC balance
POST /api/card/issue   — Issue Rain virtual Visa card
GET  /api/card/status  — Card balance + recent transactions
POST /api/fund         — Transfer USDC: AgentWallet → card
```

---

## Project Structure / プロジェクト構成

```
app/
  page.tsx                  — Dashboard UI (4-step, live data, dark theme)
  api/
    earn/route.ts           — POST: x402 payment → apijapan.vercel.app
    wallet/route.ts         — GET:  Crossmint AgentWallet balance
    card/
      issue/route.ts        — POST: Rain virtual Visa card issuance
      status/route.ts       — GET:  card balance + transactions
    fund/route.ts           — POST: AgentWallet → card USDC transfer
lib/
  x402-client.ts            — HTTP 402 handling + EIP-3009 payment signing
  crossmint.ts              — Crossmint REST API wrapper (wallet, transfer)
  rain.ts                   — Rain REST API client (issue, status, funding)
```

### x402 Payment Flow (`lib/x402-client.ts`)

1. GET `apijapan.vercel.app` → server returns **HTTP 402**
2. Parse USDC payment requirements from response body `accepts[]`
3. Sign EIP-3009 `transferWithAuthorization` via `x402` package (`createSigner` + `createPaymentHeader`)
4. Retry request with `X-PAYMENT` header → data returned

> 1. `apijapan.vercel.app` にGETリクエスト → **HTTP 402** が返る / 2. `accepts[]` からUSDC支払い要件を抽出 / 3. EIP-3009 `transferWithAuthorization` に署名 / 4. `X-PAYMENT` ヘッダーを付けてリトライ → データ取得成功

---

## Quick Start / セットアップ

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env.local
# Fill in your API keys (see below)

# 3. Dev server
npm run dev
# → http://localhost:3000
```

### Environment Variables / 環境変数

| Variable | Description |
|---|---|
| `CROSSMINT_API_KEY` | Server API key from crossmint.com console |
| `CROSSMINT_WALLET_LOCATOR` | AgentWallet locator string |
| `CROSSMINT_ENV` | `staging` (default) or `production` |
| `RAIN_API_KEY` | Rain sandbox access token |
| `RAIN_ENV` | `sandbox` (default) or `production` |
| `WALLET_PRIVATE_KEY` | Wallet private key for x402 payment signing (0x-prefixed hex) |
| `NEXT_PUBLIC_CHAIN` | `base-sepolia` (testnet) |

---

## Testnet Walkthrough / テストネットの動作確認フロー

1. Fund your `WALLET_PRIVATE_KEY` address with Base Sepolia USDC via the [Circle Faucet](https://faucet.circle.com/)
2. Click **Trigger Earn** → fetches Tokyo weather data, pays $0.001 USDC
3. Click **Refresh Balance** → confirm wallet balance updated
4. Click **Issue Virtual Card** → creates a Rain sandbox card
5. Enter an amount and click **Fund Card** → transfers USDC from wallet to card
6. Card shows **ACTIVE** — ready to use at any Visa merchant

> 1. Circle FaucetでBase Sepolia USDCを補充 / 2. **Trigger Earn** で天気データ取得 + $0.001 USDC支払い / 3. **Refresh Balance** で残高変化を確認 / 4. **Issue Virtual Card** でRainサンドボックスカードを発行 / 5. **Fund Card** でウォレット→カードにUSDC送金 / 6. カードが **ACTIVE** になりVisa加盟店で使用可能に

---

## Deploy to Vercel / デプロイ

```bash
vercel deploy
```

Set all environment variables in Vercel project settings before deploying.

> Vercelのプロジェクト設定で上記の環境変数をすべて設定してからデプロイしてください。

---

## Current Status / 現在の状況

- [x] Pushed to GitHub
- [x] Clean TypeScript build (`next build` passes)
- [ ] Crossmint API key setup
- [ ] Rain sandbox key setup (may take a few days to provision)
- [ ] Vercel deploy + testnet end-to-end verification
- [ ] Colosseum Frontier hackathon submission

> GitHubプッシュ・ビルド確認済み。APIキー設定・Vercelデプロイ・testnet実動確認後にColosseum Frontier提出予定。

---

## Colosseum Frontier

Targeting submission to the **Colosseum Frontier** Solana hackathon — demonstrating x402 × Solana USDC × virtual Visa card as payment infrastructure for AI agents.

> Solanaのハッカソン **Colosseum Frontier** への提出を予定しています。x402 × Solana USDC × バーチャルVisaカードという組み合わせで、AIエージェントの決済インフラとしての可能性を示すデモとして提出します。

---

## Related / 関連リンク

- [apijapan.vercel.app](https://apijapan.vercel.app) — x402-gated Japan data API (self-built)
- [crossmint.com](https://crossmint.com) — AgentWallet & virtual card API
- [rain.com](https://rain.com) — Virtual Visa card issuance
- [x402.org](https://x402.org) — x402 protocol spec
