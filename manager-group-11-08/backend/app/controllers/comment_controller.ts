import type { HttpContext } from '@adonisjs/core/http'

import { createCommentValidator, updateCommentValidator } from '#validators/comment'
import Comment from '#models/comment'
import Task from '#models/task'
import CommentLike from '#models/comment_like'
import ActivityLog from '#models/activity_log' // Importação adicionada

export default class CommentsController {
  async index({ auth }: HttpContext) {
    const user = auth.user!
    await user.load('comments')
    return user.comments
  }

  async store({ request, auth }: HttpContext) {
    const validatedData = await request.validateUsing(createCommentValidator)
    console.log('Dados validados no controller:', validatedData) // Log para depuração
    const { content, task_id, parentId } = validatedData
    const user = auth.user!

    const comment = await Comment.create({
      content,
      task_id,
      userId: user.id,
      parentId: Number.isInteger(parentId) ? parentId : null, // Garante que apenas um inteiro seja passado, senão null
    })

    // Log comment creation
    await ActivityLog.create({
      userId: user.id,
      taskId: comment.task_id,
      actionType: 'COMMENT_CREATED',
      referenceId: comment.id,
      details: {
        contentSnippet: comment.content.substring(0, 100),
      },
    } as any)

    // Carregar a relação 'user' antes de retornar
    await comment.load('user')
    return comment.toJSON() // Serializar explicitamente para incluir relações carregadas
  }

  async show({ params, response }: HttpContext) {
    try {
      const comment = await Comment.findByOrFail('id', params.id)
      await comment.load('task')
      await comment.load('user')

      return comment
    } catch (error) {
      return response.status(400).json({ error: 'Comment not found!' })
    }
  }

  async update({ request, params, response, auth }: HttpContext) {
    // auth adicionado
    try {
      const actingUserId = auth.user!.id // actingUserId definido
      const comment = await Comment.findByOrFail('id', params.id)
      const originalContent = comment.content // Conteúdo original capturado

      const { content } = await request.validateUsing(updateCommentValidator)

      comment.merge({ content })
      await comment.save()

      // Log comment update if content changed
      if (originalContent !== comment.content) {
        await ActivityLog.create({
          userId: actingUserId,
          taskId: comment.task_id,
          actionType: 'COMMENT_UPDATED',
          referenceId: comment.id,
          changedField: 'content',
          oldValue: originalContent,
          newValue: comment.content,
        } as any) // Usando 'as any'
      }

      return comment
    } catch (error) {
      return response.status(400).json({ error: 'Comment not found!' })
    }
  }

  async destroy({ params, response }: HttpContext) {
    try {
      const comment = await Comment.findByOrFail('id', params.id)
      // Adicionar log de COMMENT_DELETED aqui se necessário no futuro
      await comment.delete()
      return response.status(203)
    } catch (error) {
      return response.status(400).json({ error: 'Comment not found!' })
    }
  }

  // Novo método para buscar comentários por taskId
  async findByTask({ params, request, response }: HttpContext) {
    try {
      // Valida se a tarefa existe
      await Task.findOrFail(params.taskId)

      const page = request.input('page', 1)
      const limit = request.input('limit', 10)

      const comments = await Comment.query()
        .where('task_id', params.taskId)
        .whereNull('parent_id') // Apenas comentários de nível superior
        .preload('user') // Carrega o autor do comentário
        .preload('mentionedUsers') // Carrega os usuários mencionados
        .withCount('replies', (query) => {
          // Adiciona a contagem de respostas diretas
          query.as('repliesCount')
        })
        .orderBy('created_at', 'desc') // Ou 'asc', dependendo da ordem desejada
        .paginate(page, limit)

      return comments
    } catch (error) {
      if (error.code === 'E_ROW_NOT_FOUND') {
        return response.status(404).json({ error: 'Task not found' })
      }
      this.handleServerError(response, error) // Usar um helper para erros 500
    }
  }

