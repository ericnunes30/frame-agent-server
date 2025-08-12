import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CreateRoleRequest, UpdateRoleRequest, Role } from '@/common/types'
import api from '@/services/backend/api'

const roleService = {
  async getRoles(): Promise<Role[]> {
    const response = await api.get('/role')
    return response.data
  },
  async getRole(roleId: number): Promise<Role> {
    const response = await api.get(`/role/${roleId}`)
    return response.data
  },
  async createRole(data: CreateRoleRequest): Promise<Role> {
    const response = await api.post('/role', data)
    return response.data
  },
  async updateRole(id: number, data: UpdateRoleRequest): Promise<Role> {
    const response = await api.put(`/role/${id}`, data)
    return response.data
  },
  async deleteRole(id: number): Promise<void> {
    await api.delete(`/role/${id}`)
  },
}

export const useGetRoles = () =>
  useQuery({ queryKey: ['roles'], queryFn: roleService.getRoles })

export const useGetRole = (roleId: number, enabled = true) =>
  useQuery({
    queryKey: ['role', roleId],
    queryFn: () => roleService.getRole(roleId),
    enabled,
  })

export const useCreateRole = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateRoleRequest) => roleService.createRole(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  })
}

export const useUpdateRole = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateRoleRequest }) =>
      roleService.updateRole(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  })
}

export const useDeleteRole = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => roleService.deleteRole(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  })
}
