import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'

import { BaseModel, belongsTo, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'

import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'

import Role from '#models/role'
import Occupation from '#models/occupation'
import Project from '#models/project'
import Task from '#models/task'
import Comment from '#models/comment'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @manyToMany(() => Role, {
    pivotTable: 'users_roles'
  })
  declare roles: ManyToMany<typeof Role>

  @column({ columnName: 'occupation_id' })
  declare occupationId: number

  @belongsTo(() => Occupation, {
    foreignKey: 'occupationId'
  })
  declare occupation: BelongsTo <typeof Occupation>

  @manyToMany(() => Occupation, {
    pivotTable: 'users_occupations'
  })
  declare occupations: ManyToMany<typeof Occupation>

  @manyToMany(() => Project, {
    pivotTable: 'projects_users'
  })
  declare projects: ManyToMany<typeof Project>

  @manyToMany(() => Task, {
    pivotTable: 'task_user'
  })
  declare tasks: ManyToMany<typeof Task>

  @hasMany(() => Comment, {
    foreignKey: 'userId'
  })
  declare comments: HasMany<typeof Comment>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  static accessTokens = DbAccessTokensProvider.forModel(User)
}
