import { NextResponse } from "next/server";
import { addDelegation } from "@/lib/nevermined";

export async function POST(request: Request) {
  let body: { amount?: string; durationDays?: number } = {};
  try {
    body = await request.json() as typeof body;
  } catch {
    // default values used below
  }

  try {
    const result = await addDelegation(
      body.amount ?? "10.00",
      body.durationDays ?? 30
    );
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/fund]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
