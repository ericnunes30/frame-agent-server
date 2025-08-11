import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'occupations_projects' // Nome da tabela pivot

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      // Chave estrangeira para a tabela 1
      table
        .integer('occupation_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('occupations')
        .onDelete('CASCADE')

      // Chave estrangeira para a tabela 2
      table
        .integer('project_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('projects')
        .onDelete('CASCADE')

      // Chave primária composta para garantir que a combinação tabela_1/tabela_2 seja única
      table.primary(['occupation_id', 'project_id'])

      // Timestamps opcionais, mas úteis para saber quando a associação foi criada/atualizada
      table.timestamp('created_at').defaultTo(this.now())
      table.timestamp('updated_at').defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
