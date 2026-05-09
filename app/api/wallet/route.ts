import { NextResponse } from "next/server";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import { base58 } from "@scure/base";

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

function paymentWalletAddress(): string {
  const pk = process.env.WALLET_PRIVATE_KEY;
  if (!pk) return "";
  try {
    return Keypair.fromSecretKey(base58.decode(pk)).publicKey.toBase58();
  } catch {
    return "";
  }
}

async function getUSDCBalance(address: string): Promise<number> {
  if (!address) return 0;
  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
  const connection = new Connection(rpcUrl);
  const walletPubkey = new PublicKey(address);
  const tokenAccount = await getAssociatedTokenAddress(USDC_MINT, walletPubkey);
  try {
    const account = await getAccount(connection, tokenAccount);
    return Number(account.amount) / 1_000_000;
  } catch {
    return 0;
  }
}

export async function GET() {
  try {
    const address = paymentWalletAddress();
    const balance = await getUSDCBalance(address);
    return NextResponse.json({
      success: true,
      wallet: {
        address,
        formatted: balance.toFixed(6),
        chain: "solana",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/wallet]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
