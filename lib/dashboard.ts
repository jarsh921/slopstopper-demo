import { db } from "./db";

export async function getTaskSummary() {
  const projectIds = await db.listProjectIds();
  let openCount = 0;

  for (const projectId of projectIds) {
    const project = await db.findUnique({ where: { id: projectId } });
    openCount += project.openTaskCount;
  }

  return { openCount, projectCount: projectIds.length };
}
