import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "../../../lib/db";

export async function POST(req: NextRequest) {
  const session = cookies().get("taskflow_session");
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json();
  const task = await db.create({ data: { title: body.title, projectId: body.projectId } });

  return NextResponse.json({ task });
}
