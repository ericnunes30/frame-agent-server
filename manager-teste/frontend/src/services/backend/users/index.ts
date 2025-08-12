import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/backend/api'
import { CreateUserRequest, UpdateUserRequest, User } from '@/common/types'

export const userService = {
  async getUsers(): Promise<User[]> {
    const response = await api.get('/user');
    return response.data;
  },
  async getUser(userId: number): Promise<User> {
    const response = await api.get(`/user/${userId}`);
    return response.data;
  },
  async createUser(data: CreateUserRequest): Promise<User> {
    const response = await api.post('/user', data);
    return response.data;
  },
  async updateUser(id: number, data: UpdateUserRequest): Promise<User> {
    const response = await api.patch(`/user/${id}`, data);
    return response.data;
  },
  async deleteUser(id: number): Promise<void> {
    await api.delete(`/user/${id}`);
  },
};

export const useGetUsers = () =>
  useQuery({ queryKey: ['users'], queryFn: userService.getUsers })

export const useGetUser = (userId: number) =>
  useQuery({
    queryKey: ['user', userId],
    queryFn: () => userService.getUser(userId),
  })

interface MutateUserArgs {
  id?: number
  data: CreateUserRequest | UpdateUserRequest
}

export const useCreateUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: MutateUserArgs) =>
      id
        ? userService.updateUser(id, data as UpdateUserRequest)
        : userService.createUser(data as CreateUserRequest),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

export const useDeleteUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => userService.deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}
