import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'task_user' // Nome da tabela pivot

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      // Chave estrangeira para a tabela 'tasks'
      table.integer('task_id').unsigned().notNullable().references('id').inTable('tasks').onDelete('CASCADE') // Se uma task for deletada, remove a associação

      // Chave estrangeira para a tabela 'users'
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE') // Se um user for deletado, remove a associação

      // Chave primária composta para garantir que a combinação task_id/user_id seja única
      table.primary(['task_id', 'user_id'])

      // Timestamps opcionais, mas úteis para saber quando a associação foi criada/atualizada
      table.timestamp('created_at').defaultTo(this.now())
      table.timestamp('updated_at').defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
