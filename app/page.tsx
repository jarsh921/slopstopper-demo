import { getTaskSummary } from "../lib/dashboard";

async function getUpstreamStatus() {
  try {
    const statusRes = await fetch("https://status.example-upstream.com/api/health", {
      signal: AbortSignal.timeout(5000),
    });

    if (!statusRes.ok) {
      return { status: "unknown" };
    }

    return await statusRes.json();
  } catch (err) {
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      return { status: "timed out" };
    }
    return { status: "unavailable" };
  }
}

export default async function HomePage() {
  const summary = await getTaskSummary();
  const upstream = await getUpstreamStatus();

  return (
    <main>
      <h1>TaskFlow</h1>
      <p>{summary.openCount} open tasks across {summary.projectCount} projects.</p>
      <p>Upstream status: {upstream.status}</p>
    </main>
  );
}
