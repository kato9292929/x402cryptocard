import { NextResponse } from "next/server";
import { fetchWithX402 } from "@/lib/x402-client";
import { getUSDCBalance } from "@/lib/crossmint";

const JAPAN_API = "https://apijapan.vercel.app/api/weather/tokyo";

export async function POST() {
  try {
    const [result, balance] = await Promise.all([
      fetchWithX402(JAPAN_API),
      getUSDCBalance(),
    ]);

    return NextResponse.json({
      success: true,
      weatherData: result.data,
      payment: result.paymentDetails,
      walletBalance: {
        formatted: balance.formatted,
        address: balance.address,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/earn]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
