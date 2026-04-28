# x402 × クリプトカード / x402 × Crypto Card

AIエージェントがx402プロトコルでUSDCを稼ぎ、そのままRain バーチャルVisaカードで実世界の決済に使う——完全ループのデモアプリ。

> A demo app where an AI agent earns USDC via the x402 protocol and spends it instantly via a Rain virtual Visa card — the full earn-to-spend loop in one flow.

```
Japan Data API (x402)
  → AI agent sells data, receives USDC
  → USDC pools in Crossmint AgentWallet
  → Rain API issues a virtual Visa card
  → AgentWallet funds the card
  → Spend at 150M+ Visa merchants worldwide
```

---

## なぜ作ったか / Background

以前の記事でRain × CrossmintによるバーチャルVisaカードのAPI発行を紹介し、別途x402プロトコルで日本の天気・為替・株価データを売る[apijapan.vercel.app](https://apijapan.vercel.app)を作っていました。

この2つを繋げれば「AIエージェントがAPIでUSDCを稼いで、そのままカードで使う」最小デモが作れると気づいたのが出発点。クリプトと実世界の決済が一本のフローで繋がります。

> I had previously written about Rain × Crossmint's virtual Visa card issuance API, and separately built [apijapan.vercel.app](https://apijapan.vercel.app) — a Japan data API (weather, FX, stocks) gated by the x402 protocol. Connecting the two creates the smallest possible demo of an AI agent earning USDC and spending it immediately in the real world.

---

## 技術スタック / Tech Stack

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

## ダッシュボード構成 / Dashboard

4ステップを1画面で表示。各ステップはリアルタイムにAPIを叩いてライブデータを返します。

> Four steps on a single page, each wired to a live API call.

**STEP 1 — EARN**
`apijapan.vercel.app` にx402でAPIコール。1コール $0.001 USDC を支払い、天気データを取得。実際には売り手側がUSDCを受け取る側になる想定。

> Calls `apijapan.vercel.app` with an x402 payment header. $0.001 USDC per call. In production, the API seller receives this USDC.

**STEP 2 — WALLET**
Crossmint AgentWalletのUSDC残高をリアルタイム表示。x402で稼いだUSDCがここにプールされます。

> Displays live Crossmint AgentWallet USDC balance. Earned USDC accumulates here.

**STEP 3 — CARD**
Rain APIでバーチャルVisaカードを発行。ウォレット残高をカードにチャージ。

> Issues a Rain virtual Visa card and funds it from the AgentWallet balance.

**STEP 4 — SPEND**
カードがアクティブになり世界中のVisa加盟店で使用可能な状態を表示。

> Card is active and ready to use at any Visa merchant worldwide.

---

## APIルート / API Routes

```
POST /api/earn         — x402でapijapan.vercel.appを呼び出しUSDC獲得
GET  /api/wallet       — CrossmintのAgentWallet USDC残高取得
POST /api/card/issue   — RainのバーチャルVisaカード発行
GET  /api/card/status  — カード残高・トランザクション取得
POST /api/fund         — AgentWallet → カードへUSDC送金
```

---

## プロジェクト構成 / Project Structure

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

### x402決済フロー / x402 Payment Flow (`lib/x402-client.ts`)

1. `apijapan.vercel.app` にGETリクエスト → **HTTP 402** が返る
2. レスポンスボディの `accepts[]` からUSDC支払い要件を抽出
3. `x402` パッケージの `createSigner` + `createPaymentHeader` でEIP-3009 `transferWithAuthorization` に署名
4. `X-PAYMENT` ヘッダーを付けてリクエストをリトライ → データ取得成功

> Standard x402 flow: receive 402 → parse `accepts[]` → sign EIP-3009 authorization → retry with `X-PAYMENT` header.

---

## セットアップ / Quick Start

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

### 環境変数 / Environment Variables

| Variable | Description |
|---|---|
| `CROSSMINT_API_KEY` | crossmint.com コンソールのサーバーAPIキー |
| `CROSSMINT_WALLET_LOCATOR` | AgentWalletのロケータ文字列 |
| `CROSSMINT_ENV` | `staging`（デフォルト）or `production` |
| `RAIN_API_KEY` | Rainサンドボックスのアクセストークン |
| `RAIN_ENV` | `sandbox`（デフォルト）or `production` |
| `WALLET_PRIVATE_KEY` | x402支払い署名用ウォレットの秘密鍵（0x-prefixed hex） |
| `NEXT_PUBLIC_CHAIN` | `base-sepolia`（testnet） |

---

## テストネットの動作確認フロー / Testnet Walkthrough

1. `WALLET_PRIVATE_KEY` のアドレスに [Circle Faucet](https://faucet.circle.com/) でBase Sepolia USDCを補充
2. **Trigger Earn** → 東京の天気データ取得 + $0.001 USDC 支払い
3. **Refresh Balance** → ウォレット残高の変化を確認
4. **Issue Virtual Card** → Rainサンドボックスカードを発行
5. 金額を入力して **Fund Card** → ウォレットからカードにUSDC送金
6. カードが **ACTIVE** になり、Visa加盟店で使用可能な状態に

---

## デプロイ / Deploy to Vercel

```bash
vercel deploy
```

Vercelのプロジェクト設定で上記の環境変数をすべて設定してからデプロイしてください。

> Set all environment variables in Vercel project settings before deploying.

---

## 現在の状況 / Current Status

- [x] GitHubへのプッシュ完了
- [x] TypeScriptコンパイル確認（`next build` クリーン）
- [ ] Crossmint APIキー設定
- [ ] Rain サンドボックスキー設定（発行に数日かかる場合あり）
- [ ] Vercelデプロイ・testnet実動確認
- [ ] Colosseum Frontier hackathon 提出

> Push and clean build complete. Pending: API key setup, Vercel deploy, and testnet end-to-end verification before Colosseum Frontier submission.

---

## Colosseum Frontier

Solanaのハッカソン **Colosseum Frontier** への提出を予定しています。x402 × Solana USDC × バーチャルVisaカードという組み合わせで、AIエージェントの決済インフラとしての可能性を示すデモとして提出します。

> Targeting submission to the **Colosseum Frontier** Solana hackathon — demonstrating x402 × Solana USDC × virtual Visa card as payment infrastructure for AI agents.

---

## 関連リンク / Related

- [apijapan.vercel.app](https://apijapan.vercel.app) — x402-gated Japan data API (self-built)
- [crossmint.com](https://crossmint.com) — AgentWallet & virtual card API
- [rain.com](https://rain.com) — Virtual Visa card issuance
- [x402.org](https://x402.org) — x402 protocol spec
