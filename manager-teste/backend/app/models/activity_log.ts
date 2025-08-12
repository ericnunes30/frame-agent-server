import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Task from '#models/task'

// Definindo um tipo para o campo details (JSON) para melhor type-safety, se desejado.
// Pode ser expandido conforme necessário.
type ActivityLogDetails = {
  [key: string]: any // Permite qualquer estrutura chave-valor
}

export default class ActivityLog extends BaseModel {
  public static table = 'activity_logs'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @column()
  declare taskId: number | null

  @belongsTo(() => Task)
  declare task: BelongsTo<typeof Task>

  @column()
  declare actionType: string // Ex: 'TASK_STATUS_UPDATED', 'COMMENT_ADDED'

  @column()
  declare changedField: string | null // Ex: 'status', 'dueDate', 'description'

  @column({
    serialize: (value: string | null) => value, // Mantém como string
    prepare: (value: any) => (value !== null && value !== undefined ? String(value) : null),
  })
  declare oldValue: string | null // Valor antigo do campo (serializado como string)

  @column({
    serialize: (value: string | null) => value, // Mantém como string
    prepare: (value: any) => (value !== null && value !== undefined ? String(value) : null),
  })
  declare newValue: string | null // Novo valor do campo (serializado como string)

  @column()
  declare referenceId: number | null // ID de uma entidade relacionada (ex: commentId, assignedUserId)

  @column({
    prepare: (value: ActivityLogDetails | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | null) => (value ? JSON.parse(value) : null),
    serialize: (value: ActivityLogDetails | null) => value,
  })
  declare details: ActivityLogDetails | null // Para quaisquer outros detalhes contextuais

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
