import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, belongsTo } from '@adonisjs/lucid/orm'

import type { HasMany, BelongsTo } from '@adonisjs/lucid/types/relations'

import User from '#models/user'
import Task, { PriorityLevel } from '#models/task'
import Project from '#models/project'

export enum ScheduleType {
  INTERVAL = 'interval',
  CRON = 'cron',
}

export interface TaskTemplate {
  title: string
  description?: string
  priority: PriorityLevel
  assignee_ids?: number[]
  occupation_ids?: number[]
  start_date?: string // Pode ser uma data relativa como '+7d' ou uma data ISO
  due_date?: string // Pode ser uma data relativa como '+14d' ou uma data ISO
}

export default class RecurringTask extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({
    prepare: (value: TaskTemplate) => JSON.stringify(value),
    consume: (value: string | TaskTemplate) => {
      // O driver do PG já retorna o JSON como objeto, então verificamos o tipo
      return typeof value === 'string' ? JSON.parse(value) : value
    },
  })
  declare templateData: TaskTemplate

  @column()
  declare name: string

  @column.dateTime()
  declare next_due_date: DateTime

  @column()
  declare is_active: boolean

  @column()
  declare schedule_type: ScheduleType

  @column()
  declare frequency_interval: string | null

  @column()
  declare frequency_cron: string | null

  @column()
  declare userId: number

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @column()
  declare projectId: number

  @belongsTo(() => Project)
  declare project: BelongsTo<typeof Project>

  @hasMany(() => Task, {
    foreignKey: 'recurring_task_id',
  })
  declare tasks: HasMany<typeof Task>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
