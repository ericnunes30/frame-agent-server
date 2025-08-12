import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    // Remover a coluna occupation_id da tabela users
    this.schema.alterTable(this.tableName, async (table) => {
      // Adicionado 'async' aqui
      // Verificar se a coluna 'occupation_id' existe antes de tentar removê-la
      if (await this.schema.hasColumn(this.tableName, 'occupation_id')) {
        // Remover a chave estrangeira primeiro (se existir)
        if (this.db.dialect.name !== 'sqlite3') {
          try {
            table.dropForeign(['occupation_id'])
          } catch (e) {
            console.warn(
              'Não foi possível remover a chave estrangeira occupation_id da tabela users, ela pode não existir ou ter um nome diferente.'
            )
          }
        }

        // Remover a coluna
        table.dropColumn('occupation_id')
      } else {
        console.warn('A coluna occupation_id não existe na tabela users, pulando a remoção.')
      }
    })
  }

  async down() {
    // Adicionar a coluna occupation_id de volta à tabela users
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('occupation_id').unsigned().references('id').inTable('occupations').nullable()
    })
  }
}
