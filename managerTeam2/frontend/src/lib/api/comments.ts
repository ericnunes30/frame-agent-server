import api from './axios';

export interface Comment {
  id: number;
  content: string;
  task_id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCommentRequest {
  content: string;
  task_id: number;
}

export interface UpdateCommentRequest {
  content: string;
}

const commentService = {
  // Listar todos os comentários
  getComments: async () => {
    const response = await api.get<Comment[]>('/comment');
    return response.data;
  },

  // Obter um comentário específico
  getComment: async (id: number) => {
    const response = await api.get<Comment>(`/comment/${id}`);
    return response.data;
  },

  // Criar um novo comentário
  createComment: async (commentData: CreateCommentRequest) => {
    const response = await api.post<Comment>('/comment', commentData);
    return response.data;
  },

  // Atualizar um comentário existente
  updateComment: async (id: number, commentData: UpdateCommentRequest) => {
    const response = await api.put<Comment>(`/comment/${id}`, commentData);
    return response.data;
  },

  // Excluir um comentário
  deleteComment: async (id: number) => {
    const response = await api.delete(`/comment/${id}`);
    return response.data;
  },

  // Obter comentários de uma tarefa específica
  getCommentsByTask: async (taskId: number) => {
    const response = await api.get<Comment[]>(`/comment?task_id=${taskId}`);
    return response.data;
  }
};

export default commentService;
