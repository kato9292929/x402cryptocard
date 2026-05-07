/** Solana wallet helpers — server-side only */

// Devnet constants — hard-coded because this project runs on Solana devnet.
const DEVNET_USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const DEVNET_RPC_FALLBACK = "https://api.devnet.solana.com";

function rpcUrl(): string {
  return process.env.SOLANA_RPC_URL ?? DEVNET_RPC_FALLBACK;
}

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(rpcUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Solana RPC ${method} HTTP ${res.status}`);
  const json = await res.json() as { result?: T; error?: { message: string } };
  if (json.error) throw new Error(`Solana RPC error: ${json.error.message}`);
  return json.result as T;
}

// ---------------------------------------------------------------------------

export interface WalletInfo {
  address: string;
  chain: string;
}

export interface USDCBalance {
  address: string;
  rawBalance: string;
  formatted: string;
  chain: string;
}

export interface CrossmintTransfer {
  id: string;
  status: string;
  txHash?: string;
}

// ---------------------------------------------------------------------------

/** Returns wallet address from CROSSMINT_WALLET_LOCATOR (no API call). */
export function getWalletInfo(): WalletInfo {
  const locator = process.env.CROSSMINT_WALLET_LOCATOR;
  if (!locator) throw new Error("CROSSMINT_WALLET_LOCATOR is not set");
  const address = locator.includes(":") ? locator.split(":").slice(1).join(":") : locator;
  return { address, chain: process.env.NEXT_PUBLIC_CHAIN ?? "solana" };
}

/** USDC balance via Solana JSON-RPC (devnet). */
export async function getUSDCBalance(): Promise<USDCBalance> {
  const { address } = getWalletInfo();

  type TokenResult = {
    value: Array<{
      account: {
        data: { parsed: { info: { tokenAmount: { amount: string; decimals: number } } } };
      };
    }>;
  };

  const result = await rpc<TokenResult>("getTokenAccountsByOwner", [
    address,
    { mint: DEVNET_USDC_MINT },
    { encoding: "jsonParsed" },
  ]);

  const account = result.value[0];
  if (!account) {
    return { address, rawBalance: "0", formatted: "0.000000", chain: "solana-devnet" };
  }

  const { amount, decimals } = account.account.data.parsed.info.tokenAmount;
  const formatted = (Number(amount) / 10 ** decimals).toFixed(decimals);
  return { address, rawBalance: amount, formatted, chain: "solana-devnet" };
}

/** USDC transfer via Crossmint API (still used for on-chain sends). */
export async function transferUSDC(toAddress: string, usdcAmount: string): Promise<CrossmintTransfer> {
  const locator = process.env.CROSSMINT_WALLET_LOCATOR;
  if (!locator) throw new Error("CROSSMINT_WALLET_LOCATOR is not set");
  const apiKey = process.env.CROSSMINT_API_KEY;
  if (!apiKey) throw new Error("CROSSMINT_API_KEY is not set");

  const base = process.env.CROSSMINT_ENV === "staging"
    ? "https://staging.crossmint.com"
    : "https://api.crossmint.com";
  const rawAmount = Math.round(parseFloat(usdcAmount) * 1_000_000).toString();

  const res = await fetch(
    `${base}/api/v1-alpha1/wallets/${encodeURIComponent(locator)}/transfers`,
    {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        params: { chain: "solana-devnet", token: "usdc", amount: rawAmount, recipient: toAddress },
      }),
      cache: "no-store",
    }
  );

  if (!res.ok) throw new Error(`Crossmint transfer failed: ${res.status} ${await res.text()}`);
  const json = await res.json() as { id?: string; status?: string; onChain?: { txId?: string } };
  return { id: json.id ?? "", status: json.status ?? "pending", txHash: json.onChain?.txId };
}
