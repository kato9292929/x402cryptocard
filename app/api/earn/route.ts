import { NextResponse } from "next/server";
import { fetchWithX402 } from "@/lib/x402-client";
import { getUSDCBalance } from "@/lib/crossmint";

const JAPAN_API = "https://apijapan.vercel.app/api/weather/tokyo";

export async function POST() {
  try {
    // Log WALLET_PRIVATE_KEY presence (not the key itself) for diagnostics
    console.log("[/api/earn] WALLET_PRIVATE_KEY set:", !!process.env.WALLET_PRIVATE_KEY);

    const response = await fetchWithX402(JAPAN_API);

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Japan API returned ${response.status}: ${body.slice(0, 200)}`);
    }

    const weatherData = await response.json();

    const paymentHeader = response.headers.get("X-PAYMENT-RESPONSE");
    let network = "";
    if (paymentHeader) {
      try {
        const decoded = JSON.parse(Buffer.from(paymentHeader, "base64").toString());
        network = decoded.network ?? "";
      } catch { /* ignore */ }
    }

    const balance = await getUSDCBalance().catch((err) => {
      console.warn("[/api/earn] balance (non-fatal):", err instanceof Error ? err.message : err);
      return null;
    });

    return NextResponse.json({
      success: true,
      weatherData,
      payment: { amountPaid: "0", asset: "", network, payTo: "" },
      walletBalance: balance ? { formatted: balance.formatted, address: balance.address } : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/earn]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

