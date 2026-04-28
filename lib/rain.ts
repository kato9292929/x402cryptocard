/** Rain virtual card API client (sandbox) — server-side only */

const BASE = "https://api.rain.com";
const SANDBOX = "https://sandbox-api.rain.com";

function apiBase(): string {
  return process.env.RAIN_ENV === "production" ? BASE : SANDBOX;
}

function headers(): Record<string, string> {
  const key = process.env.RAIN_API_KEY;
  if (!key) throw new Error("RAIN_API_KEY is not set");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export interface VirtualCard {
  id: string;
  /** Last 4 digits only */
  lastFour: string;
  maskedNumber: string;
  expMonth: string;
  expYear: string;
  cvv?: string;
  status: "active" | "inactive" | "cancelled" | string;
  balance: string;
  /** On-chain address for USDC top-up deposits */
  fundingAddress?: string;
  network: string;
  createdAt: string;
}

export interface CardTransaction {
  id: string;
  amount: string;
  currency: string;
  merchant: string;
  status: string;
  createdAt: string;
}

export interface CardStatus {
  card: VirtualCard;
  transactions: CardTransaction[];
}

/** Issues a new Rain virtual Visa card. */
export async function issueCard(): Promise<VirtualCard> {
  const res = await fetch(`${apiBase()}/v1/cards`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      type: "virtual",
      currency: "USD",
      cardNetwork: "visa",
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Rain card issuance failed: ${res.status} ${await res.text()}`);
  }

  return normalizeCard(await res.json());
}

/** Returns status and recent transactions for a card. */
export async function getCard(cardId: string): Promise<CardStatus> {
  const [cardRes, txRes] = await Promise.all([
    fetch(`${apiBase()}/v1/cards/${cardId}`, { headers: headers(), cache: "no-store" }),
    fetch(`${apiBase()}/v1/cards/${cardId}/transactions?limit=10`, {
      headers: headers(),
      cache: "no-store",
    }),
  ]);

  if (!cardRes.ok) {
    throw new Error(`Rain card fetch failed: ${cardRes.status} ${await cardRes.text()}`);
  }

  const cardJson = await cardRes.json();
  const txJson = txRes.ok ? await txRes.json() : { transactions: [] };

  const transactions: CardTransaction[] = (
    (txJson.transactions ?? txJson.data ?? []) as Array<Record<string, unknown>>
  ).map((t) => ({
    id: String(t.id ?? ""),
    amount: String(t.amount ?? "0"),
    currency: String(t.currency ?? "USD"),
    merchant: String(t.merchantName ?? t.merchant ?? "Unknown"),
    status: String(t.status ?? ""),
    createdAt: String(t.createdAt ?? t.created_at ?? ""),
  }));

  return { card: normalizeCard(cardJson), transactions };
}

/**
 * Funds a Rain card by depositing to its on-chain funding address.
 * Returns the address so the caller (Crossmint) can send USDC there.
 */
export async function getCardFundingAddress(cardId: string): Promise<string> {
  const res = await fetch(`${apiBase()}/v1/cards/${cardId}/funding-address`, {
    headers: headers(),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Rain funding address fetch failed: ${res.status} ${await res.text()}`);
  }

  const json = await res.json() as { address?: string; fundingAddress?: string };
  return json.address ?? json.fundingAddress ?? "";
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function normalizeCard(json: Record<string, unknown>): VirtualCard {
  const pan = String(json.pan ?? json.cardNumber ?? json.number ?? "");
  const lastFour = pan.slice(-4) || String(json.lastFour ?? json.last4 ?? "????");
  const balance = String(json.balance ?? json.availableBalance ?? "0");

  return {
    id: String(json.id ?? ""),
    lastFour,
    maskedNumber: `**** **** **** ${lastFour}`,
    expMonth: String(json.expMonth ?? json.expirationMonth ?? ""),
    expYear: String(json.expYear ?? json.expirationYear ?? ""),
    cvv: json.cvv ? String(json.cvv) : undefined,
    status: String(json.status ?? "active"),
    balance,
    fundingAddress: json.fundingAddress ? String(json.fundingAddress) : undefined,
    network: "visa",
    createdAt: String(json.createdAt ?? json.created_at ?? new Date().toISOString()),
  };
}
