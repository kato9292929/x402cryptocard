import { NextResponse } from "next/server";
import { issueCard } from "@/lib/rain";

export async function POST() {
  try {
    const card = await issueCard();
    return NextResponse.json({ success: true, card });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/card/issue]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
