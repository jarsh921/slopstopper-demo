import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "../../../lib/db";

// Simple in-memory sliding-window rate limiter.
// Note: this is per-instance and best-effort — for multi-instance/serverless
// deployments a shared store (e.g. Upstash Redis) should be used instead,
// but this bounds abuse from a single client without adding new infra deps.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const requestLog = new Map<string, number[]>();

function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const timestamps = requestLog.get(identifier) ?? [];
  const recent = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestLog.set(identifier, recent);
    return true;
  }

  recent.push(now);
  requestLog.set(identifier, recent);
  return false;
}

function getClientIdentifier(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}

// This route authenticates via a session cookie, which browsers attach
// automatically to cross-site requests. Since the cookie itself isn't
// available for us to mark SameSite here (it's issued elsewhere), we
// mitigate CSRF by rejecting state-changing requests whose Origin does
// not match the Host serving the request — a standard defense recommended
// by OWASP for cookie-authenticated endpoints.
function isSameOriginRequest(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");

  if (!origin || !host) {
    return false;
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
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
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const clientId = getClientIdentifier(req);
  if (isRateLimited(clientId)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const session = cookies().get("taskflow_session");
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json();
  const task = await db.create({ data: { title: body.title, projectId: body.projectId } });

  return NextResponse.json({ task });
}
