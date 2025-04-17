import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'

import type { HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'

import Occupation from '#models/occupation'
import User from '#models/user'
import Task from '#models/task'

export enum PriorityLevel {
  Low = 'baixa',
  Medium = 'media',
  High = 'alta',
  Urgent = 'urgente'
}

export default class Project extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare title: string

  @column()
  declare description: string | null

  @column()
  declare status: boolean

  @column()
  declare priority: PriorityLevel

  @column()
  declare start_date: DateTime

  @column()
  declare end_date: DateTime

  @hasMany(() => Task, {
    foreignKey: 'project_id',
    localKey: 'id'
  })
  declare tasks: HasMany<typeof Task>

  @manyToMany(() => Occupation, {
    pivotTable: 'occupations_projects'
  })
  declare occupations: ManyToMany<typeof Occupation>

  @manyToMany(() => User, {
    pivotTable: 'projects_users'
  })
  declare users: ManyToMany<typeof User>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}