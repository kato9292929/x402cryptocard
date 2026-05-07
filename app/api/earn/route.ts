import { NextResponse } from "next/server";
import { fetchWithX402 } from "@/lib/x402-client";
import { getUSDCBalance } from "@/lib/crossmint";

const JAPAN_API = "https://apijapan.vercel.app/api/weather/tokyo";

export async function POST() {
  try {
    // Run x402 payment first — this must succeed
    const result = await fetchWithX402(JAPAN_API);

    // Balance check is best-effort; don't let it block a successful payment
    const balance = await getUSDCBalance().catch((err) => {
      console.warn("[/api/earn] balance fetch failed (non-fatal):", err instanceof Error ? err.message : err);
      return null;
    });

    return NextResponse.json({
      success: true,
      weatherData: result.data,
      payment: result.paymentDetails,
      walletBalance: balance
        ? { formatted: balance.formatted, address: balance.address }
        : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/earn]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
