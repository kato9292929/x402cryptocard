/** Crossmint + Solana RPC — server-side only */

// ---------------------------------------------------------------------------
// Crossmint (used only for transfers)
// ---------------------------------------------------------------------------

const CROSSMINT_BASE = "https://api.crossmint.com";
const CROSSMINT_STAGING = "https://staging.crossmint.com";

function crossmintBase(): string {
  return process.env.CROSSMINT_ENV === "staging" ? CROSSMINT_STAGING : CROSSMINT_BASE;
}

function crossmintHeaders(): Record<string, string> {
  const key = process.env.CROSSMINT_API_KEY;
  if (!key) throw new Error("CROSSMINT_API_KEY is not set");
  return { "X-API-KEY": key, "Content-Type": "application/json" };
}

// ---------------------------------------------------------------------------
// Solana RPC
// ---------------------------------------------------------------------------

const SOLANA_RPC: Record<string, string> = {
  "solana":        "https://api.mainnet-beta.solana.com",
  "solana-devnet": "https://api.devnet.solana.com",
};

const USDC_MINT: Record<string, string> = {
  "solana":        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "solana-devnet": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
};

function rpcUrl(): string {
  const chain = process.env.NEXT_PUBLIC_CHAIN ?? "solana";
  return process.env.SOLANA_RPC_URL ?? SOLANA_RPC[chain] ?? SOLANA_RPC["solana"];
}

function usdcMint(): string {
  const chain = process.env.NEXT_PUBLIC_CHAIN ?? "solana";
  return USDC_MINT[chain] ?? USDC_MINT["solana"];
}

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(rpcUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Solana RPC error: ${res.status} ${await res.text()}`);
  const json = await res.json() as { result?: T; error?: { message: string } };
  if (json.error) throw new Error(`Solana RPC error: ${json.error.message}`);
  return json.result as T;
}

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/** Extracts the wallet address from CROSSMINT_WALLET_LOCATOR (no API call). */
export function getWalletInfo(): WalletInfo {
  const locator = process.env.CROSSMINT_WALLET_LOCATOR;
  if (!locator) throw new Error("CROSSMINT_WALLET_LOCATOR is not set");

  // locator format: "solana:<address>"
  const address = locator.includes(":") ? locator.split(":").slice(1).join(":") : locator;
  const chain = process.env.NEXT_PUBLIC_CHAIN ?? "solana";

  return { address, chain };
}

/**
 * Returns the USDC balance of the wallet via Solana JSON-RPC.
 * Uses getTokenAccountsByOwner with the USDC mint — no Crossmint API needed.
 */
export async function getUSDCBalance(): Promise<USDCBalance> {
  const { address, chain } = getWalletInfo();

  type TokenAccountResult = {
    value: Array<{
      account: {
        data: {
          parsed: {
            info: {
              tokenAmount: { amount: string; decimals: number; uiAmountString: string };
            };
          };
        };
      };
    }>;
  };

  const result = await rpc<TokenAccountResult>("getTokenAccountsByOwner", [
    address,
    { mint: usdcMint() },
    { encoding: "jsonParsed" },
  ]);

  const tokenAccount = result.value[0];
  if (!tokenAccount) {
    // No USDC token account yet — balance is zero
    return { address, rawBalance: "0", formatted: "0.000000", chain };
  }

  const { amount, decimals } = tokenAccount.account.data.parsed.info.tokenAmount;
  const formatted = (Number(amount) / 10 ** decimals).toFixed(decimals);

  return { address, rawBalance: amount, formatted, chain };
}

/**
 * Transfers USDC from the AgentWallet to a Rain card's on-chain top-up address.
 * Uses the Crossmint token transfer API.
 */
export async function transferUSDC(toAddress: string, usdcAmount: string): Promise<CrossmintTransfer> {
  const locator = process.env.CROSSMINT_WALLET_LOCATOR;
  if (!locator) throw new Error("CROSSMINT_WALLET_LOCATOR is not set");

  const chain = process.env.NEXT_PUBLIC_CHAIN ?? "solana";
  const rawAmount = Math.round(parseFloat(usdcAmount) * 1_000_000).toString();

  const res = await fetch(
    `${crossmintBase()}/api/v1-alpha1/wallets/${encodeURIComponent(locator)}/transfers`,
    {
      method: "POST",
      headers: crossmintHeaders(),
      body: JSON.stringify({ params: { chain, token: "usdc", amount: rawAmount, recipient: toAddress } }),
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
