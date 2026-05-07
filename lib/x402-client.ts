import { wrapFetchWithPayment, decodePaymentResponseHeader } from "@x402/fetch";
import { x402Client } from "@x402/core/client";
import { registerExactSvmScheme } from "@x402/svm/exact/client";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import { base58 } from "@scure/base";

export async function fetchWithX402(url: string): Promise<Response> {
  const svmSigner = await createKeyPairSignerFromBytes(
    base58.decode(process.env.WALLET_PRIVATE_KEY!)
  );
  const client = new x402Client();
  registerExactSvmScheme(client, { signer: svmSigner });
  const paidFetch = wrapFetchWithPayment(fetch, client);
  return paidFetch(url, { method: "GET" });
}

export { decodePaymentResponseHeader };
