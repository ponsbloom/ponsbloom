import { NextRequest, NextResponse } from "next/server";

const DEFAULT_COORD = process.env.NEXT_PUBLIC_COORDINATOR_URL || "https://api.darkbloom.dev";

// Server-side proxy for the public attestation feed. The coordinator's CORS
// policy only allows https://console.darkbloom.dev, so browsers on other
// origins (e.g. *.vercel.app) fail the direct fetch. Same-origin requests to
// this route never hit CORS.
export async function GET(req: NextRequest) {
  const coordUrl = req.headers.get("x-coordinator-url") || DEFAULT_COORD;
  try {
    const res = await fetch(`${coordUrl}/v1/providers/attestation`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream ${res.status}` },
        { status: res.status }
      );
    }
    return NextResponse.json(await res.json(), {
      headers: { "Cache-Control": "public, max-age=15" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 502 }
    );
  }
}
