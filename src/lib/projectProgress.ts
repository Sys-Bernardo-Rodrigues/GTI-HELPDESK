import { prisma } from "./prisma";

/**
 * Calcula o progresso do projeto baseado nas tarefas concluídas
 * @param projectId ID do projeto
 * @returns Progresso de 0 a 100
 */
export async function calculateProjectProgress(projectId: number): Promise<number> {
  const tasks = await prisma.projectTask.findMany({
    where: {
      projectId,
      parentTaskId: null, // Apenas tarefas principais (não subtarefas)
    },
  });

  if (tasks.length === 0) {
    return 0;
  }

  const completedTasks = tasks.filter((task) => task.status === "DONE").length;
  const progress = Math.round((completedTasks / tasks.length) * 100);

  return progress;
}

/**
 * Atualiza o progresso do projeto baseado nas tarefas
 * @param projectId ID do projeto
 */
export async function updateProjectProgress(projectId: number): Promise<void> {
  const progress = await calculateProjectProgress(projectId);

  await prisma.project.update({
    where: { id: projectId },
    data: { progress },
  });
}



