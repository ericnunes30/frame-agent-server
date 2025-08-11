import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/backend/api'
import { CreateCommentRequest, UpdateCommentRequest, Comment } from '@/common/types'

const commentService = {
  async getComments(): Promise<Comment[]> {
    const response = await api.get('/comment')
    return response.data
  },

  async getCommentsByTask(taskId: number): Promise<Comment[]> {
    const response = await api.get(`/comment/task/${taskId}`)
    return response.data
  },

  async createComment(data: CreateCommentRequest): Promise<Comment> {
    const response = await api.post('/comment', data)
    return response.data
  },

  async updateComment(id: number, data: UpdateCommentRequest): Promise<Comment> {
    const response = await api.put(`/comment/${id}`, data)
    return response.data
  },

  async deleteComment(id: number): Promise<void> {
    await api.delete(`/comment/${id}`)
  },

  async likeComment(id: number): Promise<void> {
    await api.post(`/comment/${id}/like`, {})
  },

  async unlikeComment(id: number): Promise<void> {
    await api.delete(`/comment/${id}/like`)
  },
}

export const useGetComments = () =>
  useQuery({ queryKey: ['comments'], queryFn: commentService.getComments })

export const useGetCommentsByTask = (taskId: number) =>
  useQuery({
    queryKey: ['taskComments', taskId],
    queryFn: () => commentService.getCommentsByTask(taskId),
  })

interface MutateCommentArgs {
  id?: number
  data: CreateCommentRequest | UpdateCommentRequest
}

export const useCreateComment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCommentRequest) => commentService.createComment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] })
      queryClient.invalidateQueries({ queryKey: ['taskComments'] })
    },
  })
}

export const useUpdateComment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCommentRequest }) =>
      commentService.updateComment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] })
      queryClient.invalidateQueries({ queryKey: ['taskComments'] })
    },
  })
}

export const useDeleteComment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => commentService.deleteComment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] })
      queryClient.invalidateQueries({ queryKey: ['taskComments'] })
    },
  })
}

export const useLikeComment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => commentService.likeComment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] })
      queryClient.invalidateQueries({ queryKey: ['taskComments'] })
    },
  })
}

export const useUnlikeComment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => commentService.unlikeComment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] })
      queryClient.invalidateQueries({ queryKey: ['taskComments'] })
    },
  })
}
