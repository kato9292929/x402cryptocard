/** Nevermined Pay — delegation API wrapper (server-side only) */

import {
  DelegationAPI,
  type DelegationSummary,
  type PaymentMethodSummary,
  type PurchasingPower,
  type CreateDelegationPayload,
} from "@nevermined-io/payments";
import type { EnvironmentName } from "@nevermined-io/payments";

function getApi(): DelegationAPI {
  const key = process.env.NVM_API_KEY;
  if (!key) throw new Error("NVM_API_KEY is not set");
  const environment = (process.env.NVM_ENV ?? "live") as EnvironmentName;
  return DelegationAPI.getInstance({ nvmApiKey: key, environment });
}

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface AgentCard {
  /** Short delegation ID (first 8 chars of UUID) */
  id: string;
  fullId: string;
  status: string;
  /** Spending limit in dollars */
  limitUsd: string;
  /** Amount spent in dollars */
  spentUsd: string;
  /** Remaining budget in dollars */
  remainingUsd: string;
  currency: string;
  expiresAt: string;
  transactionCount: number;
  provider: string;
  paymentMethodId: string;
}

export interface AgentCardStatus {
  card: AgentCard;
  paymentMethod: PaymentMethodSummary | null;
  purchasingPower: PurchasingPower;
}

export interface DelegationCreated {
  delegationId: string;
  delegationToken?: string;
  card: AgentCard;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toAgentCard(d: DelegationSummary): AgentCard {
  const cents = (v: string) => (Number(v) / 100).toFixed(2);
  return {
    id: d.delegationId.slice(0, 8),
    fullId: d.delegationId,
    status: d.status,
    limitUsd: cents(d.spendingLimitCents),
    spentUsd: cents(d.amountSpentCents),
    remainingUsd: cents(d.remainingBudgetCents),
    currency: d.currency.toUpperCase(),
    expiresAt: d.expiresAt,
    transactionCount: d.transactionCount,
    provider: d.provider,
    paymentMethodId: d.providerPaymentMethodId,
  };
}

// ---------------------------------------------------------------------------
// Public functions
// ---------------------------------------------------------------------------

/**
 * Returns the most recently created active delegation as the "card",
 * along with purchasing power and the enrolled payment method.
 */
export async function getCardStatus(): Promise<AgentCardStatus> {
  const api = getApi();
  const [power, delegations, methods] = await Promise.all([
    api.getPurchasingPower(),
    api.listDelegations({ accessible: true }),
    api.listPaymentMethods(),
  ]);

  // Most recent active delegation
  const active = delegations.delegations
    .filter((d) => d.status === "Active")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (!active[0]) {
    throw new Error("No active delegation found. Create one first.");
  }

  const paymentMethod =
    methods.find((m) => m.id === active[0].providerPaymentMethodId) ?? methods[0] ?? null;

  return { card: toAgentCard(active[0]), paymentMethod, purchasingPower: power };
}

/**
 * Issues a new delegation backed by the first enrolled Stripe card.
 * @param spendingLimitUsd  Dollar amount (e.g. "10.00")
 * @param durationDays      Delegation lifetime in days (default 30)
 */
export async function issueDelegation(
  spendingLimitUsd: string = "10.00",
  durationDays: number = 30
): Promise<DelegationCreated> {
  const api = getApi();

  // Diagnose before attempting
  const [methods, power] = await Promise.all([
    api.listPaymentMethods(),
    api.getPurchasingPower(),
  ]);
  console.log("[nevermined] payment methods:", JSON.stringify(
    methods.map(m => ({ id: m.id, status: m.status, provider: m.provider }))
  ));
  console.log("[nevermined] purchasing power:", JSON.stringify(power));

  const card = methods.find((m) => m.status === "Active") ?? methods[0];
  if (!card) throw new Error("No enrolled payment method found. Add a card in the Nevermined dashboard.");

  const payload: CreateDelegationPayload = {
    provider: "stripe",
    providerPaymentMethodId: card.id,
    spendingLimitCents: Math.round(parseFloat(spendingLimitUsd) * 100),
    durationSecs: durationDays * 24 * 60 * 60,
    currency: "usd",
  };
  console.log("[nevermined] createDelegation payload:", JSON.stringify(payload));

  const result = await api.createDelegation(payload);

  // Fetch the created delegation to return full details
  const list = await api.listDelegations();
  const created = list.delegations.find((d) => d.delegationId === result.delegationId);

  return {
    delegationId: result.delegationId,
    delegationToken: result.delegationToken,
    card: created ? toAgentCard(created) : {
      id: result.delegationId.slice(0, 8),
      fullId: result.delegationId,
      status: "Active",
      limitUsd: spendingLimitUsd,
      spentUsd: "0.00",
      remainingUsd: spendingLimitUsd,
      currency: "USD",
      expiresAt: new Date(Date.now() + durationDays * 86400_000).toISOString(),
      transactionCount: 0,
      provider: "stripe",
      paymentMethodId: card.id,
    },
  };
}

/**
 * Creates an additional delegation to top up spending power.
 * In Nevermined, "funding" = creating a new delegation with more budget.
 */
export async function addDelegation(
  spendingLimitUsd: string,
  durationDays: number = 30
): Promise<DelegationCreated> {
  return issueDelegation(spendingLimitUsd, durationDays);
}
