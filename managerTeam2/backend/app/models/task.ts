import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, manyToMany } from '@adonisjs/lucid/orm'

import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'

import User from '#models/user' // ManyToMany
import Project from '#models/project' // belongsTo
import Occupation from '#models/occupation' // ManyToMany

export enum PriorityLevel {
  Low = 'baixa',
  Medium = 'media',
  High = 'alta',
  Urgent = 'urgente'
}

export enum Status {
  Backlog    = 'pendente',
  ToDo       = 'a_fazer',
  InProgress = 'em_andamento',
  Review     = 'em_revisao',
  Done       = 'concluido'
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

  @column()
  declare start_date: DateTime

  @column()
  declare due_date: DateTime

  @column({ columnName: 'project_id' })
  declare project_id: number

  @belongsTo(() => Project, {
    foreignKey: 'project_id'
  })
  declare project: BelongsTo<typeof Project>

  @manyToMany(() => User, {
    pivotTable: 'task_user'
  })
  declare users: ManyToMany<typeof User>

  @manyToMany(() => Occupation, {
    pivotTable: 'occupations_tasks'
  })
  declare occupations: ManyToMany<typeof Occupation>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
