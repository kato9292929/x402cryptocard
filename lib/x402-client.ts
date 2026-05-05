import { createSigner } from "x402/types";
import { createPaymentHeader, selectPaymentRequirements } from "x402/client";
import type { PaymentRequirements } from "x402/types";

const CHAIN = (process.env.NEXT_PUBLIC_CHAIN ?? "solana") as Parameters<
  typeof selectPaymentRequirements
>[1];

export interface X402Result {
  data: unknown;
  paymentDetails: {
    amountPaid: string;
    asset: string;
    network: string;
    payTo: string;
  };
}

export class X402PaymentRequired extends Error {
  constructor(public requirements: PaymentRequirements[]) {
    super("x402 payment required");
  }
}

/**
 * Fetches a URL that may respond with HTTP 402. When a 402 is received, signs
 * the required USDC payment and retries with the X-PAYMENT header attached.
 *
 * Requires WALLET_PRIVATE_KEY env var (base58-encoded Solana private key).
 */
export async function fetchWithX402(url: string): Promise<X402Result> {
  const privateKey = process.env.WALLET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("WALLET_PRIVATE_KEY env var is not set");
  }

  // First attempt — no payment header
  const firstRes = await fetch(url, { cache: "no-store" });

  if (firstRes.status !== 402) {
    const data: unknown = await firstRes.json();
    return {
      data,
      paymentDetails: { amountPaid: "0", asset: "", network: "", payTo: "" },
    };
  }

  // Parse payment requirements from 402 body
  const body = await firstRes.json() as { accepts: PaymentRequirements[] };
  const accepts: PaymentRequirements[] = body.accepts ?? [];

  const requirement = selectPaymentRequirements(accepts, CHAIN, "exact");

  const signer = await createSigner(requirement.network, privateKey);
  const paymentHeader = await createPaymentHeader(signer, 1, requirement);

  // Retry with payment header
  const paidRes = await fetch(url, {
    cache: "no-store",
    headers: { "X-PAYMENT": paymentHeader },
  });

  if (!paidRes.ok) {
    const errBody = await paidRes.text();
    throw new Error(`x402 paid request failed (${paidRes.status}): ${errBody}`);
  }

  const data: unknown = await paidRes.json();

  return {
    data,
    paymentDetails: {
      amountPaid: requirement.maxAmountRequired,
      asset: requirement.asset,
      network: requirement.network,
      payTo: requirement.payTo,
    },
  };
}
