import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'projects_users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      // Chave estrangeira para a tabela projects
      table.integer('project_id').unsigned().notNullable().references('id').inTable('projects').onDelete('CASCADE')

      // Chave estrangeira para a tabela users
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE')

      // Chave primária composta para garantir que a combinação seja única
      table.primary(['project_id', 'user_id'])

      // Timestamps opcionais, mas úteis para saber quando a associação foi criada/atualizada
      table.timestamp('created_at').defaultTo(this.now())
      table.timestamp('updated_at').defaultTo(this.now())

    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}