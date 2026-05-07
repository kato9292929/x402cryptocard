import { NextResponse } from "next/server";
import { fetchWithX402, decodePaymentResponseHeader } from "@/lib/x402-client";
import { getUSDCBalance } from "@/lib/crossmint";

const JAPAN_API = "https://apijapan.vercel.app/api/weather/tokyo";

export async function POST() {
  try {
    const response = await fetchWithX402(JAPAN_API);

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Japan API returned ${response.status}: ${body.slice(0, 200)}`);
    }

    const weatherData = await response.json();

    // Extract payment details from X-PAYMENT-RESPONSE header if present
    const paymentHeader = response.headers.get("X-PAYMENT-RESPONSE");
    const paymentDetails = paymentHeader
      ? decodePaymentResponseHeader(paymentHeader)
      : { network: "", transaction: "", payer: "" };

    // Balance check is best-effort — don't let it block a successful payment
    const balance = await getUSDCBalance().catch((err) => {
      console.warn("[/api/earn] balance fetch (non-fatal):", err instanceof Error ? err.message : err);
      return null;
    });

    return NextResponse.json({
      success: true,
      weatherData,
      payment: {
        amountPaid: "0",
        asset: "",
        network: paymentDetails.network ?? "",
        payTo: "",
      },
      walletBalance: balance ? { formatted: balance.formatted, address: balance.address } : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/earn]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
