import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "../../../lib/db";

// Lightweight in-process rate limiter. Keeps this route bounded without adding a
// dependency; note that it only limits per server instance, so for a multi-instance
// or serverless deployment back this with a shared store (e.g. @upstash/ratelimit).
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

function rateLimitKey(req: NextRequest, sessionValue?: string): string {
  if (sessionValue) return `session:${sessionValue}`;
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : req.headers.get("x-real-ip");
  return `ip:${ip ?? "unknown"}`;
}

// CSRF defense for this cookie-authenticated, state-changing route. Browsers send
// Sec-Fetch-Site and/or Origin on every POST (including form submissions), so a
// cross-site request forged against a logged-in user is rejected here. Non-browser
// clients (curl, server-to-server) send neither header and are left unaffected.
function isCrossSiteRequest(req: NextRequest): boolean {
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return true;
  }

  const origin = req.headers.get("origin");
  if (!origin) return false;

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host) return true;

  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

export async function POST(req: NextRequest) {
  if (isCrossSiteRequest(req)) {
    return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
  }

  const session = cookies().get("taskflow_session");
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { allowed, retryAfterSeconds } = checkRateLimit(rateLimitKey(req, session.value));
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }

  const body = await req.json();
  const task = await db.create({ data: { title: body.title, projectId: body.projectId } });

  return NextResponse.json({ task });
}
