import { createSigner } from "x402/types";
import { createPaymentHeader, selectPaymentRequirements } from "x402/client";
import type { PaymentRequirements } from "x402/types";

// ---------------------------------------------------------------------------
// x402 v2 compatibility — CAIP-2 network name normalisation
// ---------------------------------------------------------------------------

// Maps x402 v2 CAIP-2 network identifiers to the names recognised by
// the x402 npm package (SupportedEVMNetworks / SupportedSVMNetworks).
const CAIP2_TO_NETWORK: Record<string, string> = {
  // Solana (genesis hash → x402 name)
  "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1": "solana-devnet",
  "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d": "solana",
  // EVM (eip155:chainId → x402 name)
  "eip155:84532": "base-sepolia",
  "eip155:8453": "base",
  "eip155:43113": "avalanche-fuji",
  "eip155:43114": "avalanche",
  "eip155:1": "ethereum",
};

function normalizeRequirements(raw: unknown[]): PaymentRequirements[] {
  return raw.map((r) => {
    const req = r as Record<string, unknown>;
    const rawNetwork = req.network as string;
    const network = CAIP2_TO_NETWORK[rawNetwork] ?? rawNetwork;
    return {
      ...req,
      network,
      // v2 uses "amount"; v1 uses "maxAmountRequired"
      maxAmountRequired: ((req.maxAmountRequired ?? req.amount) as string) ?? "0",
    } as PaymentRequirements;
  });
}

// ---------------------------------------------------------------------------

const CHAIN = (process.env.NEXT_PUBLIC_CHAIN ?? "solana-devnet") as Parameters<
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
 * Fetches a URL that may respond with HTTP 402. Supports both:
 *   - x402 v2: payment requirements in `payment-required` header (base64 JSON)
 *   - x402 v1: payment requirements in response body under `accepts`
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

  // ---------------------------------------------------------------------------
  // Parse payment requirements
  // x402 v2: `payment-required` header (base64-encoded JSON array)
  // x402 v1: response body `{ accepts: [...] }`
  // ---------------------------------------------------------------------------
  let accepts: PaymentRequirements[];

  const paymentRequiredHeader = firstRes.headers.get("payment-required");
  if (paymentRequiredHeader) {
    // v2 path
    const decoded = Buffer.from(paymentRequiredHeader, "base64").toString("utf-8");
    console.log("[x402 v2] payment-required header decoded:", decoded.slice(0, 400));
    const raw = JSON.parse(decoded) as unknown[];
    accepts = normalizeRequirements(Array.isArray(raw) ? raw : [raw]);
  } else {
    // v1 fallback
    const body = await firstRes.json() as { accepts?: unknown[]; paymentRequirements?: unknown[] };
    console.log("[x402 v1] 402 body:", JSON.stringify(body).slice(0, 400));
    const raw = body.accepts ?? body.paymentRequirements ?? [];
    accepts = normalizeRequirements(raw);
  }

  if (accepts.length === 0) {
    throw new Error("x402: server returned 402 but no payment requirements found");
  }

  const requirement = selectPaymentRequirements(accepts, CHAIN, "exact");

  if (!requirement) {
    throw new Error(
      `x402: no matching requirement for chain "${CHAIN}". ` +
      `Available: ${accepts.map((a) => `${a.network}(${a.scheme})`).join(", ")}`
    );
  }

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
