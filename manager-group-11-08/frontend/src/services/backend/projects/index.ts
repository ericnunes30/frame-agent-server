import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/backend/api'
import { Project, CreateProjectRequest, UpdateProjectRequest } from '@/common/types'
import { transformApiProjectToFrontend } from '@/utils/apiTransformers'

const projectService = {
  async getProjects(): Promise<Project[]> {
    const response = await api.get('/project')
    return response.data.map(transformApiProjectToFrontend)
  },

  async getProject(id: number): Promise<Project> {
    const response = await api.get(`/project/${id}`)
    return transformApiProjectToFrontend(response.data)
  },

  async createProject(data: CreateProjectRequest): Promise<Project> {
    const response = await api.post('/project', data)
    return transformApiProjectToFrontend(response.data)
  },

  async updateProject(id: number, data: UpdateProjectRequest): Promise<Project> {
    const response = await api.put(`/project/${id}`, data)
    return transformApiProjectToFrontend(response.data)
  },

  async deleteProject(id: number): Promise<void> {
    await api.delete(`/project/${id}`)
  },
}

export const useGetProjects = () =>
  useQuery({ queryKey: ['projects'], queryFn: projectService.getProjects })

export const useGetProject = (projectId: number, enabled = true) =>
  useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.getProject(projectId),
    enabled,
  })

export const getProjectQueryOptions = (projectId: number) => ({
  queryKey: ['project', projectId],
  queryFn: () => projectService.getProject(projectId),
})

interface MutateProjectArgs {
  id?: number
  data: CreateProjectRequest | UpdateProjectRequest
}

export const useCreateProject = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: MutateProjectArgs) =>
      id
        ? projectService.updateProject(id, data as UpdateProjectRequest)
        : projectService.createProject(data as CreateProjectRequest),
    onSuccess: (result, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      if (id) {
        queryClient.invalidateQueries({ queryKey: ['project', id] })
      }
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export const useDeleteProject = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => projectService.deleteProject(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })
}
