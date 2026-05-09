# x402 Crypto Card

A demo app that completes the full agentic commerce loop:
- Earn USDC by calling Japan market data API via x402 protocol
- Hold USDC in a Solana wallet
- Issue a Nevermined Agent Card (virtual Visa)
- Spend at 150M+ Visa merchants worldwide

Live demo: [x402cryptocard.vercel.app](https://x402cryptocard.vercel.app)

## Tech Stack

- Next.js 15 App Router + TypeScript
- x402 Protocol (`@x402/fetch` + `@x402/svm` — official SDK)
- Nevermined DelegationAPI (Agent Card via Stripe → Visa)
- Japan Data API ([apijapan.vercel.app](https://apijapan.vercel.app)) — x402-enabled weather, FX, stock data (powered by `@x402/next`)
- Solana (devnet USDC wallet)
- Vercel (deployment)

## How it works

**Step 1 — EARN:** Agent calls [apijapan.vercel.app](https://apijapan.vercel.app) using `@x402/fetch`. On receiving a 402, the SDK automatically signs a Solana SPL token transfer and retries. Server verifies payment and returns data.

**Step 2 — WALLET:** Earned USDC accumulates in the Solana wallet derived from `WALLET_PRIVATE_KEY`. Real-time balance visible on dashboard.

**Step 3 — AGENT CARD:** Issue a Nevermined delegation (Agent Card) backed by an enrolled Stripe card. Existing active delegations are reused automatically.

**Step 4 — SPEND:** The Agent Card is a virtual Visa (Stripe → Visa network). Ready to use at any Visa merchant. Budget and transaction count visible on dashboard.

## x402 Payment Flow

```
Agent → GET /api/weather/tokyo
Server → 402  PAYMENT-REQUIRED: <base64 JSON with price, payTo, network>
Agent → GET /api/weather/tokyo  PAYMENT-SIGNATURE: <signed Solana tx>
Server → verify on-chain → 200 { data }
```

## API Routes

```
/api/earn        — x402 call to apijapan.vercel.app, returns weather data
/api/wallet      — Solana USDC balance for the payment wallet
/api/card/issue  — Issue (or reuse) a Nevermined Agent Card delegation
/api/card/status — Card balance, spending limit, and transaction count
```

## Setup

```bash
git clone https://github.com/kato9292929/x402cryptocard
cd x402cryptocard
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

```
WALLET_PRIVATE_KEY=   # base58 Solana keypair (used for x402 signing + wallet display)
NVM_API_KEY=          # from app.nevermined.app
NVM_ENV=              # "live" (default) or "testing"
SOLANA_RPC_URL=       # optional, defaults to https://api.devnet.solana.com
```

```bash
npm run dev
```

## Current Status

- [x] Project scaffolded
- [x] x402 Earn flow working (`@x402/fetch` + `@x402/svm`)
- [x] Solana wallet balance display
- [x] Nevermined Agent Card issuance (idempotent — reuses existing delegation)
- [x] Spend panel live (Visa via Nevermined, Ready: Yes, $10.00 budget)
- [x] Deployed to Vercel

## Related Projects

- [Japan Data API](https://apijapan.vercel.app) — x402-enabled Japan market data
- [ConsultingAPI](https://github.com/kato9292929/ConsultingAPI) — x402 gateway middleware for Japanese API companies
- [x402jp.com](https://x402jp.com) — x402 Inc. Japan hub

## Hackathon

Submitted to Colosseum Frontier (Solana hackathon). Category: AI Agent Payments / DePIN.

## Built by

[x402 Inc.](https://x402jp.com) — AI-native payment infrastructure for the APEC region.

---

# x402 クリプトカード

AIエージェントの完全な商取引ループをデモするアプリです。

- x402プロトコルで日本のマーケットデータAPIを呼び出してUSDCを稼ぐ
- 稼いだUSDCをSolanaウォレットに保持する
- NeverminedのAgent Card（バーチャルVisa）を発行する
- 世界1億5000万以上のVisa加盟店で使用できる

## 技術スタック

- Next.js 15 App Router + TypeScript
- x402プロトコル（`@x402/fetch` + `@x402/svm` — 公式SDK）
- Nevermined DelegationAPI（Agent Card via Stripe → Visa）
- Japan Data API（[apijapan.vercel.app](https://apijapan.vercel.app)）— x402対応の天気・為替・株価データ（`@x402/next`使用）
- Solana（devnet USDCウォレット）
- Vercel（デプロイ）

## 仕組み

**Step 1 — EARN：** `@x402/fetch`を使ってJapan Data APIを呼び出します。402が返ってくると、SDKが自動でSolana SPLトークン送金に署名してリトライします。サーバーが支払いを検証してデータを返します。

**Step 2 — WALLET：** 稼いだUSDCが`WALLET_PRIVATE_KEY`から導出されたSolanaウォレットに蓄積されます。ダッシュボードでリアルタイムの残高を確認できます。

**Step 3 — AGENT CARD：** Neverminedの委任（Agent Card）を発行します。登録済みのStripeカードに紐づけられたバーチャルVisaです。既にActive状態の委任がある場合は自動で再利用されます。

**Step 4 — SPEND：** Agent CardはStripe→Visaネットワーク経由のバーチャルVisaカードです。Visa加盟店であればどこでも使用可能。予算と利用回数がダッシュボードに表示されます。

## x402決済フロー

```
Agent → GET /api/weather/tokyo
Server → 402  PAYMENT-REQUIRED: <base64 JSON（価格・送金先・ネットワーク情報）>
Agent → GET /api/weather/tokyo  PAYMENT-SIGNATURE: <署名済みSolanaトランザクション>
Server → オンチェーン検証 → 200 { data }
```

## APIルート

```
/api/earn        — Japan Data APIへのx402コール、天気データを返す
/api/wallet      — 支払いウォレットのSolana USDC残高
/api/card/issue  — Nevermined Agent Cardの発行（既存があれば再利用）
/api/card/status — カード残高・利用限度額・トランザクション数
```

## セットアップ

```bash
git clone https://github.com/kato9292929/x402cryptocard
cd x402cryptocard
npm install
cp .env.example .env.local
```

`.env.local` に以下を記入してください。

```
WALLET_PRIVATE_KEY=   # base58形式のSolanaキーペア（x402署名・ウォレット表示に使用）
NVM_API_KEY=          # app.nevermined.appで取得
NVM_ENV=              # "live"（デフォルト）または "testing"
SOLANA_RPC_URL=       # 省略可。デフォルトは https://api.devnet.solana.com
```

```bash
npm run dev
```

## 現在の状況

- [x] プロジェクトのスキャフォールド完了
- [x] x402 Earnフロー動作確認（`@x402/fetch` + `@x402/svm`）
- [x] Solanaウォレット残高表示
- [x] Nevermined Agent Card発行（冪等性あり — 既存の委任を再利用）
- [x] Spendパネル稼働（Visa via Nevermined、Ready: Yes、$10.00予算）
- [x] Vercelへのデプロイ完了

## 関連プロジェクト

- [Japan Data API](https://apijapan.vercel.app) — x402対応の日本マーケットデータAPI
- [ConsultingAPI](https://github.com/kato9292929/ConsultingAPI) — 日本のAPI企業向けx402ゲートウェイミドルウェア
- [x402jp.com](https://x402jp.com) — x402 Inc. 日本ハブ

## ハッカソン

Colosseum Frontier（Solanaハッカソン）に提出しました。カテゴリー：AIエージェント決済 / DePIN。

## 開発者

[x402 Inc.](https://x402jp.com) — APECリージョン向けAIネイティブ決済インフラ。
