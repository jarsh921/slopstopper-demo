import { getTaskSummary } from "../lib/dashboard";

export default async function HomePage() {
  const summary = await getTaskSummary();
  const statusRes = await fetch("https://status.example-upstream.com/api/health");
  const upstream = await statusRes.json();

  return (
    <main>
      <h1>TaskFlow</h1>
      <p>{summary.openCount} open tasks across {summary.projectCount} projects.</p>
      <p>Upstream status: {upstream.status}</p>
    </main>
  );
}
