/**
 * x402 v2 client — Solana devnet
 *
 * Payment requirements arrive in the `payment-required` HTTP header
 * (base64-encoded JSON) instead of the response body. Network names
 * use CAIP-2 format (e.g. "solana:EtWT...") which must be mapped to
 * x402 library names ("solana-devnet") before use.
 */

import { createSigner } from "x402/types";
import { createPaymentHeader, selectPaymentRequirements } from "x402/client";
import type { PaymentRequirements } from "x402/types";

// ---------------------------------------------------------------------------
// CAIP-2 → x402 network name mapping
// ---------------------------------------------------------------------------

const CAIP2: Record<string, string> = {
  // Solana (keyed by genesis hash)
  "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1": "solana-devnet",
  "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d": "solana",
  // EVM (keyed by chain ID)
  "eip155:84532": "base-sepolia",
  "eip155:8453": "base",
  "eip155:43113": "avalanche-fuji",
  "eip155:43114": "avalanche",
  "eip155:1": "ethereum",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface X402Result {
  data: unknown;
  paymentDetails: {
    amountPaid: string;
    asset: string;
    network: string;
    payTo: string;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalise a raw requirement object from either x402 v1 or v2. */
function normalise(raw: Record<string, unknown>): PaymentRequirements {
  const rawNetwork = (raw.network as string | undefined) ?? "";
  return {
    ...raw,
    network: CAIP2[rawNetwork] ?? rawNetwork,
    // v2 uses "amount"; v1 uses "maxAmountRequired"
    maxAmountRequired: ((raw.maxAmountRequired ?? raw.amount) as string) ?? "0",
  } as PaymentRequirements;
}

/** Parse the payment-required header or fall back to body `accepts`. */
function parseRequirements(headerValue: string | null, body: unknown): PaymentRequirements[] {
  let rawItems: unknown[] = [];

  if (headerValue) {
    // x402 v2: base64-encoded JSON in header
    let decoded = headerValue;
    try {
      const attempt = Buffer.from(headerValue, "base64").toString("utf-8");
      if (attempt.trimStart().startsWith("[") || attempt.trimStart().startsWith("{")) {
        decoded = attempt;
      }
    } catch { /* keep raw */ }

    let parsed: unknown;
    try {
      parsed = JSON.parse(decoded);
    } catch {
      throw new Error(`x402: cannot parse payment-required header as JSON. Raw: ${decoded.slice(0, 120)}`);
    }

    if (Array.isArray(parsed)) {
      rawItems = parsed;
    } else if (typeof parsed === "object" && parsed !== null) {
      // Wrapped: { accepts: [...], x402Version, ... }
      const obj = parsed as Record<string, unknown>;
      const inner = obj.accepts ?? obj.paymentRequirements ?? obj.requirements;
      if (Array.isArray(inner)) rawItems = inner;
    }
    console.log("[x402] header parsed, items:", rawItems.length);
  } else {
    // x402 v1 fallback: body.accepts
    const b = body as Record<string, unknown> | null;
    const inner = b?.accepts ?? b?.paymentRequirements;
    if (Array.isArray(inner)) rawItems = inner;
    console.log("[x402] body fallback, items:", rawItems.length);
  }

  if (rawItems.length === 0) {
    throw new Error("x402: server returned 402 but no payment requirements found");
  }

  const reqs = rawItems.map((r) => normalise(r as Record<string, unknown>));
  console.log("[x402] normalised networks:", reqs.map((r) => r.network).join(", "));
  return reqs;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Fetches a URL protected by x402. On 402, signs a Solana devnet USDC
 * payment and retries with the X-PAYMENT header.
 *
 * Env vars required:
 *   WALLET_PRIVATE_KEY  — base58 Solana private key
 *   SOLANA_RPC_URL      — (optional) custom RPC, falls back to devnet public
 */
export async function fetchWithX402(url: string): Promise<X402Result> {
  const privateKey = process.env.WALLET_PRIVATE_KEY;
  if (!privateKey) throw new Error("WALLET_PRIVATE_KEY is not set");

  // ── First request ──────────────────────────────────────────────────────────
  const firstRes = await fetch(url, { cache: "no-store" });

  if (firstRes.status !== 402) {
    return {
      data: await firstRes.json(),
      paymentDetails: { amountPaid: "0", asset: "", network: "", payTo: "" },
    };
  }

  // ── Parse payment requirements ────────────────────────────────────────────
  const headerValue = firstRes.headers.get("payment-required");
  const body = headerValue ? null : await firstRes.json().catch(() => null);
  const accepts = parseRequirements(headerValue, body);

  // Prefer solana-devnet; fall back to first available
  const requirement =
    selectPaymentRequirements(accepts, "solana-devnet", "exact") ??
    accepts.find((r) => r.network === "solana-devnet") ??
    accepts[0];

  if (!requirement) throw new Error("x402: no usable payment requirement found");
  console.log("[x402] selected network:", requirement.network, "asset:", requirement.asset);

  // ── Create signer ──────────────────────────────────────────────────────────
  const signer = await createSigner(requirement.network, privateKey) as { address: string };

  // Patch feePayer: Japan API may send extra:{} — fall back to the paying wallet
  if (!requirement.extra || !(requirement.extra as Record<string, unknown>).feePayer) {
    (requirement.extra as Record<string, unknown>) = {
      ...(requirement.extra ?? {}),
      feePayer: signer.address,
    };
    console.log("[x402] feePayer patched to:", signer.address);
  }

  // ── Build payment header ───────────────────────────────────────────────────
  const paymentHeader = await createPaymentHeader(
    signer as Parameters<typeof createPaymentHeader>[0],
    1,
    requirement,
    process.env.SOLANA_RPC_URL
      ? { svmConfig: { rpcUrl: process.env.SOLANA_RPC_URL } }
      : undefined,
  );

  // ── Second request with payment ────────────────────────────────────────────
  const paidRes = await fetch(url, {
    cache: "no-store",
    headers: { "X-PAYMENT": paymentHeader },
  });

  if (!paidRes.ok) {
    const errText = await paidRes.text();
    throw new Error(`x402 paid request failed (${paidRes.status}): ${errText}`);
  }

  return {
    data: await paidRes.json(),
    paymentDetails: {
      amountPaid: requirement.maxAmountRequired,
      asset: requirement.asset,
      network: requirement.network,
      payTo: requirement.payTo,
    },
  };
}
