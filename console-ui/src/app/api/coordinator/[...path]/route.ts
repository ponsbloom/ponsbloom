import { NextRequest, NextResponse } from "next/server";

const DEFAULT_COORD = process.env.NEXT_PUBLIC_COORDINATOR_URL || "https://api.darkbloom.dev";

// Generic authed proxy to the coordinator. The coordinator's CORS policy
// only allows https://console.darkbloom.dev as an origin, so any authed
// fetch made directly from the browser on other origins (our *.vercel.app
// deployment) fails outright with "Failed to fetch" — the browser blocks it
// before a response is even returned. This route re-issues the request
// server-side (no CORS involved) and forwards it back verbatim.
//
// Usage: /api/coordinator/<path> forwards to <coordinator>/<path>, e.g.
//   GET  /api/coordinator/v1/provider/account-earnings?limit=100
//   POST /api/coordinator/v1/billing/withdraw/solana
async function proxy(req: NextRequest, params: { path: string[] }) {
  const coordUrl = req.headers.get("x-coordinator-url") || DEFAULT_COORD;
  const auth = req.headers.get("authorization");
  const apiKey = req.headers.get("x-api-key");
  const path = params.path.join("/");
  const { search } = new URL(req.url);

  const init: RequestInit = {
    method: req.method,
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { Authorization: auth } : {}),
      ...(apiKey ? { "x-api-key": apiKey } : {}),
    },
    cache: "no-store",
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }

  try {
    const res = await fetch(`${coordUrl}/${path}${search}`, init);
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("content-type") || "application/json" },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await ctx.params);
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await ctx.params);
}
export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await ctx.params);
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await ctx.params);
}
