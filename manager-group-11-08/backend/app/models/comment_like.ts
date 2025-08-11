import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, afterCreate, afterDelete } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Comment from '#models/comment'
import User from '#models/user'

export default class CommentLike extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare commentId: number

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Comment)
  declare comment: BelongsTo<typeof Comment>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  // Hook para incrementar likes_count no comentário após uma curtida ser criada
  @afterCreate()
  static async incrementCommentLikes(like: CommentLike) {
    const comment = await Comment.findOrFail(like.commentId)
    // Em um cenário real, certifique-se de que esta operação seja atômica
    // ou use increment/decrement do Lucid se disponível e apropriado para seu DB.
    comment.likesCount += 1
    await comment.save()
  }

  // Hook para decrementar likes_count no comentário após uma curtida ser removida
  @afterDelete()
  static async decrementCommentLikes(like: CommentLike) {
    const comment = await Comment.findOrFail(like.commentId)
    if (comment.likesCount > 0) {
      comment.likesCount -= 1
      await comment.save()
    }
  }
}
