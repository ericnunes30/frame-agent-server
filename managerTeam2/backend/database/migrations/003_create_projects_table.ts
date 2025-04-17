import { BaseSchema } from '@adonisjs/lucid/schema'

import { PriorityLevel } from '../../app/models/project.js'

export default class extends BaseSchema {
  protected tableName = 'projects'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.string('title').notNullable()
      table.text('description').nullable()
      table.boolean('status').notNullable().defaultTo(false)

      table.enum('priority', Object.values(PriorityLevel)).notNullable()

      table.dateTime('start_date').notNullable()
      table.dateTime('end_date').notNullable()

      // table.integer('task_id').notNullable().unsigned().references('id').inTable('tasks')

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}