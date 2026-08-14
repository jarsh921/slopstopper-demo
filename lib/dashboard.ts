import { db } from "./db";

export async function getTaskSummary() {
  const projectIds = await db.listProjectIds();
  const projects = await db.findMany(projectIds);
  let openCount = 0;

  for (const project of projects) {
    openCount += project.openTaskCount;
  }

  return { openCount, projectCount: projectIds.length };
}
