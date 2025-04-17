import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'

import type { HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'

import User from '#models/user'
import Project from '#models/project'
import Task from '#models/task'

export default class Occupation extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @hasMany(() => User)
  declare users: HasMany<typeof User>

  @manyToMany(() => User, {
    pivotTable: 'users_occupations'
  })
  declare usersMany: ManyToMany<typeof User>

  @manyToMany(() => Project, {
    pivotTable: 'occupations_projects'
  })
  declare projects: ManyToMany<typeof Project>

  @manyToMany(() => Task, {
    pivotTable: 'occupations_tasks'
  })
  declare tasks: ManyToMany<typeof Task>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}