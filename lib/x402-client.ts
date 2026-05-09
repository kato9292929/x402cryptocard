import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client } from "@x402/core/client";
import { ExactSvmScheme } from "@x402/svm/exact/client";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import { base58 } from "@scure/base";

export async function fetchWithX402(url: string) {
  const svmSigner = await createKeyPairSignerFromBytes(
    base58.decode(process.env.WALLET_PRIVATE_KEY!)
  );
  console.log("[x402-client] signer address:", svmSigner.address);

  const client = new x402Client();
  client.register("solana:*", new ExactSvmScheme(svmSigner));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client.onBeforePaymentCreation(async (ctx: any) => {
    try {
      const pr = ctx.paymentRequired;
      console.log("[x402-client] payment requirements:", JSON.stringify({
        x402Version: pr.x402Version,
        accepts: pr.accepts?.map((a: Record<string, unknown>) => ({
          scheme: a.scheme,
          network: a.network,
          amount: a.amount,
          payTo: a.payTo,
          asset: a.asset,
          feePayer: (a.extra as Record<string, unknown>)?.feePayer,
        })),
      }));
    } catch (_e) { /* ignore logging errors */ }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client.onPaymentCreationFailure(async (ctx: any) => {
    const err = ctx.error;
    console.error("[x402-client] payment creation failed:", err instanceof Error ? err.message : String(err));
  });

  // Log all 402 responses to capture payment requirements and error details
  const loggingFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await fetch(input, init);
    if (response.status === 402) {
      const cloned = response.clone();
      const body = await cloned.text();
      const paymentRequiredHeader = response.headers.get("PAYMENT-REQUIRED");
      console.log("[x402-client] 402 PAYMENT-REQUIRED header present:", !!paymentRequiredHeader);
      console.log("[x402-client] 402 body:", body.slice(0, 500));
    }
    return response;
  };

  const paidFetch = wrapFetchWithPayment(loggingFetch, client);
  return paidFetch(url, { method: "GET" });
}
