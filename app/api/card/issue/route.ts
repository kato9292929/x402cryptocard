import { NextResponse } from "next/server";
import { issueDelegation } from "@/lib/nevermined";

export async function POST(request: Request) {
  let body: { spendingLimitUsd?: string; durationDays?: number } = {};
  try {
    body = await request.json() as typeof body;
  } catch {
    // default values used below
  }

  try {
    const result = await issueDelegation(
      body.spendingLimitUsd ?? "10.00",
      body.durationDays ?? 30
    );
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/card/issue]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
