import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, manyToMany, hasMany } from '@adonisjs/lucid/orm' // Adicionado hasMany

import type { BelongsTo, ManyToMany, HasMany } from '@adonisjs/lucid/types/relations' // Adicionado HasMany

import User from '#models/user' // ManyToMany
import Project from '#models/project' // belongsTo
import Occupation from '#models/occupation' // ManyToMany
import Comment from '#models/comment' // Adicionado Comment
import RecurringTask from '#models/recurring_task'

export enum PriorityLevel {
  Low = 'baixa',
  Medium = 'media',
  High = 'alta',
  Urgent = 'urgente',
}

export enum Status {
  Backlog = 'pendente',
  ToDo = 'a_fazer',
  InProgress = 'em_andamento',
  Review = 'em_revisao',
  WaitingClient = 'aguardando_cliente',
  Done = 'concluido',
  Cancelled = 'cancelado',
}

export default class Task extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare order: number | null

  @column()
  declare title: string

  @column()
  declare description: string | null

  @column()
  declare priority: PriorityLevel

  @column()
  declare status: Status

  @column.dateTime()
  declare start_date: DateTime

  @column.dateTime()
  declare due_date: DateTime

  @column()
  declare timer: number

  @column({ columnName: 'project_id' })
  declare project_id: number

  @column({ columnName: 'recurring_task_id' })
  declare recurring_task_id: number | null

  @column({ columnName: 'task_reviewer_id' })
  declare task_reviewer_id: number | null

  @column()
  declare video_url: string | null

  @column()
  declare useful_links: Array<{ title: string; url: string }> | null

  @column()
  declare observations: string | null

  @column()
  declare has_detailed_fields: boolean

  // Método de serialização personalizado para garantir que o campo timer seja incluído
  toJSON() {
    const json = super.toJSON()
    return {
      ...json,
      timer: this.timer || 0,
    }
  }

  @belongsTo(() => Project, {
    foreignKey: 'project_id',
  })
  declare project: BelongsTo<typeof Project>

  @belongsTo(() => RecurringTask, {
    foreignKey: 'recurring_task_id',
  })
  declare recurringTask: BelongsTo<typeof RecurringTask>

  @belongsTo(() => User, {
    foreignKey: 'task_reviewer_id',
  })
  declare reviewer: BelongsTo<typeof User>

  @manyToMany(() => User, {
    pivotTable: 'task_user',
  })
  declare users: ManyToMany<typeof User>

  @manyToMany(() => Occupation, {
    pivotTable: 'occupations_tasks',
  })
  declare occupations: ManyToMany<typeof Occupation>

  @hasMany(() => Comment, {
    foreignKey: 'task_id',
  })
  declare comments: HasMany<typeof Comment>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
