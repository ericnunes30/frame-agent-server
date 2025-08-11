import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tasks'

  async up() {
    // Remove a restrição de verificação existente usando SQL RAW
    // Esta abordagem é mais robusta para manipulação de CHECK constraints nomeadas
    await this.db.rawQuery(`
      ALTER TABLE ${this.tableName}
      DROP CONSTRAINT IF EXISTS tasks_status_check;
    `)

    // Adiciona a nova restrição de verificação com os valores atualizados
    const statusValues = [
      'pendente',
      'a_fazer',
      'em_andamento',
      'em_revisao',
      'aguardando_cliente',
      'concluido',
      'cancelado',
    ]
    await this.db.rawQuery(`
      ALTER TABLE ${this.tableName}
      ADD CONSTRAINT tasks_status_check
      CHECK (status IN ('${statusValues.join("','")}'));
    `)
  }

  async down() {
    // Remove a restrição adicionada no up()
    await this.db.rawQuery(`
      ALTER TABLE ${this.tableName}
      DROP CONSTRAINT IF EXISTS tasks_status_check;
    `)

    // Recria a restrição com os valores originais para rollback
    const originalStatusValues = ['pendente', 'a_fazer', 'em_andamento', 'em_revisao', 'concluido']
    await this.db.rawQuery(`
      ALTER TABLE ${this.tableName}
      ADD CONSTRAINT tasks_status_check
      CHECK (status IN ('${originalStatusValues.join("','")}'));
    `)
  }
}
