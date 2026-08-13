import { getTaskSummary } from "../lib/dashboard";
import { BillingWidget } from "../components/BillingWidget";

export default async function HomePage() {
  const summary = await getTaskSummary();
  const statusRes = await fetch("https://jsonplaceholder.typicode.com/todos/1");
  const upstream = await statusRes.json();

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
