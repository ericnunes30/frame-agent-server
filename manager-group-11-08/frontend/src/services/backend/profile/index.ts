import { useMutation } from '@tanstack/react-query'
import { UpdateUserRequest, User } from '@/common/types'
import { userService } from '@/services/backend/users' // Importar o userService

const profileService = {
  async updateProfile(userId: number, data: UpdateUserRequest): Promise<User> {
    return userService.updateUser(userId, data)
  },
  async changePassword(userId: number, newPassword: string): Promise<void> {
    await userService.updateUser(userId, { password: newPassword })
  },
}

export const useUpdateProfile = () =>
  useMutation({
    mutationFn: (params: { userId: number; data: UpdateUserRequest }) =>
      profileService.updateProfile(params.userId, params.data),
  })

export const useChangePassword = () =>
  useMutation({
    mutationFn: (params: { userId: number; newPassword: string }) =>
      profileService.changePassword(params.userId, params.newPassword),
  })
