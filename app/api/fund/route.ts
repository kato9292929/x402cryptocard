import { NextResponse } from "next/server";
import { transferUSDC } from "@/lib/crossmint";
import { getCardFundingAddress, getCard } from "@/lib/rain";

export async function POST(request: Request) {
  let body: { cardId?: string; amount?: string };
  try {
    body = await request.json() as { cardId?: string; amount?: string };
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { cardId, amount = "1.00" } = body;

  if (!cardId) {
    return NextResponse.json({ success: false, error: "cardId is required" }, { status: 400 });
  }

  try {
    const fundingAddress = await getCardFundingAddress(cardId);
    if (!fundingAddress) {
      throw new Error("Card does not have a funding address yet");
    }

    const transfer = await transferUSDC(fundingAddress, amount);

    // Give the network a moment before re-querying — in production you'd poll
    const cardStatus = await getCard(cardId);

    return NextResponse.json({
      success: true,
      transfer,
      card: cardStatus.card,
      fundingAddress,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/fund]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
