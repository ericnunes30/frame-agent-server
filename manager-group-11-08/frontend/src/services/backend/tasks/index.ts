import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/backend/api'
import { Task, CreateTaskRequest, UpdateTaskRequest } from '@/common/types'
import { transformApiTaskToFrontend } from '@/utils/apiTransformers'

const taskService = {
  async getTasks(): Promise<Task[]> {
    const response = await api.get('/task')
    return response.data.map(transformApiTaskToFrontend)
  },

  async getTask(id: number): Promise<Task> {
    const response = await api.get(`/task/${id}`)
    return transformApiTaskToFrontend(response.data)
  },

  async getTasksByProject(projectId: number): Promise<Task[]> {
    const response = await api.get(`/task?project_id=${projectId}`)
    return response.data.map(transformApiTaskToFrontend)
  },

  async createTask(data: CreateTaskRequest): Promise<Task> {
    const response = await api.post('/task', data)
    return transformApiTaskToFrontend(response.data)
  },

  async updateTask(id: number, data: UpdateTaskRequest): Promise<Task> {
    const response = await api.put(`/task/${id}`, data)
    return transformApiTaskToFrontend(response.data)
  },

  async deleteTask(id: number): Promise<void> {
    await api.delete(`/task/${id}`)
  },
}

export const useGetTasks = () =>
  useQuery({ queryKey: ['tasks'], queryFn: taskService.getTasks })

export const useGetTask = (taskId: number) =>
  useQuery({
    queryKey: ['task', taskId],
    queryFn: () => taskService.getTask(taskId),
  })

export const useGetTasksByProject = (projectId: number, enabled = true) =>
  useQuery({
    queryKey: ['projectTasks', projectId],
    queryFn: () => taskService.getTasksByProject(projectId),
    enabled,
  })

export const useCreateTask = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTaskRequest) => taskService.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['project'] })
      queryClient.invalidateQueries({ queryKey: ['projectTasks'] })
    },
  })
}

export const useUpdateTask = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTaskRequest }) =>
      taskService.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task'] })
      queryClient.invalidateQueries({ queryKey: ['project'] })
      queryClient.invalidateQueries({ queryKey: ['projectTasks'] })
    },
  })
}

export const useDeleteTask = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => taskService.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task'] })
      queryClient.invalidateQueries({ queryKey: ['project'] })
      queryClient.invalidateQueries({ queryKey: ['projectTasks'] })
    },
  })
}
