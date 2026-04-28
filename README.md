# x402 × Crypto Card

A demo app where an AI agent earns USDC via the x402 protocol and spends it instantly via a Rain virtual Visa card — the full earn-to-spend loop in one flow.

```
Japan Data API (x402)
  → AI agent sells data, receives USDC
  → USDC pools in Crossmint AgentWallet
  → Rain API issues a virtual Visa card
  → AgentWallet funds the card
  → Spend at 150M+ Visa merchants worldwide
```

## Background

I had previously written about Rain × Crossmint's virtual Visa card issuance API, and separately built [apijapan.vercel.app](https://apijapan.vercel.app) — a Japan data API (weather, FX, stocks) gated by the x402 protocol. Connecting the two creates the smallest possible demo of an AI agent earning USDC and spending it immediately in the real world. Crypto and real-world payments in a single flow.

## Tech Stack

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

## Dashboard

Four steps on a single page, each wired to a live API call.

**STEP 1 — EARN**
Calls `apijapan.vercel.app` with an x402 payment header. $0.001 USDC per call. In production, the API seller receives this USDC.

**STEP 2 — WALLET**
Displays live Crossmint AgentWallet USDC balance. Earned USDC accumulates here.

**STEP 3 — CARD**
Issues a Rain virtual Visa card and funds it from the AgentWallet balance.

**STEP 4 — SPEND**
Card is active and ready to use at any Visa merchant worldwide.

## API Routes

```
POST /api/earn         — x402 payment → apijapan.vercel.app, earn USDC
GET  /api/wallet       — Crossmint AgentWallet USDC balance
POST /api/card/issue   — Issue Rain virtual Visa card
GET  /api/card/status  — Card balance + recent transactions
POST /api/fund         — Transfer USDC: AgentWallet → card
```

## Project Structure

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

## Quick Start

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

### Environment Variables

| Variable | Description |
|---|---|
| `CROSSMINT_API_KEY` | Server API key from crossmint.com console |
| `CROSSMINT_WALLET_LOCATOR` | AgentWallet locator string |
| `CROSSMINT_ENV` | `staging` (default) or `production` |
| `RAIN_API_KEY` | Rain sandbox access token |
| `RAIN_ENV` | `sandbox` (default) or `production` |
| `WALLET_PRIVATE_KEY` | Wallet private key for x402 payment signing (0x-prefixed hex) |
| `NEXT_PUBLIC_CHAIN` | `base-sepolia` (testnet) |

## Testnet Walkthrough

