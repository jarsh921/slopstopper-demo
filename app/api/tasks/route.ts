import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "../../../lib/db";

// Simple fixed-window rate limiter for the mutating endpoint below.
// Keeps state in the process, so it bounds bursts per instance; if this app is
// ever deployed across many instances, swap this for a shared store
// (e.g. @upstash/ratelimit) without changing the call site.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function getRateLimitKey(req: NextRequest, sessionValue?: string) {
  if (sessionValue) return `session:${sessionValue}`;

  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";

  return `ip:${ip}`;
}

function checkRateLimit(key: string) {
  const now = Date.now();

  for (const [bucketKey, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(bucketKey);
  }

  const existing = rateLimitBuckets.get(key);
  if (!existing) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count > RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "*";
  const projectIds = await db.listProjectIds();

  return NextResponse.json(
    { projectIds },
    {
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
      },
    },
  );
}

export async function POST(req: NextRequest) {
  const session = cookies().get("taskflow_session");

  const { allowed, retryAfterSeconds } = checkRateLimit(getRateLimitKey(req, session?.value));
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json();
  const task = await db.create({ data: { title: body.title, projectId: body.projectId } });

  return NextResponse.json({ task });
}
