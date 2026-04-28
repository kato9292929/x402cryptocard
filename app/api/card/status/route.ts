import { NextResponse } from "next/server";
import { getCard } from "@/lib/rain";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cardId = searchParams.get("cardId");

  if (!cardId) {
    return NextResponse.json({ success: false, error: "cardId is required" }, { status: 400 });
  }

  try {
    const status = await getCard(cardId);
    return NextResponse.json({ success: true, ...status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/card/status]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
