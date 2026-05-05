/** Crossmint REST API wrapper — server-side only */

const BASE = "https://api.crossmint.com";
const STAGING = "https://staging.crossmint.com";

function apiBase(): string {
  return process.env.CROSSMINT_ENV === "staging" ? STAGING : BASE;
}

function headers(): Record<string, string> {
  const key = process.env.CROSSMINT_API_KEY;
  if (!key) throw new Error("CROSSMINT_API_KEY is not set");
  return {
    "X-API-KEY": key,
    "Content-Type": "application/json",
  };
}

export interface WalletInfo {
  address: string;
  chain: string;
}

export interface USDCBalance {
  address: string;
  rawBalance: string;
  /** Human-readable USDC (6 decimals) */
  formatted: string;
  chain: string;
}

export interface CrossmintTransfer {
  id: string;
  status: string;
  txHash?: string;
}

/** Returns the address of the configured AgentWallet. */
export async function getWalletInfo(): Promise<WalletInfo> {
  const locator = process.env.CROSSMINT_WALLET_LOCATOR;
  if (!locator) throw new Error("CROSSMINT_WALLET_LOCATOR is not set");

  const res = await fetch(`${apiBase()}/api/v1-alpha1/wallets/${encodeURIComponent(locator)}`, {
    headers: headers(),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Crossmint wallet fetch failed: ${res.status} ${await res.text()}`);
  }

  const json = await res.json() as { address?: string; chain?: string };
  return {
    address: json.address ?? "",
    chain: json.chain ?? (process.env.NEXT_PUBLIC_CHAIN ?? "solana"),
  };
}

/** Returns the USDC balance of the AgentWallet. */
export async function getUSDCBalance(): Promise<USDCBalance> {
  const locator = process.env.CROSSMINT_WALLET_LOCATOR;
  if (!locator) throw new Error("CROSSMINT_WALLET_LOCATOR is not set");

  const chain = process.env.NEXT_PUBLIC_CHAIN ?? "solana";

  const res = await fetch(
    `${apiBase()}/api/v1-alpha1/wallets/${encodeURIComponent(locator)}/balances?currency=usdc&chain=${chain}`,
    { headers: headers(), cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error(`Crossmint balance fetch failed: ${res.status} ${await res.text()}`);
  }

  const json = await res.json() as {
    balances?: Array<{ currency: string; amount: string; decimals: number }>;
    address?: string;
  };

  const usdc = json.balances?.find((b) => b.currency.toLowerCase() === "usdc");
  const raw = usdc?.amount ?? "0";
  const decimals = usdc?.decimals ?? 6;
  const formatted = (Number(raw) / 10 ** decimals).toFixed(6);

  const info = await getWalletInfo();

  return { address: info.address, rawBalance: raw, formatted, chain };
}

/**
 * Transfers USDC from the AgentWallet to a Rain card's on-chain top-up address.
 * Uses Crossmint's token transfer API.
 */
export async function transferUSDC(toAddress: string, usdcAmount: string): Promise<CrossmintTransfer> {
  const locator = process.env.CROSSMINT_WALLET_LOCATOR;
  if (!locator) throw new Error("CROSSMINT_WALLET_LOCATOR is not set");

  const chain = process.env.NEXT_PUBLIC_CHAIN ?? "solana";

  // Amount in micro-USDC (6 decimals)
  const rawAmount = Math.round(parseFloat(usdcAmount) * 1_000_000).toString();

  const body = {
    params: {
      chain,
      token: "usdc",
      amount: rawAmount,
      recipient: toAddress,
    },
  };

  const res = await fetch(
    `${apiBase()}/api/v1-alpha1/wallets/${encodeURIComponent(locator)}/transfers`,
    {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(`Crossmint transfer failed: ${res.status} ${await res.text()}`);
  }

  const json = await res.json() as { id?: string; status?: string; onChain?: { txId?: string } };
  return {
    id: json.id ?? "",
    status: json.status ?? "pending",
    txHash: json.onChain?.txId,
  };
}
