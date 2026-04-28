import { NextResponse } from "next/server";
import { getUSDCBalance } from "@/lib/crossmint";

export async function GET() {
  try {
    const balance = await getUSDCBalance();
    return NextResponse.json({ success: true, wallet: balance });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/wallet]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
