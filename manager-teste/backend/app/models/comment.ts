import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, computed, hasMany, manyToMany } from '@adonisjs/lucid/orm'

import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'

import Task from '#models/task'
import User from '#models/user'

export default class Comment extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare content: string

  @column()
  declare task_id: number

  @belongsTo(() => Task, {
    foreignKey: 'task_id', // Especifica a coluna FK neste modelo (Comment)
  })
  declare task: BelongsTo<typeof Task>

  // Novo campo para o ID do comentário pai (respostas aninhadas)
  @column({ columnName: 'parent_id' }) // Especifica o nome da coluna no BD
  declare parentId: number | null // Mantém camelCase no modelo

  // Relação para o comentário pai (usa a foreignKey 'parentId' do modelo)
  @belongsTo(() => Comment, {
    foreignKey: 'parentId',
  })
  declare parentComment: BelongsTo<typeof Comment>

  // Relação para os comentários de resposta (filhos) (usa a foreignKey 'parentId' do modelo)
  @hasMany(() => Comment, {
    foreignKey: 'parentId',
  })
  declare replies: HasMany<typeof Comment>

  // Novo campo para contagem de curtidas
  @column({
    serializeAs: 'likesCount', // Mantém camelCase na API, mas pode ser snake_case no BD
  })
  declare likesCount: number

  // Relação para usuários mencionados (ManyToMany)
  @manyToMany(() => User, {
    pivotTable: 'comment_user_mentions', // Nome da tabela pivot
    pivotForeignKey: 'comment_id',
    pivotRelatedForeignKey: 'user_id',
    pivotTimestamps: true, // Opcional: adiciona created_at/updated_at na tabela pivot
  })
  declare mentionedUsers: ManyToMany<typeof User>

  // Getter computado para expor a contagem de respostas
  @computed()
  get repliesCount(): number {
    // Acessa o valor de $extras.repliesCount se carregado com withCount,
    // caso contrário, retorna 0.
    // Certifique-se de que o tipo de this.$extras.repliesCount seja number ou undefined.
    return this.$extras && typeof this.$extras.repliesCount === 'number'
      ? this.$extras.repliesCount
      : 0
  }

  @column({ columnName: 'user_id' })
  declare userId: number

  @belongsTo(() => User, {
    foreignKey: 'userId',
  })
  declare user: BelongsTo<typeof User>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
