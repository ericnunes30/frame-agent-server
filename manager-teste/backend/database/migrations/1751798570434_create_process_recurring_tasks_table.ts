import { BaseSchema } from '@adonisjs/lucid/schema'
import { ScheduleType } from '../../app/models/recurring_task.js'

export default class extends BaseSchema {
  protected tableName = 'recurring_tasks'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('name').notNullable()
      table.jsonb('template_data').notNullable()
      table.timestamp('next_due_date').notNullable()
      table.boolean('is_active').defaultTo(true)
      table.enum('schedule_type', Object.values(ScheduleType)).notNullable()
      table.string('frequency_interval').nullable()
      table.string('frequency_cron').nullable()

      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE')

      table
        .integer('project_id')
        .unsigned()
        .references('id')
        .inTable('projects')
        .onDelete('CASCADE')

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
