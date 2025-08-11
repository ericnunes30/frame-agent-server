import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Alterar o tipo da coluna 'order' de integer para float na tabela 'tasks'
    this.schema.alterTable('tasks', (table) => {
      table.float('order').nullable().alter()
    })
  }

  async down() {
    // Reverter a alteração, mudando de volta para integer
    this.schema.alterTable('tasks', (table) => {
      table.integer('order').nullable().alter()
    })
  }
}
