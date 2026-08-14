import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "../../../lib/db";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(identifier, { count: 1, windowStart: now });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  entry.count += 1;
  return false;
}

function getClientIdentifier(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") ?? "unknown";
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
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const clientId = getClientIdentifier(req);
  if (isRateLimited(clientId)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json();
  const task = await db.create({ data: { title: body.title, projectId: body.projectId } });

  return NextResponse.json({ task });
}