  // Novo método para buscar respostas de um comentário específico
  async findReplies({ params, request, response }: HttpContext) {
    try {
      const parentCommentId = params.commentId

      // Valida se o comentário pai existe
      await Comment.findOrFail(parentCommentId)

      const page = request.input('page', 1)
      const limit = request.input('limit', 10)

      const replies = await Comment.query()
        .where('parent_id', parentCommentId) // Busca respostas do comentário pai
        .preload('user') // Carrega o autor da resposta
        .preload('mentionedUsers') // Carrega os usuários mencionados na resposta
        .withCount('replies', (query) => {
          // Adiciona a contagem de sub-respostas (respostas das respostas)
          query.as('repliesCount')
        })
        .orderBy('created_at', 'asc') // Respostas geralmente em ordem cronológica ascendente
        .paginate(page, limit)

      return replies
    } catch (error) {
      if (error.code === 'E_ROW_NOT_FOUND') {
        return response.status(404).json({ error: 'Parent comment not found' })
      }
      this.handleServerError(response, error) // Usar um helper para erros 500
    }
  }

  // Novo método para adicionar um like a um comentário
  async addLike({ params, auth, response }: HttpContext) {
    const user = auth.user!
    const commentId = params.commentId // Este é o ID do comentário a ser curtido

    try {
      // 1. Verifica se o comentário existe e carrega sua tarefa
      const commentToLike = await Comment.findOrFail(commentId)
      await commentToLike.load('task')

      // 2. Verifica se o usuário j�� curtiu este comentário
      const existingLike = await CommentLike.query()
        .where('user_id', user.id)
        .where('comment_id', commentToLike.id)
        .first()

      if (existingLike) {
        return response.noContent()
      }

      // 3. Cria o like
      const newLike = await CommentLike.create({
        userId: user.id,
        commentId: commentToLike.id,
      })

      // O hook afterCreate em CommentLike cuidará de incrementar o likesCount no Comment.

      // Log comment liked
      if (commentToLike.task) {
        await ActivityLog.create({
          userId: user.id,
          taskId: commentToLike.task.id,
          actionType: 'COMMENT_LIKED',
          referenceId: commentToLike.id, // ID do comentário que foi curtido
          details: {
            likeId: newLike.id,
          },
        } as any)
      }

      // 4. Retorna sucesso
      return response.status(201).json({ message: 'Comment liked successfully' })
    } catch (error) {
      if (error.code === 'E_ROW_NOT_FOUND') {
        return response.status(404).json({ error: 'Comment not found' })
      }
      if (error.code === '23505') {
        return response.status(409).json({ error: 'Like already exists (conflict)' })
      }
      this.handleServerError(response, error)
    }
  }

  // Novo método para remover (unlike) um like de um comentário
  async removeLike({ params, auth, response }: HttpContext) {
    const user = auth.user!
    const commentIdToRemoveLikeFrom = params.commentId // ID do comentário a ser descurtido

    try {
      // 1. Tenta encontrar o like específico do usuário para este comentário
      const like = await CommentLike.query()
        .where('user_id', user.id)
        .where('comment_id', commentIdToRemoveLikeFrom)
        .first()

      if (!like) {
        return response.noContent()
      }

      // Salvar IDs para o log antes de deletar o 'like'
      const likedCommentId = like.commentId
      const likingUserId = like.userId

      await like.delete()

      // Carregar o comentário para obter o taskId para o log
      const relatedComment = await Comment.find(likedCommentId)
      if (relatedComment) {
        await relatedComment.load('task') // Garante que a tarefa está carregada
        if (relatedComment.task) {
          // Verifica se a tarefa foi carregada com sucesso
          await ActivityLog.create({
            userId: likingUserId, // ID do usuário que descurtiu
            taskId: relatedComment.task.id, // ID da tarefa associada
            actionType: 'COMMENT_UNLIKED',
            referenceId: relatedComment.id, // ID do comentário descurtido
          } as any) // Usando 'as any'
        }
      }

      // O hook afterDelete em CommentLike cuidará de decrementar o likesCount no Comment.
      return response.noContent()
    } catch (error) {
      this.handleServerError(response, error)
    }
  }

  // Helper para respostas de erro do servidor
  private handleServerError(response: HttpContext['response'], error: any) {
    console.error(error)
    return response.status(500).json({ error: 'An unexpected error occurred on the server.' })
  }
}
