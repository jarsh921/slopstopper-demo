interface Project {
  id: string;
  openTaskCount: number;
}

interface Task {
  id: string;
  title: string;
  projectId: string;
}

// Minimal placeholder client so the demo app's imports resolve. Swap for a
// real Prisma/Drizzle/Supabase client before deploying this anywhere real.
export const db = {
  async listProjectIds(): Promise<string[]> {
    return ["proj_1", "proj_2", "proj_3"];
  },
  async findUnique(args: { where: { id: string } }): Promise<Project> {
    return { id: args.where.id, openTaskCount: 3 };
  },
  async create(args: { data: { title: string; projectId: string } }): Promise<Task> {
    return { id: `task_${Date.now()}`, title: args.data.title, projectId: args.data.projectId };
  },
};
