import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "../../../lib/db";

// CSRF defence for this cookie-authenticated, state-changing endpoint: browsers
// always send Origin (and normally Referer) on cross-site POSTs, so requests
// whose origin does not match the host this API was served on are rejected.
function isSameOriginRequest(req: NextRequest): boolean {
  const host = req.headers.get("host");
  if (!host) return false;

  const source = req.headers.get("origin") ?? req.headers.get("referer");
  if (!source) return false;

  try {
    return new URL(source).host === host;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const session = cookies().get("taskflow_session");
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json();
  const task = await db.create({ data: { title: body.title, projectId: body.projectId } });

  return NextResponse.json({ task });
}
