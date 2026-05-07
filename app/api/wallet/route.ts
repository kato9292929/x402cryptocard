import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";

const USDC_DEVNET_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

async function getUSDCBalance(): Promise<number> {
  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
  const walletLocator = process.env.CROSSMINT_WALLET_LOCATOR || "";
  const address = walletLocator.replace("solana:", "");

  const connection = new Connection(rpcUrl);
  const walletPubkey = new PublicKey(address);
  const tokenAccount = await getAssociatedTokenAddress(USDC_DEVNET_MINT, walletPubkey);

  try {
    const account = await getAccount(connection, tokenAccount);
    return Number(account.amount) / 1_000_000;
  } catch {
    return 0;
  }
}

export async function GET() {
  try {
    const balance = await getUSDCBalance();
    const walletLocator = process.env.CROSSMINT_WALLET_LOCATOR || "";
    const address = walletLocator.replace("solana:", "");
    return NextResponse.json({
      success: true,
      wallet: {
        address,
        formatted: balance.toFixed(6),
        chain: "solana-devnet",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/wallet]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
