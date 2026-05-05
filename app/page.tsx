"use client";

import { useState, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WalletData {
  address: string;
  formatted: string;
  chain: string;
}

interface CardData {
  id: string;
  maskedNumber: string;
  expMonth: string;
  expYear: string;
  status: string;
  balance: string;
  lastFour: string;
}

interface EarnResult {
  weatherData: unknown;
  payment: {
    amountPaid: string;
    asset: string;
    network: string;
    payTo: string;
  };
  walletBalance: { formatted: string; address: string };
}

type StepStatus = "idle" | "loading" | "success" | "error";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusDot({ status }: { status: StepStatus }) {
  const colors: Record<StepStatus, string> = {
    idle: "bg-zinc-600",
    loading: "bg-yellow-400 animate-pulse",
    success: "bg-emerald-400",
    error: "bg-red-400",
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status]}`} />;
}

function ArrowRight() {
  return (
    <div className="hidden md:flex items-center justify-center text-zinc-500 text-2xl font-light">
      →
    </div>
  );
}

interface StepCardProps {
  step: number;
  title: string;
  subtitle: string;
  status: StepStatus;
  children: React.ReactNode;
}

function StepCard({ step, title, subtitle, status, children }: StepCardProps) {
  const borderColor: Record<StepStatus, string> = {
    idle: "border-zinc-700",
    loading: "border-yellow-500/60",
    success: "border-emerald-500/60",
    error: "border-red-500/60",
  };

  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl border bg-zinc-900 p-5 transition-colors duration-300 ${borderColor[status]}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
            Step {step}
          </span>
          <h2 className="mt-1 text-lg font-semibold text-white">{title}</h2>
          <p className="text-sm text-zinc-400">{subtitle}</p>
        </div>
        <StatusDot status={status} />
      </div>
      {children}
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between rounded-lg bg-zinc-800 px-3 py-2 text-sm">
      <span className="text-zinc-400">{label}</span>
      <span className="font-mono text-zinc-100 truncate max-w-[60%] text-right">{value}</span>
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  loading,
  children,
  variant = "primary",
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const base =
    "w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "bg-indigo-600 hover:bg-indigo-500 text-white"
      : "bg-zinc-700 hover:bg-zinc-600 text-zinc-100";

  return (
    <button onClick={onClick} disabled={disabled || loading} className={`${base} ${styles}`}>
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Processing…
        </span>
      ) : (
        children
      )}
    </button>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-red-950/50 border border-red-800 px-3 py-2 text-xs text-red-300 font-mono break-all">
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Home() {
  // Step 1 — Earn
  const [earnStatus, setEarnStatus] = useState<StepStatus>("idle");
  const [earnError, setEarnError] = useState<string | null>(null);
  const [earnResult, setEarnResult] = useState<EarnResult | null>(null);

  // Step 2 — Wallet
  const [walletStatus, setWalletStatus] = useState<StepStatus>("idle");
  const [walletError, setWalletError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);

  // Step 3 — Card
  const [cardStatus, setCardStatus] = useState<StepStatus>("idle");
  const [cardError, setCardError] = useState<string | null>(null);
  const [card, setCard] = useState<CardData | null>(null);

  // Fund sub-step
  const [fundStatus, setFundStatus] = useState<StepStatus>("idle");
  const [fundError, setFundError] = useState<string | null>(null);
  const [fundAmount, setFundAmount] = useState("1.00");

  // Step 4 — Spend (display only)
  const spendStatus: StepStatus = card?.status === "active" ? "success" : "idle";

  // ---------------------------------------------------------------------------
  // Fetch wallet on mount
  // ---------------------------------------------------------------------------

  const fetchWallet = useCallback(async () => {
    setWalletStatus("loading");
    setWalletError(null);
    try {
      const res = await fetch("/api/wallet");
      const json = (await res.json()) as {
        success: boolean;
        wallet?: WalletData;
        error?: string;
      };
      if (!json.success) throw new Error(json.error ?? "Wallet fetch failed");
      setWallet(json.wallet ?? null);
      setWalletStatus("success");
    } catch (e) {
      setWalletError(e instanceof Error ? e.message : "Unknown error");
      setWalletStatus("error");
    }
  }, []);

  useEffect(() => {
    void fetchWallet();
  }, [fetchWallet]);

  // ---------------------------------------------------------------------------
  // Earn
  // ---------------------------------------------------------------------------

  async function handleEarn() {
    setEarnStatus("loading");
    setEarnError(null);
    try {
      const res = await fetch("/api/earn", { method: "POST" });
      const json = (await res.json()) as {
        success: boolean;
        error?: string;
      } & Partial<EarnResult>;
      if (!json.success) throw new Error(json.error ?? "Earn failed");
      setEarnResult({
        weatherData: json.weatherData,
        payment: json.payment!,
        walletBalance: json.walletBalance!,
      });
      setEarnStatus("success");
      if (json.walletBalance) {
        setWallet((prev) =>
          prev ? { ...prev, formatted: json.walletBalance!.formatted } : null
        );
      }
    } catch (e) {
      setEarnError(e instanceof Error ? e.message : "Unknown error");
      setEarnStatus("error");
    }
  }

  // ---------------------------------------------------------------------------
  // Issue card
  // ---------------------------------------------------------------------------

  async function handleIssueCard() {
    setCardStatus("loading");
    setCardError(null);
    try {
      const res = await fetch("/api/card/issue", { method: "POST" });
      const json = (await res.json()) as {
        success: boolean;
        card?: CardData;
        error?: string;
      };
      if (!json.success) throw new Error(json.error ?? "Card issuance failed");
      setCard(json.card ?? null);
      setCardStatus("success");
    } catch (e) {
      setCardError(e instanceof Error ? e.message : "Unknown error");
      setCardStatus("error");
    }
  }

  // ---------------------------------------------------------------------------
  // Fund card
  // ---------------------------------------------------------------------------

  async function handleFund() {
    if (!card?.id) return;
    setFundStatus("loading");
    setFundError(null);
    try {
      const res = await fetch("/api/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id, amount: fundAmount }),
      });
      const json = (await res.json()) as {
        success: boolean;
        card?: CardData;
        error?: string;
      };
      if (!json.success) throw new Error(json.error ?? "Fund failed");
      if (json.card) setCard(json.card);
      setFundStatus("success");
      void fetchWallet();
    } catch (e) {
      setFundError(e instanceof Error ? e.message : "Unknown error");
      setFundStatus("error");
    }
  }

  // ---------------------------------------------------------------------------
  // Refresh card status
  // ---------------------------------------------------------------------------

  async function refreshCard() {
    if (!card?.id) return;
    setCardStatus("loading");
    try {
      const res = await fetch(`/api/card/status?cardId=${card.id}`);
      const json = (await res.json()) as {
        success: boolean;
        card?: CardData;
        error?: string;
      };
      if (!json.success) throw new Error(json.error ?? "Card status fetch failed");
      setCard(json.card ?? null);
      setCardStatus("success");
    } catch (e) {
      setCardError(e instanceof Error ? e.message : "Unknown error");
      setCardStatus("error");
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const weatherSummary =
    earnResult?.weatherData &&
    typeof earnResult.weatherData === "object" &&
    earnResult.weatherData !== null
      ? JSON.stringify(earnResult.weatherData).slice(0, 120) + "…"
      : null;

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-indigo-400">x402</span> Loop
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Earn USDC via x402 · Spend with Rain virtual Visa · Powered by Crossmint
            </p>
          </div>
          <span className="hidden sm:inline rounded-full bg-indigo-900/40 border border-indigo-700/50 px-3 py-1 text-xs text-indigo-300">
            {process.env.NEXT_PUBLIC_CHAIN ?? "solana"} · production
          </span>
        </div>
      </header>

      {/* Flow grid */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] gap-4 items-start">
          {/* ── Step 1: Earn ── */}
          <StepCard step={1} title="Earn" subtitle="x402 micro-payment" status={earnStatus}>
            <div className="space-y-2">
              <Pill label="Endpoint" value="apijapan.vercel.app" />
              <Pill label="Price" value="$0.001 / call" />
              <Pill label="Protocol" value="x402 (HTTP 402)" />
              {earnResult && (
                <>
                  <Pill
                    label="Paid"
                    value={`${(Number(earnResult.payment.amountPaid) / 1e6).toFixed(6)} USDC`}
                  />
                  <Pill label="Network" value={earnResult.payment.network} />
                </>
              )}
              {weatherSummary && (
                <div className="rounded-lg bg-zinc-800/60 px-3 py-2 text-xs font-mono text-zinc-300 break-all">
                  {weatherSummary}
                </div>
              )}
              {earnError && <ErrorBox message={earnError} />}
            </div>
            <ActionButton onClick={handleEarn} loading={earnStatus === "loading"}>
              Trigger Earn →
            </ActionButton>
          </StepCard>

          <ArrowRight />

          {/* ── Step 2: Wallet ── */}
          <StepCard
            step={2}
            title="Wallet"
            subtitle="Crossmint AgentWallet"
            status={walletStatus}
          >
            <div className="space-y-2">
              {wallet ? (
                <>
                  <Pill label="USDC Balance" value={`$${wallet.formatted}`} />
                  <Pill
                    label="Address"
                    value={
                      wallet.address
                        ? `${wallet.address.slice(0, 8)}…${wallet.address.slice(-6)}`
                        : "—"
                    }
                  />
                  <Pill label="Chain" value={wallet.chain} />
                </>
              ) : (
                <Pill
                  label="Status"
                  value={walletStatus === "loading" ? "Loading…" : "—"}
                />
              )}
              {walletError && <ErrorBox message={walletError} />}
            </div>
            <ActionButton
              onClick={fetchWallet}
              loading={walletStatus === "loading"}
              variant="secondary"
            >
              Refresh Balance
            </ActionButton>
          </StepCard>

          <ArrowRight />

          {/* ── Step 3: Card ── */}
          <StepCard step={3} title="Card" subtitle="Rain Virtual Visa" status={cardStatus}>
            <div className="space-y-2">
              {card ? (
                <>
                  {/* Card visual */}
                  <div className="rounded-xl bg-gradient-to-br from-indigo-700 to-violet-800 p-4 text-sm font-mono">
                    <div className="flex justify-between items-start mb-6">
                      <span className="text-white/70 text-xs uppercase tracking-widest">
                        Virtual Visa
                      </span>
                      <span
                        className={`text-xs font-semibold ${
                          card.status === "active"
                            ? "text-emerald-300"
                            : "text-yellow-300"
                        }`}
                      >
                        {card.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-lg tracking-widest text-white">
                      {card.maskedNumber}
                    </div>
                    <div className="mt-2 flex gap-4 text-xs text-white/60">
                      <span>
                        EXP {card.expMonth}/{card.expYear}
                      </span>
                      <span>BAL ${card.balance}</span>
                    </div>
                  </div>

                  {/* Fund form */}
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                      className="flex-1 rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      placeholder="USDC amount"
                    />
                    <span className="text-zinc-400 text-sm">USDC</span>
                  </div>
                  {fundError && <ErrorBox message={fundError} />}
                  <ActionButton onClick={handleFund} loading={fundStatus === "loading"}>
                    Fund Card →
                  </ActionButton>
                  <ActionButton onClick={refreshCard} variant="secondary">
                    Refresh Card
                  </ActionButton>
                </>
              ) : (
                <>
                  <Pill label="Card" value="Not yet issued" />
                  {cardError && <ErrorBox message={cardError} />}
                </>
              )}
            </div>
            {!card && (
              <ActionButton onClick={handleIssueCard} loading={cardStatus === "loading"}>
                Issue Virtual Card →
              </ActionButton>
            )}
          </StepCard>

          <ArrowRight />

          {/* ── Step 4: Spend ── */}
          <StepCard step={4} title="Spend" subtitle="Visa network" status={spendStatus}>
            <div className="space-y-2">
              <Pill label="Network" value="Visa" />
              <Pill label="Acceptance" value="150M+ merchants" />
              <Pill label="Card type" value="Virtual Visa" />
              <Pill
                label="Ready"
                value={card?.status === "active" ? "Yes ✓" : "Issue card first"}
              />
            </div>
            {card?.status === "active" && (
              <div className="rounded-xl bg-emerald-950/40 border border-emerald-700/50 p-4 text-center">
                <div className="text-2xl mb-1">💳</div>
                <p className="text-sm text-emerald-300 font-semibold">Card is active</p>
                <p className="text-xs text-emerald-400/70 mt-1">
                  Use **** {card.lastFour} at any Visa merchant
                </p>
              </div>
            )}
          </StepCard>
        </div>

        {/* Loop summary banner */}
        <div className="mt-8 rounded-2xl border border-zinc-700/50 bg-zinc-900/60 p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">The Complete Loop</h3>
          <div className="flex flex-wrap gap-2 text-xs font-mono">
            {[
              {
                label: "Japan Data API",
                color: "bg-indigo-900/60 text-indigo-300 border-indigo-700/50",
              },
              {
                label: "→ x402 (HTTP 402)",
                color: "bg-zinc-800 text-zinc-300 border-zinc-600/50",
              },
              {
                label: "→ USDC earned",
                color: "bg-emerald-900/50 text-emerald-300 border-emerald-700/50",
              },
              {
                label: "→ Crossmint AgentWallet",
                color: "bg-violet-900/50 text-violet-300 border-violet-700/50",
              },
              {
                label: "→ Rain Virtual Visa",
                color: "bg-blue-900/50 text-blue-300 border-blue-700/50",
              },
              {
                label: "→ 150M+ merchants",
                color: "bg-amber-900/50 text-amber-300 border-amber-700/50",
              },
            ].map(({ label, color }) => (
              <span key={label} className={`rounded-full border px-3 py-1 ${color}`}>
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
