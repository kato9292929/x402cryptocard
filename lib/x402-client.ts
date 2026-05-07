import { createX402Client } from "x402-solana/client";
import { Keypair, VersionedTransaction } from "@solana/web3.js";
import { base58 } from "@scure/base";

function buildWallet() {
  const secret = base58.decode(process.env.WALLET_PRIVATE_KEY!);
  const keypair = Keypair.fromSecretKey(secret);
  return {
    publicKey: { toString: () => keypair.publicKey.toBase58() },
    signTransaction: async (tx: VersionedTransaction): Promise<VersionedTransaction> => {
      tx.sign([keypair]);
      return tx;
    },
  };
}

export async function fetchWithX402(url: string): Promise<Response> {
  const client = createX402Client({
    wallet: buildWallet(),
    network: "solana-devnet",
    rpcUrl: process.env.SOLANA_RPC_URL,
  });
  return client.fetch(url, { method: "GET" });
}
