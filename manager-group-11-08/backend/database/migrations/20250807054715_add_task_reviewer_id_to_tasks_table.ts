import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddTaskReviewerIdToTasksTable extends BaseSchema {
  protected tableName = 'tasks'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('task_reviewer_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .comment('ID do usuário responsável por revisar esta tarefa')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('task_reviewer_id')
    })
  }
}
