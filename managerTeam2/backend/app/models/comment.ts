import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column,  } from '@adonisjs/lucid/orm'

import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import Task from '#models/task'
import User from '#models/user'

export default class Comment extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare content: string

  @column()
  declare task_id: number

  @belongsTo(() => Task)
  declare task: BelongsTo<typeof Task>

  @column({ columnName: 'user_id' })
  declare userId: number

  @belongsTo(() => User, {
    foreignKey: 'userId'
  })
  declare user: BelongsTo<typeof User>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}