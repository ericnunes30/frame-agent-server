import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'occupations_tasks' // Nome da tabela pivot

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      // Chave estrangeira para a tabela
      table
        .integer('occupation_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('occupations')
        .onDelete('CASCADE')

      // Chave estrangeira para a tabela
      table
        .integer('task_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('tasks')
        .onDelete('CASCADE')

      // Chave primária composta para garantir que a combinação seja única
      table.primary(['occupation_id', 'task_id'])

      // Timestamps opcionais, mas úteis para saber quando a associação foi criada/atualizada
      table.timestamp('created_at').defaultTo(this.now())
      table.timestamp('updated_at').defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
