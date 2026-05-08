/** Solana devnet wallet helpers — @solana/web3.js + spl-token */
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import { base58 } from "@scure/base";

const USDC_DEVNET_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

function rpcUrl(): string {
  return process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
}

/** Derive the Solana address from WALLET_PRIVATE_KEY (the same key used by x402-client). */
function walletAddress(): string {
  const pk = process.env.WALLET_PRIVATE_KEY;
  if (!pk) return "";
  try {
    const keypair = Keypair.fromSecretKey(base58.decode(pk));
    return keypair.publicKey.toBase58();
  } catch {
    return "";
  }
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

// ---------------------------------------------------------------------------

export function getWalletInfo(): WalletInfo {
  return { address: walletAddress(), chain: process.env.NEXT_PUBLIC_CHAIN ?? "solana" };
}

export async function getUSDCBalance(): Promise<USDCBalance> {
  const address = walletAddress();
  const connection = new Connection(rpcUrl());
  const walletPubkey = new PublicKey(address);
  const tokenAccount = await getAssociatedTokenAddress(USDC_DEVNET_MINT, walletPubkey);

  try {
    const account = await getAccount(connection, tokenAccount);
    const raw = account.amount.toString();
    const formatted = (Number(raw) / 1_000_000).toFixed(6);
    return { address, rawBalance: raw, formatted, chain: "solana-devnet" };
  } catch {
    return { address, rawBalance: "0", formatted: "0.000000", chain: "solana-devnet" };
  }
}
