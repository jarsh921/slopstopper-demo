import { getTaskSummary } from "../lib/dashboard";

export default async function HomePage() {
  const summary = await getTaskSummary();

  let upstream: { status?: string };
  try {
    const statusRes = await fetch("https://status.example-upstream.com/api/health", {
      // Fail fast instead of hanging forever if the upstream service stalls.
      signal: AbortSignal.timeout(5000),
    });
    upstream = await statusRes.json();
  } catch (err) {
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      upstream = { status: "timed out" };
    } else {
      upstream = { status: "unavailable" };
    }
  }

  return (
    <main>
      <h1>TaskFlow</h1>
      <p>{summary.openCount} open tasks across {summary.projectCount} projects.</p>
      <p>Upstream status: {upstream.status}</p>
    </main>
  );
}
