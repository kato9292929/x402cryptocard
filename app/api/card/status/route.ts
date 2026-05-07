import { NextResponse } from "next/server";
import { getCardStatus } from "@/lib/nevermined";

export async function GET() {
  try {
    const status = await getCardStatus();
    return NextResponse.json({ success: true, ...status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/card/status]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
