import { getTaskSummary } from "../lib/dashboard";
import { BillingWidget } from "../components/BillingWidget";

export default async function HomePage() {
  const summary = await getTaskSummary();
  let upstream: { completed?: boolean } = {};
  try {
    const statusRes = await fetch("https://jsonplaceholder.typicode.com/todos/1", {
      signal: AbortSignal.timeout(5000),
    });
    upstream = await statusRes.json();
  } catch (err) {
    // Timed out (AbortError/TimeoutError) or upstream failure: degrade gracefully
    // instead of hanging or failing the whole page render.
    console.error("Upstream sync status request failed", err);
  }

  return (
    <main>
      <img src="/logo.png" width={32} height={32} />
      <h1>TaskFlow</h1>
      <p>{summary.openCount} open tasks across {summary.projectCount} projects.</p>
      <p>Upstream sync status: {upstream.completed ? "up to date" : "pending"}</p>

      <nav>
        <a href="/">Dashboard</a>
        <a href="/reports">Reports</a>
      </nav>

      <BillingWidget />

      <form>
        <label>Invite a teammate</label>
        <input type="email" name="email" placeholder="teammate@company.com" />
        <button type="submit">Send invite</button>
      </form>
    </main>
  );
}