1. Fund your `WALLET_PRIVATE_KEY` address with Base Sepolia USDC via the [Circle Faucet](https://faucet.circle.com/)
2. Click **Trigger Earn** → fetches Tokyo weather data, pays $0.001 USDC
3. Click **Refresh Balance** → confirm wallet balance updated
4. Click **Issue Virtual Card** → creates a Rain sandbox card
5. Enter an amount and click **Fund Card** → transfers USDC from wallet to card
6. Card shows **ACTIVE** — ready to use at any Visa merchant

## Deploy to Vercel

```bash
vercel deploy
```

Set all environment variables in Vercel project settings before deploying.

## Current Status

- [x] Pushed to GitHub
- [x] Clean TypeScript build (`next build` passes)
- [ ] Crossmint API key setup
- [ ] Rain sandbox key setup (may take a few days to provision)
- [ ] Vercel deploy + testnet end-to-end verification
- [ ] Colosseum Frontier hackathon submission

## Colosseum Frontier

Targeting submission to the **Colosseum Frontier** Solana hackathon — demonstrating x402 × Solana USDC × virtual Visa card as payment infrastructure for AI agents.

## Related Links

- [apijapan.vercel.app](https://apijapan.vercel.app) — x402-gated Japan data API (self-built)
- [crossmint.com](https://crossmint.com) — AgentWallet & virtual card API
- [rain.com](https://rain.com) — Virtual Visa card issuance
- [x402.org](https://x402.org) — x402 protocol spec

---

# x402 × クリプトカード

x402プロトコルでAPIを売ってUSDCを稼ぎ、そのUSDCをそのままRainのバーチャルVisaカードに変換して実世界で使う——「稼いで使う」完全ループのデモアプリ。

```
Japan Data API（x402）
  → AIエージェントがデータを売ってUSDCを受け取る
  → Crossmint AgentWalletにUSDCがプール
  → Rain APIでバーチャルVisaカードを発行
  → ウォレット残高をカードにチャージ
  → 世界1億5000万以上のVisa加盟店で使える
```

## なぜ作ったか

以前の記事でRain × CrossmintによるバーチャルVisaカードのAPI発行を紹介し、別途x402プロトコルで日本の天気・為替・株価データを売る[apijapan.vercel.app](https://apijapan.vercel.app)を作っていました。この2つを繋げれば「AIエージェントがAPIでUSDCを稼いで、そのままカードで使う」最小デモが作れると気づいたのが出発点。クリプトと実世界の決済が一本のフローで繋がります。

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フレームワーク | Next.js 15 App Router + TypeScript |
| 決済プロトコル | x402（HTTP 402 + EIP-3009 USDC署名） |
| ウォレット | Crossmint AgentWallet（REST API） |
| カード | Rain バーチャルVisa（サンドボックス） |
| データAPI | apijapan.vercel.app（自作・x402ゲート） |
| チェーン | Base Sepolia（テストネット） |
| スタイリング | Tailwind CSS v4 |
| デプロイ | Vercel |

## ダッシュボード構成

4ステップを1画面で表示。各ステップはリアルタイムにAPIを叩いてライブデータを返します。

**STEP 1 — EARN**
`apijapan.vercel.app` にx402でAPIコール。1コール $0.001 USDC を支払い天気データを取得。実際には売り手側がUSDCを受け取る側になる想定。

**STEP 2 — WALLET**
Crossmint AgentWalletのUSDC残高をリアルタイム表示。x402で稼いだUSDCがここにプールされます。

**STEP 3 — CARD**
Rain APIでバーチャルVisaカードを発行。ウォレット残高をカードにチャージ。

**STEP 4 — SPEND**
カードがアクティブになり世界中のVisa加盟店で使用可能な状態を表示。

## APIルート

```
POST /api/earn         — x402でapijapan.vercel.appを呼び出しUSDC獲得
GET  /api/wallet       — CrossmintのAgentWallet USDC残高取得
POST /api/card/issue   — RainのバーチャルVisaカード発行
GET  /api/card/status  — カード残高・トランザクション取得
POST /api/fund         — AgentWallet → カードへUSDC送金
```

## プロジェクト構成

```
app/
  page.tsx                  — ダッシュボードUI（4ステップ・ライブデータ・ダークテーマ）
  api/
    earn/route.ts           — POST: x402決済 → apijapan.vercel.app
    wallet/route.ts         — GET:  Crossmint AgentWallet残高
    card/
      issue/route.ts        — POST: Rainバーチャルカード発行
      status/route.ts       — GET:  カード残高・トランザクション
    fund/route.ts           — POST: AgentWallet → カードへUSDC送金
lib/
  x402-client.ts            — HTTP 402ハンドリング + EIP-3009署名
  crossmint.ts              — Crossmint REST APIラッパー（残高・送金）
  rain.ts                   — Rain REST APIクライアント（発行・ステータス・チャージ）
```

### x402決済フロー（`lib/x402-client.ts`）

1. `apijapan.vercel.app` にGETリクエスト → **HTTP 402** が返る
2. レスポンスボディの `accepts[]` からUSDC支払い要件を抽出
3. `x402` パッケージの `createSigner` + `createPaymentHeader` でEIP-3009 `transferWithAuthorization` に署名
4. `X-PAYMENT` ヘッダーを付けてリクエストをリトライ → データ取得成功

## セットアップ

```bash
# 1. インストール
npm install

# 2. 環境変数設定
cp .env.example .env.local
# APIキーを記入（下記参照）

# 3. 開発サーバー起動
npm run dev
# → http://localhost:3000
```

### 環境変数

| 変数名 | 説明 |
|---|---|
| `CROSSMINT_API_KEY` | crossmint.com コンソールのサーバーAPIキー |
| `CROSSMINT_WALLET_LOCATOR` | AgentWalletのロケータ文字列 |
| `CROSSMINT_ENV` | `staging`（デフォルト）or `production` |
| `RAIN_API_KEY` | Rainサンドボックスのアクセストークン |
| `RAIN_ENV` | `sandbox`（デフォルト）or `production` |
| `WALLET_PRIVATE_KEY` | x402支払い署名用ウォレットの秘密鍵（0x-prefixed hex） |
| `NEXT_PUBLIC_CHAIN` | `base-sepolia`（テストネット） |

## テストネット動作確認フロー

1. `WALLET_PRIVATE_KEY` のアドレスに [Circle Faucet](https://faucet.circle.com/) でBase Sepolia USDCを補充
2. **Trigger Earn** → 東京の天気データ取得 + $0.001 USDC 支払い
3. **Refresh Balance** → ウォレット残高の変化を確認
4. **Issue Virtual Card** → Rainサンドボックスカードを発行
5. 金額を入力して **Fund Card** → ウォレットからカードにUSDC送金
6. カードが **ACTIVE** になりVisa加盟店で使用可能に

## Vercelへのデプロイ

```bash
vercel deploy
```

Vercelのプロジェクト設定で上記の環境変数をすべて設定してからデプロイしてください。

## 現在の状況

- [x] GitHubへのプッシュ完了
- [x] TypeScriptビルド確認済み（`next build` クリーン）
- [ ] Crossmint APIキー設定
- [ ] Rain サンドボックスキー設定（発行に数日かかる場合あり）
- [ ] Vercelデプロイ・testnet実動確認
- [ ] Colosseum Frontier hackathon 提出

## Colosseum Frontier

Solanaのハッカソン **Colosseum Frontier** への提出を予定しています。x402 × Solana USDC × バーチャルVisaカードという組み合わせで、AIエージェントの決済インフラとしての可能性を示すデモとして提出します。

## 関連リンク

- [apijapan.vercel.app](https://apijapan.vercel.app) — x402対応の日本データAPI（自作）
- [crossmint.com](https://crossmint.com) — AgentWallet・バーチャルカードAPI
- [rain.com](https://rain.com) — バーチャルVisaカード発行
- [x402.org](https://x402.org) — x402プロトコル仕様
