# x402 Crypto Card

A demo app that completes the full agentic commerce loop:
- Earn USDC by selling Japan market data via x402 protocol
- Accumulate USDC in a Crossmint AgentWallet
- Issue a Rain virtual Visa card
- Fund the card from the wallet
- Spend at 150M+ Visa merchants worldwide

## Tech Stack

- Next.js 15 App Router + TypeScript
- x402 Protocol (HTTP 402 payment standard)
- Crossmint API (AgentWallet + card management)
- Rain API (virtual Visa card issuance)
- Japan Data API ([apijapan.vercel.app](https://apijapan.vercel.app)) — x402-enabled weather, FX, stock data
- Vercel (deployment)

## How it works

**Step 1 — EARN:** Agent calls [apijapan.vercel.app](https://apijapan.vercel.app) with X-PAYMENT header containing signed USDC transfer. Server verifies on-chain, returns data. $0.001 USDC per call.

**Step 2 — WALLET:** Earned USDC accumulates in Crossmint AgentWallet. Real-time balance visible on dashboard.

**Step 3 — CARD:** Issue a Rain virtual Visa card via Crossmint. Card is linked to the AgentWallet.

**Step 4 — SPEND:** Fund the card from wallet balance. Card is ready to use at any Visa merchant.

## x402 Payment Flow

```
Agent → GET /api/weather/tokyo
Server → 402 { "price": "0.001 USDC", "payTo": "...", "chain": "solana" }
Agent → GET /api/weather/tokyo + X-PAYMENT: <signed SPL transfer>
Server → verify on-chain → 200 { data }
USDC → Crossmint AgentWallet
```

## API Routes

```
/api/earn        — x402 call to apijapan.vercel.app, returns data + wallet balance
/api/wallet      — Crossmint AgentWallet USDC balance
/api/card/issue  — Issue Rain virtual Visa card
/api/card/status — Card balance and recent transactions
/api/fund        — Transfer USDC from AgentWallet to card
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
CROSSMINT_API_KEY=        # from crossmint.com
CROSSMINT_WALLET_LOCATOR= # your AgentWallet locator
RAIN_API_KEY=             # from Rain sandbox
NEXT_PUBLIC_CHAIN=base-sepolia
```

```bash
npm run dev
```

## Current Status

- [x] Project scaffolded (1,153 lines generated)
- [x] Pushed to GitHub
- [ ] Crossmint API key setup
- [ ] Rain sandbox API key (may take a few days)
- [ ] Vercel deployment
- [ ] Testnet end-to-end flow verified

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

- x402プロトコルで日本のマーケットデータを販売してUSDCを稼ぎます
- 稼いだUSDCをCrossmint AgentWalletに蓄積します
- RainのバーチャルVisaカードを発行します
- ウォレット残高をカードにチャージします
- 世界1億5000万以上のVisa加盟店で使用できます

## 技術スタック

- Next.js 15 App Router + TypeScript
- x402プロトコル（HTTP 402決済標準）
- Crossmint API（AgentWallet + カード管理）
- Rain API（バーチャルVisaカード発行）
- Japan Data API（[apijapan.vercel.app](https://apijapan.vercel.app)）— x402対応の天気・為替・株価データ
- Vercel（デプロイ）

## 仕組み

**Step 1 — EARN：** エージェントがX-PAYMENTヘッダー（署名済みUSDC送金）を付けて[apijapan.vercel.app](https://apijapan.vercel.app)を呼び出します。サーバーがオンチェーンで検証し、データを返します。1コールあたり$0.001 USDCです。

**Step 2 — WALLET：** 稼いだUSDCがCrossmint AgentWalletに蓄積されます。ダッシュボードでリアルタイムの残高を確認できます。

**Step 3 — CARD：** CrossmintでRainのバーチャルVisaカードを発行します。カードはAgentWalletと連携します。

**Step 4 — SPEND：** ウォレット残高からカードにチャージします。カードはVisa加盟店であればどこでも使用できます。

## x402決済フロー

```
Agent → GET /api/weather/tokyo
Server → 402 { "price": "0.001 USDC", "payTo": "...", "chain": "solana" }
Agent → GET /api/weather/tokyo + X-PAYMENT: <signed SPL transfer>
Server → verify on-chain → 200 { data }
USDC → Crossmint AgentWallet
```

## APIルート

```
/api/earn        — apijapan.vercel.appへのx402コール、データとウォレット残高を返す
/api/wallet      — Crossmint AgentWalletのUSDC残高
/api/card/issue  — RainバーチャルVisaカードの発行
/api/card/status — カード残高と直近のトランザクション
/api/fund        — AgentWalletからカードへのUSDC送金
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
CROSSMINT_API_KEY=        # crossmint.comで取得
CROSSMINT_WALLET_LOCATOR= # AgentWalletのロケータ文字列
RAIN_API_KEY=             # Rainサンドボックスで取得
NEXT_PUBLIC_CHAIN=base-sepolia
```

```bash
npm run dev
```

## 現在の状況

- [x] プロジェクトのスキャフォールド完了（1,153行生成）
- [x] GitHubへのプッシュ完了
- [ ] Crossmint APIキーの設定
- [ ] RainサンドボックスAPIキーの取得（数日かかる場合があります）
- [ ] Vercelへのデプロイ
- [ ] テストネットでのエンドツーエンド動作確認

## 関連プロジェクト

- [Japan Data API](https://apijapan.vercel.app) — x402対応の日本マーケットデータAPI
- [ConsultingAPI](https://github.com/kato9292929/ConsultingAPI) — 日本のAPI企業向けx402ゲートウェイミドルウェア
- [x402jp.com](https://x402jp.com) — x402 Inc. 日本ハブ

## ハッカソン

Colosseum Frontier（Solanaハッカソン）に提出しました。カテゴリー：AIエージェント決済 / DePIN。

## 開発者

[x402 Inc.](https://x402jp.com) — APECリージョン向けAIネイティブ決済インフラ。
