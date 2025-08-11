// frontend/src/utils/apiTransformers.ts

import { Task, Project } from '@/common/types';

/**
 * Transforma um objeto de tarefa vindo da API para o formato esperado pelo frontend.
 * Converte campos como 'startDate', 'dueDate', 'projectId' para 'start_date', 'due_date', 'project_id'.
 * Mantém outros campos inalterados.
 * @param apiTask A tarefa recebida da API.
 * @returns A tarefa transformada para o formato do frontend.
 */
export const transformApiTaskToFrontend = (apiTask: any): Task => {
  const transformedTask: Task = { ...apiTask };

  if (apiTask.startDate !== undefined) {
    transformedTask.start_date = apiTask.startDate;
    delete transformedTask.startDate;
  }
  if (apiTask.dueDate !== undefined) {
    transformedTask.due_date = apiTask.dueDate;
    delete transformedTask.dueDate;
  }
  if (apiTask.projectId !== undefined) {
    transformedTask.project_id = apiTask.projectId;
    delete transformedTask.projectId;
  }
  if (apiTask.taskReviewerId !== undefined) {
    transformedTask.task_reviewer_id = apiTask.taskReviewerId;
    delete transformedTask.taskReviewerId;
  }
  if (apiTask.videoUrl !== undefined) {
    transformedTask.video_url = apiTask.videoUrl;
    delete transformedTask.videoUrl;
  }
  if (apiTask.usefulLinks !== undefined) {
    transformedTask.useful_links = apiTask.usefulLinks;
    delete transformedTask.usefulLinks;
  }
  if (apiTask.hasDetailedFields !== undefined) {
    transformedTask.has_detailed_fields = apiTask.hasDetailedFields;
    delete transformedTask.hasDetailedFields;
  }

  // Se a tarefa tiver um objeto de projeto aninhado, transforme-o também se necessário
  if (apiTask.project) {
    transformedTask.project = transformApiProjectToFrontend(apiTask.project);
  }

  // Mantém 'users' como array de objetos User ou define como vazio se for null
  if (apiTask.users && Array.isArray(apiTask.users)) {
    transformedTask.users = apiTask.users; // Manter os objetos User completos
  } else if (apiTask.users === null) {
    transformedTask.users = [];
  }

  // Mantém 'occupations' como array de objetos Occupation ou define como vazio se for null
  if (apiTask.occupations && Array.isArray(apiTask.occupations)) {
    transformedTask.occupations = apiTask.occupations; // Manter os objetos Occupation completos
  } else if (apiTask.occupations === null) {
    transformedTask.occupations = [];
  }

  return transformedTask;
};

/**
 * Transforma um objeto de projeto vindo da API para o formato esperado pelo frontend.
 * Converte campos como 'startDate', 'endDate' para 'start_date', 'end_date'.
 * Mantém outros campos inalterados.
 * @param apiProject O projeto recebido da API.
 * @returns O projeto transformado para o formato do frontend.
 */
export const transformApiProjectToFrontend = (apiProject: any): Project => {
  const transformedProject: Project = { ...apiProject };

  if (apiProject.startDate !== undefined) {
    transformedProject.start_date = apiProject.startDate;
    delete transformedProject.startDate;
  }
  if (apiProject.endDate !== undefined) {
    transformedProject.end_date = apiProject.endDate;
    delete transformedProject.endDate;
  }

  // Transforma tarefas aninhadas, se houver
  if (apiProject.tasks && Array.isArray(apiProject.tasks)) {
    transformedProject.tasks = apiProject.tasks.map((task: any) => transformApiTaskToFrontend(task));
  }

  return transformedProject;
};